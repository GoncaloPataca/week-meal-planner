#!/usr/bin/env node
/**
 * Migrates ingredientAvailability.ingredients from a keyed object:
 *   { "egg": { continente: true, ... }, ... }
 *
 * To an array with both language names embedded:
 *   [ { "en": "egg", "pt": "ovo", continente: true, ... }, ... ]
 *
 * Also syncs the same migration to pipeline/recipes/*.json
 */

const fs = require('fs');
const path = require('path');

const CURRENT_MEALS_FILE = path.join(__dirname, '../src/data/current_meals.json');
const RECIPES_DIR = path.join(__dirname, '../pipeline/recipes');

function migrateIngredients(ia, enParsed, ptParsed) {
  if (!ia || !ia.ingredients) return ia;

  // Already migrated (array format)
  if (Array.isArray(ia.ingredients)) return ia;

  const obj = ia.ingredients;

  // Build a lookup: lowercase EN item → PT item (by index alignment)
  const enToPt = {};
  for (let i = 0; i < enParsed.length; i++) {
    const enKey = (enParsed[i].item || '').toLowerCase().trim();
    const ptVal = ((ptParsed[i] && ptParsed[i].item) || '').toLowerCase().trim();
    if (enKey && ptVal) enToPt[enKey] = ptVal;
  }

  const arr = Object.entries(obj).map(([enKey, stores]) => ({
    en: enKey,
    pt: enToPt[enKey] || null,
    ...stores,
  }));

  return { ...ia, ingredients: arr };
}

// ── current_meals.json ──────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(CURRENT_MEALS_FILE, 'utf8'));
let updatedMeals = 0;

for (const meal of data.current_meals) {
  if (!meal.ingredientAvailability) continue;
  const enParsed = meal.ingredientsParsed || [];
  const ptParsed = meal.i18n?.pt?.ingredientsParsed || [];
  meal.ingredientAvailability = migrateIngredients(meal.ingredientAvailability, enParsed, ptParsed);
  updatedMeals++;
}

fs.writeFileSync(CURRENT_MEALS_FILE, JSON.stringify(data, null, 2));
console.log(`✅ current_meals.json: migrated ${updatedMeals} meals`);

// ── pipeline/recipes/*.json ─────────────────────────────────────────────────
let updatedRecipes = 0;
for (const f of fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'))) {
  const filePath = path.join(RECIPES_DIR, f);
  const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!recipe.ingredientAvailability) continue;

  const enParsed = recipe.ingredientsParsed || [];
  const ptParsed = recipe.translations?.pt?.ingredientsParsed || recipe.i18n?.pt?.ingredientsParsed || [];

  recipe.ingredientAvailability = migrateIngredients(recipe.ingredientAvailability, enParsed, ptParsed);
  fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2));
  updatedRecipes++;
}

console.log(`✅ pipeline/recipes: migrated ${updatedRecipes} recipe files`);
