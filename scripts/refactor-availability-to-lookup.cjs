#!/usr/bin/env node
/**
 * Refactors ingredient availability from per-meal embedded objects
 * to a single flat lookup file keyed by ingredient ID (slug).
 *
 * Before:
 *   meal.ingredientAvailability.ingredients = [{ en, pt, continente, ... }]
 *   meal.ingredientsParsed = [{ amount, unit, item }]
 *
 * After:
 *   meal.ingredientsParsed = [{ id, amount, unit, item }]
 *   meal.i18n.pt.ingredientsParsed = [{ id, amount, unit, item }]
 *   (ingredientAvailability removed from meals entirely)
 *
 *   src/data/ingredient-availability.json:
 *   { "xo-sauce": { pt: "molho xo", continente: false, auchan: false, ... }, ... }
 */

const fs = require('fs');
const path = require('path');

const CURRENT_MEALS_FILE = path.join(__dirname, '../src/data/current_meals.json');
const AVAILABILITY_OUT   = path.join(__dirname, '../src/data/ingredient-availability.json');
const NAMES_OUT          = path.join(__dirname, '../src/data/ingredient-names.json');
const RECIPES_DIR        = path.join(__dirname, '../pipeline/recipes');

function toSlug(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Build global availability lookup from current_meals (already has en+pt) ─
const data = JSON.parse(fs.readFileSync(CURRENT_MEALS_FILE, 'utf8'));
const namesLookup = {};        // id → { en, pt }
const availabilityLookup = {}; // id → { continente, auchan, ... }

for (const meal of data.current_meals) {
  const ia = meal.ingredientAvailability;
  if (!ia || !Array.isArray(ia.ingredients)) continue;

  for (const entry of ia.ingredients) {
    const id = toSlug(entry.en || '');
    if (!id) continue;
    if (!namesLookup[id]) {
      namesLookup[id] = { en: entry.en || null, pt: entry.pt || null };
    }
    if (!availabilityLookup[id]) {
      availabilityLookup[id] = {
        continente: entry.continente ?? null,
        auchan:     entry.auchan     ?? null,
        pingodoce:  entry.pingodoce  ?? null,
        lidl:       entry.lidl       ?? null,
        aldi:       entry.aldi       ?? null,
      };
    }
  }
}

// Write both files
fs.writeFileSync(NAMES_OUT, JSON.stringify(namesLookup, null, 2));
fs.writeFileSync(AVAILABILITY_OUT, JSON.stringify(availabilityLookup, null, 2));
console.log(`✅ Wrote ingredient-names.json + ingredient-availability.json (${Object.keys(namesLookup).length} entries)`);

// ── current_meals.json ──────────────────────────────────────────────────────
let mealsUpdated = 0;

for (const meal of data.current_meals) {
  const ia = meal.ingredientAvailability;
  const enParsed  = meal.ingredientsParsed || [];
  const ptParsed  = meal.i18n?.pt?.ingredientsParsed || [];

  // Build index → id map from the availability array (aligned by index)
  const idByIndex = [];
  if (ia && Array.isArray(ia.ingredients)) {
    for (let i = 0; i < ia.ingredients.length; i++) {
      idByIndex[i] = toSlug(ia.ingredients[i].en || '');
    }
  } else {
    // Fallback: derive slug from EN item name directly
    for (let i = 0; i < enParsed.length; i++) {
      idByIndex[i] = toSlug(enParsed[i].item || '');
    }
  }

  // Inject id into EN parsed
  for (let i = 0; i < enParsed.length; i++) {
    if (idByIndex[i]) enParsed[i] = { id: idByIndex[i], ...enParsed[i] };
  }

  // Inject same id into PT parsed (same index alignment, verified earlier)
  for (let i = 0; i < ptParsed.length; i++) {
    if (idByIndex[i]) ptParsed[i] = { id: idByIndex[i], ...ptParsed[i] };
  }

  // Remove the embedded availability block
  delete meal.ingredientAvailability;
  mealsUpdated++;
}

fs.writeFileSync(CURRENT_MEALS_FILE, JSON.stringify(data, null, 2));
console.log(`✅ current_meals.json: updated ${mealsUpdated} meals (ids injected, ingredientAvailability removed)`);

// ── pipeline/recipes/*.json ─────────────────────────────────────────────────
let recipesUpdated = 0;

for (const f of fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'))) {
  const filePath = path.join(RECIPES_DIR, f);
  const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const ia        = recipe.ingredientAvailability;
  const enParsed  = recipe.ingredientsParsed || [];
  const ptParsed  = recipe.i18n?.pt?.ingredientsParsed || recipe.translations?.pt?.ingredientsParsed || [];

  const idByIndex = [];
  if (ia && Array.isArray(ia.ingredients)) {
    for (let i = 0; i < ia.ingredients.length; i++) {
      idByIndex[i] = toSlug(ia.ingredients[i].en || '');
    }
  } else {
    for (let i = 0; i < enParsed.length; i++) {
      idByIndex[i] = toSlug(enParsed[i].item || '');
    }
  }

  for (let i = 0; i < enParsed.length; i++) {
    if (idByIndex[i] && !enParsed[i].id) enParsed[i] = { id: idByIndex[i], ...enParsed[i] };
  }
  for (let i = 0; i < ptParsed.length; i++) {
    if (idByIndex[i] && !ptParsed[i].id) ptParsed[i] = { id: idByIndex[i], ...ptParsed[i] };
  }

  delete recipe.ingredientAvailability;

  fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2));
  recipesUpdated++;
}

console.log(`✅ pipeline/recipes: updated ${recipesUpdated} recipe files`);
