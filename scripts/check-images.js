#!/usr/bin/env node
/**
 * check-images.js
 * Reads meals.json and verifies that every meal's `image` field
 * points to a file that actually exists under public/.
 *
 * Usage: node scripts/check-images.js
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root      = resolve(__dirname, '..')
const mealsPath = join(root, 'src', 'data', 'meals.json')
const publicDir = join(root, 'public')

const meals = JSON.parse(readFileSync(mealsPath, 'utf-8'))

let ok      = 0
let missing = 0
let noField = 0

const missingList = []

for (const [date, entries] of Object.entries(meals)) {
  for (const meal of entries) {
    if (!meal.image) {
      noField++
      continue
    }

    // image paths are stored as absolute-style: /images/recipes/foo.jpg
    // they live under public/ on disk
    const diskPath = join(publicDir, meal.image)

    if (existsSync(diskPath)) {
      ok++
    } else {
      missing++
      missingList.push({ date, label: meal.label, title: meal.title, image: meal.image })
    }
  }
}

const total = ok + missing + noField

console.log(`\n📋 Image check — ${total} meals scanned\n`)
console.log(`  ✅  Found   : ${ok}`)
console.log(`  ❌  Missing : ${missing}`)
console.log(`  ⚪  No field: ${noField}`)

if (missingList.length > 0) {
  console.log('\n─────────────────────────────────────────────────')
  console.log('Missing images:')
  for (const m of missingList) {
    console.log(`\n  📅 ${m.date}  [${m.label}] ${m.title}`)
    console.log(`     → ${m.image}`)
  }
  console.log('')
  process.exit(1)
} else {
  console.log('\n🎉 All meal images are present.\n')
}
