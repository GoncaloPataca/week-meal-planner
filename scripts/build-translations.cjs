#!/usr/bin/env node
/**
 * Builds src/data/translations.json — a single flat file of all localizable
 * text in the app, keyed by stable namespaced IDs.
 *
 * Key schema:
 *   ingredient:<slug>                     — ingredient display name
 *   recipe:<slug>:name                    — recipe title
 *   recipe:<slug>:mealType                — meal type label
 *   recipe:<slug>:step:<index>            — recipe step (0-based)
 *   recipe:<slug>:ingredient:<index>      — plain ingredient string (fallback list)
 *
 * Each value is an object of lang → text, e.g. { en: "Butter", pt: "Manteiga" }
 * Adding a new language means adding a key to the relevant entries — nothing else changes.
 *
 * Sources consumed:
 *   src/data/ingredient-names.json        — ingredient translations
 *   src/data/current_meals.json           — recipe-level translations (name, steps, etc.)
 *
 * Output:
 *   src/data/translations.json
 */

const fs   = require('fs');
const path = require('path');

const CURRENT_MEALS_FILE    = path.join(__dirname, '../src/data/current_meals.json');
const PIPELINE_RECIPES_DIR  = path.join(__dirname, '../pipeline/recipes');
const TRANSLATIONS_OUT      = path.join(__dirname, '../src/data/translations.json');

// Seed translations from existing file so ingredient names (built separately) are preserved
const existingTranslations = fs.existsSync(TRANSLATIONS_OUT)
  ? JSON.parse(fs.readFileSync(TRANSLATIONS_OUT, 'utf8'))
  : {};

const translations = {};

function set(key, langs) {
  translations[key] = { ...(translations[key] || {}), ...langs };
}

// ── Ingredients — carry over from existing translations.json ─────────────────
let ingredientCount = 0;
for (const [key, val] of Object.entries(existingTranslations)) {
  if (key.startsWith('ingredient:')) {
    translations[key] = val;
    ingredientCount++;
  }
}
console.log(`Ingredients: ${ingredientCount} entries carried over`);

// ── Pipeline recipe EN steps lookup ──────────────────────────────────────────
// current_meals.json steps are now key references; read EN step text from pipeline/*.json
const pipelineStepsEn = {};
for (const file of fs.readdirSync(PIPELINE_RECIPES_DIR)) {
  if (!file.endsWith('.json')) continue;
  try {
    const rec = JSON.parse(fs.readFileSync(path.join(PIPELINE_RECIPES_DIR, file), 'utf8'));
    const slug = (rec.url || '').replace(/\/$/, '').split('/').pop();
    if (slug && Array.isArray(rec.steps)) pipelineStepsEn[slug] = rec.steps;
  } catch {}
}
console.log(`Pipeline recipes loaded: ${Object.keys(pipelineStepsEn).length}`);

// ── Recipes ──────────────────────────────────────────────────────────────────
const data  = JSON.parse(fs.readFileSync(CURRENT_MEALS_FILE, 'utf8'));
let recipeCount = 0;

for (const meal of data.current_meals) {
  const slug = (meal.url || '').replace(/\/$/, '').split('/').pop();
  if (!slug) continue;

  const enIngredients = meal.ingredients || [];

  // name
  const enName = meal.name || meal.title || null;
  if (enName) {
    set(`recipe:${slug}:name`, { en: enName });
  }

  // mealType
  if (meal.mealType) {
    set(`recipe:${slug}:mealType`, { en: meal.mealType });
  }

  // steps — EN from pipeline/recipes/<slug>.json; PT carried over from existing translations.json
  const enStepsFromPipeline = pipelineStepsEn[slug] || [];
  for (let i = 0; i < enStepsFromPipeline.length; i++) {
    set(`recipe:${slug}:step:${i}`, {
      en: enStepsFromPipeline[i],
      ...(existingTranslations[`recipe:${slug}:step:${i}`]?.pt
        ? { pt: existingTranslations[`recipe:${slug}:step:${i}`].pt }
        : {}),
    });
  }

  // plain ingredient strings (fallback for meals without ingredientsParsed)
  for (let i = 0; i < enIngredients.length; i++) {
    if (typeof enIngredients[i] === 'string') {
      set(`recipe:${slug}:ingredient:${i}`, {
        en: enIngredients[i],
        ...(existingTranslations[`recipe:${slug}:ingredient:${i}`]?.pt
          ? { pt: existingTranslations[`recipe:${slug}:ingredient:${i}`].pt }
          : {}),
      });
    }
  }

  recipeCount++;
}

console.log(`Recipes: ${recipeCount} processed`);

fs.writeFileSync(TRANSLATIONS_OUT, JSON.stringify(translations, null, 2));
console.log(`\n✅ Wrote src/data/translations.json (${Object.keys(translations).length} entries)`);
