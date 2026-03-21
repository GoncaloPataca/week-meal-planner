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
// We'll check the three pools individually so we can report counts per-file.
const pools = [
  join(root, 'src', 'data', 'allBreakfasts.json'),
  join(root, 'src', 'data', 'AllLunches.json'),
  join(root, 'src', 'data', 'AllDinners.json'),
]

// Candidate base dirs where images may live locally.
const candidateBases = [
  root,
  join(root, 'public'),
  join(root, 'docs'),
  join(root, 'docs', 'assets'),
  join(root, 'src'),
]

function existsLocalForImage(img) {
  if (!img) return { found: false, checked: [] }
  // Skip absolute/remote URLs
  if (/^https?:\/\//i.test(img)) return { found: false, checked: ['remote URL'] }

  const rel = img.replace(/^\//, '')
  const checked = []
  for (const base of candidateBases) {
    const p = join(base, rel)
    checked.push(p)
    if (existsSync(p)) return { found: true, path: p, checked }
  }

  // also try filename search in candidateBases (some paths omit folder)
  const name = rel.split('/').pop()
  if (name) {
    for (const base of candidateBases) {
      const p = join(base, 'images', name)
      checked.push(p)
      if (existsSync(p)) return { found: true, path: p, checked }
    }
  }

  return { found: false, checked }
}

let totalScanned = 0
const report = []

for (const poolPath of pools) {
  if (!existsSync(poolPath)) continue
  const items = JSON.parse(readFileSync(poolPath, 'utf-8'))
  let ok = 0, missing = 0, noField = 0
  const missingList = []

  for (const r of items) {
    totalScanned++
    const img = r.image
    if (!img) { noField++; continue }

    const res = existsLocalForImage(img)
    if (res.found) ok++
    else {
      missing++
      missingList.push({ id: r.id, name: r.name, image: img, checked: res.checked })
    }
  }

  report.push({ pool: poolPath, total: items.length, ok, missing, noField, missingList })
}

// Print summary
console.log('\n📋 Image check — multi-pool summary\n')
for (const r of report) {
  const file = r.pool.replace(root + '/', '')
  console.log(`File: ${file}`)
  console.log(`  → Scanned : ${r.total}`)
  console.log(`  ✅ Found   : ${r.ok}`)
  console.log(`  ❌ Missing : ${r.missing}`)
  console.log(`  ⚪ No field: ${r.noField}\n`)
}

// If any missing, print details and exit non-zero
const totalMissing = report.reduce((s, r) => s + r.missing, 0)
if (totalMissing > 0) {
  console.log('\nDetails of missing images:')
  for (const r of report) {
    if (r.missingList.length === 0) continue
    console.log(`\n--- ${r.pool.replace(root + '/', '')} ---`)
    for (const m of r.missingList) {
      console.log(`  - ${m.id}  ${m.name}`)
      console.log(`     image: ${m.image}`)
      console.log(`     tried: ${m.checked.slice(0,6).join(', ')}`)
    }
  }
  process.exit(1)
} else {
  console.log('\n🎉 All local meal images are present (or are remote URLs).\n')
}
