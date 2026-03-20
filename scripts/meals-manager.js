#!/usr/bin/env node
/**
 * meals-manager.js — CLI utility for editing meals.json
 *
 * COMMANDS
 *   delete   Remove meals matching the given filters
 *   list     Preview what matches the given filters (no write)
 *
 * FILTERS (combinable)
 *   --date     <YYYY-MM-DD>            exact date
 *   --from     <YYYY-MM-DD>            start of date range (inclusive)
 *   --to       <YYYY-MM-DD>            end of date range (inclusive)
 *   --week     <YYYY-MM-DD>            any day in that ISO week (Mon–Sun)
 *   --label    <Morning|Lunch|Dinner>  meal type (repeatable)
 *
 * FLAGS
 *   --dry-run   show what would change without writing
 *   --yes       skip confirmation prompt
 *
 * EXAMPLES
 *   # Delete all meals on a single day
 *   node scripts/meals-manager.js delete --date 2026-03-18
 *
 *   # Delete all Lunch + Dinner entries this week
 *   node scripts/meals-manager.js delete --week 2026-03-20 --label Lunch --label Dinner
 *
 *   # Delete everything in a date range
 *   node scripts/meals-manager.js delete --from 2026-03-23 --to 2026-03-29
 *
 *   # Preview what a filter matches without changing anything
 *   node scripts/meals-manager.js list --label Morning
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root      = resolve(__dirname, '..')
const mealsPath = join(root, 'src', 'data', 'meals.json')

// ─── arg parsing ─────────────────────────────────────────────────────────────

const args   = process.argv.slice(2)
const cmd    = args[0]
const dryRun = args.includes('--dry-run')
const yes    = args.includes('--yes')

if (!['delete', 'list'].includes(cmd)) {
  console.error(`\nUsage: node scripts/meals-manager.js <delete|list> [filters] [--dry-run] [--yes]\n`)
  console.error(`Run with no extra flags to see the help header inside the file.\n`)
  process.exit(1)
}

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

// ─── helpers ─────────────────────────────────────────────────────────────────

function getMonday(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()           // 0 Sun … 6 Sat
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function dateInRange(iso, from, to) {
  return iso >= from && iso <= to
}

function matchesDateFilter(iso) {
  if (filterDate && iso !== filterDate) return false
  if (filterWeek) {
    const mon = getMonday(filterWeek)
    const sun = addDays(mon, 6)
    if (!dateInRange(iso, mon, sun)) return false
  }
  if (filterFrom || filterTo) {
    const from = filterFrom ?? '0000-00-00'
    const to   = filterTo   ?? '9999-99-99'
    if (!dateInRange(iso, from, to)) return false
  }
  return true
}

function matchesMeal(meal) {
  if (filterLabels.length > 0 && !filterLabels.includes(meal.label)) return false
  return true
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim().toLowerCase()) })
  })
}

// ─── load ─────────────────────────────────────────────────────────────────────

const meals = JSON.parse(readFileSync(mealsPath, 'utf-8'))

// ─── compute matches ─────────────────────────────────────────────────────────

const matches = []   // { date, meal }
const kept    = {}   // surviving structure after delete

for (const [date, entries] of Object.entries(meals)) {
  if (!matchesDateFilter(date)) {
    kept[date] = entries
    continue
  }

  const toRemove = []
  const toKeep   = []

  for (const meal of entries) {
    if (matchesMeal(meal)) {
      toRemove.push(meal)
      matches.push({ date, meal })
    } else {
      toKeep.push(meal)
    }
  }

  if (toKeep.length > 0) {
    kept[date] = toKeep
  }
  // if all meals removed from a date, the date key is dropped entirely
}

// ─── report ──────────────────────────────────────────────────────────────────

const labelStr  = filterLabels.length ? filterLabels.join(', ') : 'all labels'
const dateStr   = filterDate  ? `date=${filterDate}` :
                  filterWeek  ? `week of ${filterWeek}` :
                  (filterFrom || filterTo) ? `${filterFrom ?? '*'} → ${filterTo ?? '*'}` : 'all dates'

console.log(`\n📋  meals-manager  [${cmd}]`)
console.log(`    Date filter : ${dateStr}`)
console.log(`    Labels      : ${labelStr}`)
console.log(`    Matches     : ${matches.length} meal${matches.length !== 1 ? 's' : ''}`)

if (matches.length === 0) {
  console.log('\nNothing to do.\n')
  process.exit(0)
}

// Group matches by date for display
const byDate = {}
for (const { date, meal } of matches) {
  byDate[date] ??= []
  byDate[date].push(meal)
}

console.log('')
for (const [date, ms] of Object.entries(byDate)) {
  console.log(`  📅 ${date}`)
  for (const m of ms) {
    console.log(`     [${m.label.padEnd(7)}] ${m.title}`)
  }
}

// ─── list mode: done ─────────────────────────────────────────────────────────

if (cmd === 'list') {
  console.log('')
  process.exit(0)
}

// ─── delete mode ─────────────────────────────────────────────────────────────

if (dryRun) {
  console.log('\n⚠️  Dry-run — no changes written.\n')
  process.exit(0)
}

if (!yes) {
  const ans = await prompt(`\n❓ Delete these ${matches.length} meals? [y/N] `)
  if (ans !== 'y' && ans !== 'yes') {
    console.log('Aborted.\n')
    process.exit(0)
  }
}

writeFileSync(mealsPath, JSON.stringify(kept, null, 2) + '\n', 'utf-8')
console.log(`\n✅ Deleted ${matches.length} meal${matches.length !== 1 ? 's' : ''}. meals.json updated.\n`)
