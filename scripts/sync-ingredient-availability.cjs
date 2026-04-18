#!/usr/bin/env node
/**
 * Syncs ingredientAvailability from pipeline/recipes/*.json
 * into src/data/current_meals.json, matching by URL slug.
 */

const fs = require('fs');
const path = require('path');

const CURRENT_MEALS_FILE = path.join(__dirname, '../src/data/current_meals.json');
const RECIPES_DIR = path.join(__dirname, '../pipeline/recipes');

function slugFromUrl(url) {
  // e.g. "https://www.mob.co.uk/recipes/xo-sauce-omelette-with-prawns-spring-onions"
  // → "xo-sauce-omelette-with-prawns-spring-onions"
  return url.replace(/\/$/, '').split('/').pop();
}

// Build a map of slug → ingredientAvailability from pipeline recipes
const recipeMap = {};
for (const f of fs.readdirSync(RECIPES_DIR)) {
  if (!f.endsWith('.json')) continue;
  const recipe = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, f), 'utf8'));
  if (recipe.ingredientAvailability) {
    // Derive slug from filename (strip trailing -2, -3 variants to try both)
    const slug = f.replace(/\.json$/, '');
    recipeMap[slug] = recipe.ingredientAvailability;
  }
}

console.log(`Loaded ${Object.keys(recipeMap).length} pipeline recipes with availability data`);

// Load current_meals.json
const data = JSON.parse(fs.readFileSync(CURRENT_MEALS_FILE, 'utf8'));
const meals = data.current_meals;

let matched = 0;
let unmatched = [];

for (const meal of meals) {
  if (!meal.url) { unmatched.push(meal.name); continue; }
  const slug = slugFromUrl(meal.url);

  // Try exact slug, then with -2, -3 suffix variants
  const candidates = [slug, slug + '-2', slug + '-lunch', slug + '-meal-plan'];
  let found = null;
  for (const c of candidates) {
    if (recipeMap[c]) { found = recipeMap[c]; break; }
  }

  if (found) {
    meal.ingredientAvailability = found;
    matched++;
  } else {
    unmatched.push(`${meal.name} (slug: ${slug})`);
  }
}

// Write back
fs.writeFileSync(CURRENT_MEALS_FILE, JSON.stringify(data, null, 2));

console.log(`\n✅ Synced ${matched}/${meals.length} meals`);
if (unmatched.length) {
  console.log(`\n⚠️  Unmatched (${unmatched.length}):`);
  for (const u of unmatched) console.log(`  - ${u}`);
}
