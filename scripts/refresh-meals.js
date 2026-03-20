#!/usr/bin/env node
/**
 * refresh-meals.js — Re-randomise specific meals in meals.json
 *
 * Picks new recipes for every slot that matches the filters,
 * replacing only those entries (all other meals are untouched).
 *
 * FILTERS (combinable)
 *   --date    <YYYY-MM-DD>             exact date
 *   --from    <YYYY-MM-DD>             start of date range (inclusive)
 *   --to      <YYYY-MM-DD>             end of date range (inclusive)
 *   --week    <YYYY-MM-DD>             any day in that ISO week (Mon–Sun)
 *   --label   <Morning|Lunch|Dinner>   meal type (repeatable)
 *
 * FLAGS
 *   --seed=N    deterministic random (same seed → same picks)
 *   --dry-run   show what would change without writing
 *   --yes       skip confirmation prompt
 *
 * EXAMPLES
 *   # Refresh all lunches this week
 *   node scripts/refresh-meals.js --week 2026-03-20 --label Lunch
 *
 *   # Refresh lunches and dinners in a range
 *   node scripts/refresh-meals.js --from 2026-03-23 --to 2026-03-29 --label Lunch --label Dinner
 *
 *   # Refresh every Morning across all stored dates
 *   node scripts/refresh-meals.js --label Morning
 *
 *   # Refresh everything on one day
 *   node scripts/refresh-meals.js --date 2026-03-20
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root      = resolve(__dirname, '..')
const dataDir   = join(root, 'src', 'data')
const mealsPath = join(dataDir, 'meals.json')

// ─── arg parsing ─────────────────────────────────────────────────────────────

const args   = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const yes    = args.includes('--yes')
const seedArg = args.find(a => a.startsWith('--seed='))
const seed   = seedArg ? parseInt(seedArg.split('=')[1]) : null

function flag(name) {
  const i = args.indexOf(name)
  return i !== -1 ? args[i + 1] : null
}
function flags(name) {
  const out = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) out.push(args[i + 1])
  }
  return out
}

const filterDate   = flag('--date')
const filterFrom   = flag('--from')
const filterTo     = flag('--to')
const filterWeek   = flag('--week')
const filterLabels = flags('--label')

if (!filterDate && !filterFrom && !filterTo && !filterWeek && filterLabels.length === 0) {
  console.error('\nError: at least one filter is required.\n')
  process.exit(1)
}

// ─── seeded RNG ───────────────────────────────────────────────────────────────

class SeededRandom {
  constructor(s) { this.s = s }
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

const rng      = seed !== null ? new SeededRandom(seed) : null
const shuffle  = arr => rng ? rng.shuffle(arr) : [...arr].sort(() => Math.random() - 0.5)

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadJson(filename) {
  const p = join(dataDir, filename)
  if (!existsSync(p)) throw new Error(`File not found: ${p}`)
  return JSON.parse(readFileSync(p, 'utf-8'))
}

function getMonday(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function matchesDateFilter(iso) {
  if (filterDate && iso !== filterDate) return false
  if (filterWeek) {
    const mon = getMonday(filterWeek)
    if (iso < mon || iso > addDays(mon, 6)) return false
  }
  if (filterFrom && iso < filterFrom) return false
  if (filterTo   && iso > filterTo)   return false
  return true
}
function matchesLabelFilter(label) {
  return filterLabels.length === 0 || filterLabels.includes(label)
}

// ─── recipe pools ────────────────────────────────────────────────────────────

const POOL = {
  Morning: shuffle(loadJson('allBreakfasts.json')),
  Lunch:   shuffle(loadJson('AllLunches.json')),
  Dinner:  shuffle(loadJson('AllDinners.json')),
}
const POOL_IDX = { Morning: 0, Lunch: 0, Dinner: 0 }

const TYPE_CFG = {
  Morning: { idPrefix: 'breakfast', time: '08:00' },
  Lunch:   { idPrefix: 'lunch',     time: '13:00' },
  Dinner:  { idPrefix: 'dinner',    time: '20:00' },
}

function pickRecipe(label) {
  const pool = POOL[label]
  if (!pool || pool.length === 0) throw new Error(`No recipes for label: ${label}`)
  const idx = POOL_IDX[label] % pool.length
  POOL_IDX[label]++
  const recipe = pool[idx]
  const cfg = TYPE_CFG[label]
  const entry = {
    id: `${cfg.idPrefix}-${recipe.id}`,
    label,
    time: cfg.time,
    title: recipe.name,
    servings: recipe.servings ?? null,
    prep: recipe.prepTime ?? null,
    cook: recipe.cookTime ?? null,
    tags: recipe.tags ?? [],
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    url: recipe.url ?? null,
    image: recipe.image ?? null,
  }
  if (recipe.nutrition) entry.nutrition = recipe.nutrition
  return entry
}

function prompt(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, ans => { rl.close(); resolve(ans.trim().toLowerCase()) })
  })
}

// ─── load & refresh ───────────────────────────────────────────────────────────

const meals   = JSON.parse(readFileSync(mealsPath, 'utf-8'))
const updated = JSON.parse(JSON.stringify(meals))   // deep clone
const changes = []   // { date, old: meal, fresh: meal }

for (const [date, entries] of Object.entries(meals)) {
  if (!matchesDateFilter(date)) continue
  updated[date] = entries.map(meal => {
    if (!matchesLabelFilter(meal.label)) return meal
    const fresh = pickRecipe(meal.label)
    changes.push({ date, old: meal, fresh })
    return fresh
  })
}

// ─── report ──────────────────────────────────────────────────────────────────

const labelStr = filterLabels.length ? filterLabels.join(', ') : 'all labels'
const dateStr  = filterDate  ? `date=${filterDate}` :
                 filterWeek  ? `week of ${filterWeek}` :
                 (filterFrom || filterTo) ? `${filterFrom ?? '*'} → ${filterTo ?? '*'}` : 'all dates'

console.log(`\n🔄  refresh-meals`)
console.log(`    Date filter : ${dateStr}`)
console.log(`    Labels      : ${labelStr}`)
if (seed !== null) console.log(`    Seed        : ${seed}`)
console.log(`    Matches     : ${changes.length} meal${changes.length !== 1 ? 's' : ''}`)

if (changes.length === 0) {
  console.log('\nNothing to refresh.\n')
  process.exit(0)
}

console.log('')
const byDate = {}
for (const c of changes) { byDate[c.date] ??= []; byDate[c.date].push(c) }
for (const [date, cs] of Object.entries(byDate)) {
  console.log(`  📅 ${date}`)
  for (const { old: o, fresh: f } of cs) {
    console.log(`     [${o.label.padEnd(7)}] ${o.title}`)
    console.log(`           → ${f.title}`)
  }
}

if (dryRun) {
  console.log('\n⚠️  Dry-run — no changes written.\n')
  process.exit(0)
}

if (!yes) {
  const ans = await prompt(`\n❓ Refresh these ${changes.length} meals? [y/N] `)
  if (ans !== 'y' && ans !== 'yes') {
    console.log('Aborted.\n')
    process.exit(0)
  }
}

writeFileSync(mealsPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
console.log(`\n✅ Refreshed ${changes.length} meal${changes.length !== 1 ? 's' : ''}. meals.json updated.\n`)
