#!/usr/bin/env node
/**
 * download-breakfast-images.js
 * Reads allBreakfasts.json, checks which images are missing from
 * public/images/recipes/, and downloads them from the recipe website.
 *
 * Usage: node scripts/download-breakfast-images.js [--dry-run]
 */

import { readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs'
import { resolve, join, basename } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname  = fileURLToPath(new URL('.', import.meta.url))
const root       = resolve(__dirname, '..')
const dataPath   = join(root, 'src', 'data', 'allBreakfasts.json')
const destDir    = join(root, 'public', 'images', 'recipes')
const baseUrl    = 'https://pequeno-almoco.chefantonioduarte.com/recipes'
const dryRun     = process.argv.includes('--dry-run')

mkdirSync(destDir, { recursive: true })

const recipes = JSON.parse(readFileSync(dataPath, 'utf-8'))

// Deduplicate — some recipes share the same image path
const seen     = new Set()
const toFetch  = []
const alreadyOk = []

for (const recipe of recipes) {
  if (!recipe.image) continue
  const filename = basename(recipe.image)
  if (seen.has(filename)) continue
  seen.add(filename)

  const diskPath = join(destDir, filename)
  if (existsSync(diskPath)) {
    alreadyOk.push(filename)
  } else {
    toFetch.push({ filename, diskPath, url: `${baseUrl}/${filename}` })
  }
}

console.log(`\n🖼  Breakfast image sync`)
console.log(`   Already present : ${alreadyOk.length}`)
console.log(`   To download     : ${toFetch.length}${dryRun ? '  (dry-run — skipping)' : ''}`)

if (toFetch.length === 0 || dryRun) {
  if (toFetch.length === 0) console.log('\n✅ All breakfast images are present.\n')
  else {
    console.log('\nWould download:')
    toFetch.forEach(f => console.log(`  ${f.url}`))
    console.log()
  }
  process.exit(0)
}

console.log('')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', (err) => {
      file.close()
      reject(err)
    })
  })
}

let downloaded = 0
let failed     = 0
const failures = []

for (const { filename, diskPath, url } of toFetch) {
  process.stdout.write(`  ⬇  ${filename} … `)
  try {
    await download(url, diskPath)
    process.stdout.write('✅\n')
    downloaded++
  } catch (err) {
    process.stdout.write(`❌  ${err.message}\n`)
    failed++
    failures.push({ filename, url, error: err.message })
  }
}

console.log(`\n─────────────────────────────────────────`)
console.log(`  Downloaded : ${downloaded}`)
console.log(`  Failed     : ${failed}`)

if (failures.length > 0) {
  console.log('\nFailed downloads:')
  failures.forEach(f => console.log(`  ${f.url}  →  ${f.error}`))
  console.log()
  process.exit(1)
} else {
  console.log('\n🎉 Done.\n')
}
