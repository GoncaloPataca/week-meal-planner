#!/usr/bin/env node
/**
 * meals.js — Unified meal planner CLI
 *
 * COMMANDS
 *   delete    Remove meals matching the given filters
 *   generate  Pick new random meals for slots matching the filters
 *
 * DATE FILTERS  (one required; --from/--to can be used alone or together)
 *   --week  <YYYY-MM-DD>        the Mon–Sun week that contains this date
 *   --from  <YYYY-MM-DD>        range start (inclusive)
 *   --to    <YYYY-MM-DD>        range end   (inclusive)
 *
 * TYPE FILTER  (optional — omit to target all meal types)
 *   --type  <Morning|Lunch|Dinner>   comma-separated, e.g. --type Lunch,Dinner
 *
 * OPTIONS
 *   --replace    [generate only] overwrite slots that already have a meal
 *   --seed=N     [generate only] deterministic random picks
 *   --dry-run    preview changes without writing
 *   --yes        skip the confirmation prompt
 *
 * EXAMPLES
 *   # Delete all meals this week
 *   node scripts/meals.js delete --week 2026-03-20
 *
 *   # Delete only lunches and dinners this week
 *   node scripts/meals.js delete --week 2026-03-20 --type Lunch,Dinner
 *
 *   # Delete all meals in a range
 *   node scripts/meals.js delete --from 2026-03-23 --to 2026-03-29
 *
 *   # Generate (fill empty slots) for next week
 *   node scripts/meals.js generate --week 2026-03-23
 *
 *   # Re-generate only lunches in a range (replace existing)
 *   node scripts/meals.js generate --from 2026-03-23 --to 2026-03-29 --type Lunch --replace
 *
 *   # Preview without writing
 *   node scripts/meals.js generate --week 2026-03-20 --type Dinner --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root      = resolve(__dirname, '..')
const dataDir   = join(root, 'src', 'data')
const mealsPath = join(dataDir, 'meals.json')

// ─── arg parsing ──────────────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const cmd     = args[0]
const dryRun  = args.includes('--dry-run')
const yes     = args.includes('--yes')
const replace = args.includes('--replace')
const seedArg = args.find(a => a.startsWith('--seed='))
const seed    = seedArg ? parseInt(seedArg.split('=')[1]) : null

if (!['delete', 'generate'].includes(cmd)) {
  console.error(`
Usage: node scripts/meals.js <delete|generate> [filters] [options]

DATE FILTERS  (one required)
  --week  <YYYY-MM-DD>           Mon–Sun week containing this date
  --from  <YYYY-MM-DD>           range start (inclusive)
  --to    <YYYY-MM-DD>           range end   (inclusive)

TYPE FILTER
  --type  <Morning|Lunch|Dinner>  comma-separated (default: all types)

OPTIONS
  --replace   [generate] overwrite existing meals (default: skip)
  --seed=N    [generate] deterministic picks
  --dry-run   preview without writing
  --yes       skip confirmation
`)
  process.exit(1)
}

function flag(name) {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] ?? null : null
}

const filterWeek = flag('--week')
const filterFrom = flag('--from')
const filterTo   = flag('--to')
const typeArg    = flag('--type')
const filterTypes = typeArg
  ? typeArg.split(',').map(s => s.trim()).filter(Boolean)
  : []

const ALL_TYPES = ['Morning', 'Lunch', 'Dinner']
const targetTypes = filterTypes.length > 0 ? filterTypes : ALL_TYPES

if (!filterWeek && !filterFrom && !filterTo) {
  console.error('\nError: at least one date filter is required (--week, --from, --to).\n')
  process.exit(1)
}

// ─── date helpers ────────────────────────────────────────────────────────────

function isoMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function buildDateSet() {
  // Returns an array of ISO dates that fall within the requested range
  let from, to
  if (filterWeek) {
    from = isoMonday(filterWeek)
    to   = addDays(from, 6)
  } else {
    from = filterFrom ?? '0000-00-00'
    to   = filterTo   ?? '9999-99-99'
  }
  // For generate we need to enumerate dates; use from/to with existing keys + week range
  return { from, to }
}

function inRange(iso, from, to) {
  return iso >= from && iso <= to
}

// ─── recipe pools + seeded RNG ───────────────────────────────────────────────

class SeededRandom {
  constructor(s) { this.s = s ?? Math.floor(Math.random() * 1e9) }
  next() { this.s = (this.s * 9301 + 49297) % 233280; return this.s / 233280 }
  shuffle(arr) {
    const r = [...arr]
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]]
    }
    return r
  }
}

function loadJson(filename) {
  const p = join(dataDir, filename)
  if (!existsSync(p)) throw new Error(`File not found: ${p}`)
  return JSON.parse(readFileSync(p, 'utf-8'))
}

const rng = new SeededRandom(seed)

const POOLS = {
  Morning: rng.shuffle(loadJson('allBreakfasts.json')),
  Lunch:   rng.shuffle(loadJson('AllLunches.json')),
  Dinner:  rng.shuffle(loadJson('AllDinners.json')),
}
const poolCursors = { Morning: 0, Lunch: 0, Dinner: 0 }

const TYPE_CFG = {
  Morning: { idPrefix: 'breakfast', time: '08:00' },
  Lunch:   { idPrefix: 'lunch',     time: '13:00' },
  Dinner:  { idPrefix: 'dinner',    time: '20:00' },
}

function pickMeal(type) {
  const pool = POOLS[type]
  const idx  = poolCursors[type] % pool.length
  poolCursors[type]++
  const recipe = pool[idx]
  const cfg    = TYPE_CFG[type]
  const entry  = {
    id:          `${cfg.idPrefix}-${recipe.id}`,
    label:       type,
    time:        cfg.time,
    title:       recipe.name,
    servings:    recipe.servings   ?? null,
    prep:        recipe.prepTime   ?? null,
    cook:        recipe.cookTime   ?? null,
    tags:        recipe.tags       ?? [],
    ingredients: recipe.ingredients ?? [],
    steps:       recipe.steps      ?? [],
    url:         recipe.url        ?? null,
    image:       recipe.image      ?? null,
  }
  if (recipe.nutrition) entry.nutrition = recipe.nutrition
  return entry
}

// ─── prompt ──────────────────────────────────────────────────────────────────

function prompt(q) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, ans => { rl.close(); res(ans.trim().toLowerCase()) })
  })
}

// ─── load meals ──────────────────────────────────────────────────────────────

const meals = JSON.parse(readFileSync(mealsPath, 'utf-8'))

// ─── summary strings ─────────────────────────────────────────────────────────

const { from, to } = buildDateSet()
const dateLabel = filterWeek
  ? `week of ${isoMonday(filterWeek)} → ${addDays(isoMonday(filterWeek), 6)}`
  : `${from} → ${to}`
const typeLabel = targetTypes.join(', ')

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════

if (cmd === 'delete') {
  const removed = []
  const updated = {}

  for (const [date, entries] of Object.entries(meals)) {
    if (!inRange(date, from, to)) { updated[date] = entries; continue }

    const keep   = []
    const remove = []
    for (const meal of entries) {
      if (targetTypes.includes(meal.label)) remove.push(meal)
      else keep.push(meal)
    }

    removed.push(...remove.map(m => ({ date, meal: m })))
    if (keep.length > 0) updated[date] = keep
    // dates with no remaining meals are dropped
  }

  console.log(`\n🗑  meals delete`)
  console.log(`   Dates  : ${dateLabel}`)
  console.log(`   Types  : ${typeLabel}`)
  console.log(`   Matches: ${removed.length} meal${removed.length !== 1 ? 's' : ''}`)

  if (removed.length === 0) { console.log('\nNothing to delete.\n'); process.exit(0) }

  console.log('')
  const byDate = {}
  for (const { date, meal } of removed) { byDate[date] ??= []; byDate[date].push(meal) }
  for (const [d, ms] of Object.entries(byDate)) {
    console.log(`  📅 ${d}`)
    for (const m of ms) console.log(`     [${m.label.padEnd(7)}] ${m.title}`)
  }

  if (dryRun) { console.log('\n⚠️  Dry-run — nothing written.\n'); process.exit(0) }

  if (!yes) {
    const ans = await prompt(`\n❓ Delete ${removed.length} meals? [y/N] `)
    if (ans !== 'y' && ans !== 'yes') { console.log('Aborted.\n'); process.exit(0) }
  }

  writeFileSync(mealsPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
  console.log(`\n✅ Deleted ${removed.length} meals. meals.json updated.\n`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════════════════════

if (cmd === 'generate') {
  // Build the full list of (date, type) slots we want to fill
  const datesToFill = []

  // Enumerate every date in range
  let cursor = from
  while (cursor <= to) {
    datesToFill.push(cursor)
    cursor = addDays(cursor, 1)
  }

  const updated  = JSON.parse(JSON.stringify(meals))
  const added    = []   // { date, type, meal }
  const skipped  = []   // { date, type, existing }

  for (const date of datesToFill) {
    updated[date] ??= []
    const existingByType = Object.fromEntries(
      updated[date].map(m => [m.label, m])
    )

    for (const type of targetTypes) {
      if (existingByType[type] && !replace) {
        skipped.push({ date, type, existing: existingByType[type] })
        continue
      }
      const meal = pickMeal(type)
      added.push({ date, type, meal, replaced: !!existingByType[type] })
      // Insert or overwrite
      const idx = updated[date].findIndex(m => m.label === type)
      if (idx !== -1) updated[date][idx] = meal
      else            updated[date].push(meal)
    }

    // Keep canonical order: Morning → Lunch → Dinner
    updated[date].sort((a, b) =>
      ALL_TYPES.indexOf(a.label) - ALL_TYPES.indexOf(b.label)
    )
  }

  // Sort the top-level keys by date
  const sorted = Object.keys(updated).sort().reduce((acc, k) => {
    if (updated[k].length > 0) acc[k] = updated[k]
    return acc
  }, {})

  console.log(`\n✨  meals generate`)
  console.log(`   Dates    : ${dateLabel}`)
  console.log(`   Types    : ${typeLabel}`)
  if (seed !== null) console.log(`   Seed     : ${seed}`)
  console.log(`   Added    : ${added.filter(a => !a.replaced).length}`)
  console.log(`   Replaced : ${added.filter(a =>  a.replaced).length}  ${!replace && skipped.length ? '' : ''}`)
  if (!replace && skipped.length > 0)
    console.log(`   Skipped  : ${skipped.length}  (already filled — use --replace to overwrite)`)

  if (added.length === 0 && skipped.length > 0) {
    console.log('\nAll requested slots already have meals. Use --replace to overwrite.\n')
    process.exit(0)
  }

  console.log('')
  const byDate = {}
  for (const item of [...added, ...skipped]) { byDate[item.date] ??= []; byDate[item.date].push(item) }

  for (const [d, items] of Object.entries(byDate)) {
    console.log(`  📅 ${d}`)
    for (const item of items) {
      if ('meal' in item) {
        const tag = item.replaced ? '↺ replaced' : '+ new'
        console.log(`     [${item.type.padEnd(7)}] ${item.meal.title}  (${tag})`)
      } else {
        console.log(`     [${item.type.padEnd(7)}] ${item.existing.title}  (skipped)`)
      }
    }
  }

  if (dryRun) { console.log('\n⚠️  Dry-run — nothing written.\n'); process.exit(0) }

  if (!yes) {
    const total = added.length
    const ans = await prompt(`\n❓ Write ${total} meal${total !== 1 ? 's' : ''} to meals.json? [y/N] `)
    if (ans !== 'y' && ans !== 'yes') { console.log('Aborted.\n'); process.exit(0) }
  }

  writeFileSync(mealsPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')
  console.log(`\n✅ meals.json updated.\n`)
}
