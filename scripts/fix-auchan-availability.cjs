#!/usr/bin/env node
/**
 * Second pass: fixes Auchan availability data using food URL detection
 * instead of English keyword matching (which fails on Portuguese product titles).
 *
 * Strategy: search Auchan and check if ANY result URL contains
 * /alimentacao/, /produtos-frescos/, /sabores-do-mundo/, /biologicos-e-alternativas/
 * These are Auchan's food category paths — if found, the ingredient is available.
 */

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '../pipeline/recipes');
const CACHE_FILE = path.join(__dirname, '../pipeline/ingredient-availability-cache.json');
const DELAY_MS = 500;

const FOOD_PATHS = [
  '/alimentacao/', '/produtos-frescos/', '/sabores-do-mundo/',
  '/biologicos-e-alternativas/', '/congelados/', '/bebidas/',
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchAuchanFixed(ingredient) {
  const url = `https://www.auchan.pt/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Search-Show?q=${encodeURIComponent(ingredient)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    const text = await res.text();

    if (/0 resultados/.test(text) || /Não encontramos/.test(text)) return false;

    const countMatch = text.match(/(\d+) resultado[s]? para/);
    const count = countMatch ? parseInt(countMatch[1]) : 0;
    if (count === 0) return false;

    // Check if any food-category product URL appears in results
    const hasFoodResult = FOOD_PATHS.some(p => text.includes(p));
    if (hasFoodResult) return true;

    // Non-food results only (e.g. books, home goods) → not found as food
    return false;
  } catch (e) {
    console.error(`  Auchan error for "${ingredient}":`, e.message);
    return null;
  }
}

function inferDiscounter(auchan, continente) {
  if (auchan === true && continente === true) return true;
  if (auchan === false && continente === false) return false;
  return null;
}

function inferPingoDoce(auchan, continente) {
  if (continente === true) return true;
  if (auchan === true) return true;
  if (auchan === false && continente === false) return false;
  return null;
}

async function main() {
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  console.log(`Loaded cache with ${Object.keys(cache).length} entries`);

  // Find all entries where auchan=false (potential false negatives from language mismatch)
  const toRecheck = Object.entries(cache).filter(([, v]) => v.auchan === false);
  console.log(`Re-checking ${toRecheck.length} ingredients for Auchan...\n`);

  let count = 0;
  for (const [ingredient, existing] of toRecheck) {
    count++;
    process.stdout.write(`[${count}/${toRecheck.length}] "${ingredient}"... `);
    await sleep(DELAY_MS);

    const auchan = await searchAuchanFixed(ingredient);
    if (auchan !== existing.auchan) {
      process.stdout.write(`auchan: false→${auchan}`);
      cache[ingredient] = {
        continente: existing.continente,
        auchan,
        pingodoce: inferPingoDoce(auchan, existing.continente),
        lidl: inferDiscounter(auchan, existing.continente),
        aldi: inferDiscounter(auchan, existing.continente),
      };
    } else {
      process.stdout.write(`unchanged`);
    }
    console.log();

    if (count % 20 === 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log('  [cache saved]\n');
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log('\nCache updated. Re-writing all recipe files...\n');

  // Re-write all recipe files with corrected data
  const STAPLES_ALL_TRUE = {
    continente: true, auchan: true, pingodoce: true, lidl: true, aldi: true
  };

  const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json')).sort();
  const TODAY = new Date().toISOString().split('T')[0];
  let updated = 0;

  for (const f of files) {
    const filePath = path.join(RECIPES_DIR, f);
    const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!recipe.ingredientAvailability) continue;

    const ingredients = recipe.ingredientAvailability.ingredients || {};
    let changed = false;

    for (const [key, val] of Object.entries(ingredients)) {
      // Re-apply cache values (in case they were updated)
      if (cache[key]) {
        const newVal = cache[key];
        if (JSON.stringify(newVal) !== JSON.stringify(val)) {
          ingredients[key] = newVal;
          changed = true;
        }
      }
    }

    if (changed) {
      recipe.ingredientAvailability = {
        searchedAt: TODAY,
        stores: ['continente', 'auchan', 'pingodoce', 'lidl', 'aldi'],
        ingredients,
      };
      fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2));
      updated++;
    }
  }

  console.log(`Done. Re-wrote ${updated} recipe files.`);
}

main().catch(console.error);
