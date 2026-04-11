const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(__dirname, '..', 'src', 'data')
const OUT = path.resolve(__dirname, '..', 'public', 'recipes-index.json')

function readJson(name) {
  try {
    const p = path.join(DATA_DIR, name)
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    return []
  }
}

// Files to include (order matters: allRecipes first if present)
const FILES = [
  'allRecipes.json',
  'allBreakfasts.json',
  'AllLunches.json',
  'AllDinners.json'
]

let combined = []
for (const f of FILES) {
  const arr = readJson(f)
  if (Array.isArray(arr)) combined = combined.concat(arr)
}

// Also scan individual recipe JSON files under src/data/recipes/mob/**/*.json
const MOB_DIR = path.join(DATA_DIR, 'recipes', 'mob')
if (fs.existsSync(MOB_DIR)) {
  const scanDir = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(full)
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const r = JSON.parse(fs.readFileSync(full, 'utf8'))
          if (r && typeof r === 'object' && !Array.isArray(r)) combined.push(r)
        } catch {}
      }
    }
  }
  scanDir(MOB_DIR)
}

// Deduplicate by id if present, otherwise by url, otherwise by name
const map = new Map()
for (const r of combined) {
  let key
  if (!r) {
    key = 'name:'
  } else if (r.id != null) {
    key = `id:${r.id}`
  } else if (r.url) {
    key = `url:${r.url}`
  } else {
    key = `name:${(r.name||'').toLowerCase()}`
  }
  if (!map.has(key)) map.set(key, r)
}

const deduped = Array.from(map.values())

const index = deduped.map(r => ({
  id: r.id != null ? r.id : null,
  name: r.name || 'Untitled',
  tags: r.tags || [],
  cookTime: r.cookTime || null,
  servings: r.servings || null,
  url: r.url || null,
  image: r.image || null,
  calories: r.calories != null ? r.calories : (r.nutrition && r.nutrition.calories != null ? r.nutrition.calories : null)
}))

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(index, null, 2), 'utf8')
console.log('Wrote', OUT, 'with', index.length, 'items')
process.exit(0)
