#!/usr/bin/env node
/**
 * Normalizes ingredient data across pipeline recipes and current_meals.json.
 *
 * What this does:
 *  1. Re-derives every ingredientsParsed[i].id from the item name (fixes misaligned IDs)
 *  2. Replaces `unit` string with `unitId` (stable EN key for i18n lookup)
 *  3. Adds `en` display name to every ingredient-availability.json entry
 *  4. Removes `i18n.pt.ingredientsParsed` from pipeline recipes (fully derivable)
 *  5. In current_meals.json: strips `item`+`unit` from ingredientsParsed (computed
 *     at render time from ingredient-availability.json + units locale)
 *     and removes `i18n.pt.ingredientsParsed`
 */

const fs   = require('fs');
const path = require('path');

const CURRENT_MEALS_FILE = path.join(__dirname, '../src/data/current_meals.json');
const MEALS_FILE         = path.join(__dirname, '../src/data/meals.json');
const AVAILABILITY_FILE  = path.join(__dirname, '../src/data/ingredient-availability.json');
const NAMES_FILE         = path.join(__dirname, '../src/data/ingredient-names.json');
const RECIPES_DIR        = path.join(__dirname, '../pipeline/recipes');

// ── Slug function (must be identical everywhere) ────────────────────────────
function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')  // strip accents, %, &, etc.
    .replace(/-+/g, '-')         // collapse double dashes
    .replace(/^-|-$/g, '');      // trim leading/trailing dashes
}

// ── EN unit string → unitId (EN key used in units locale) ──────────────────
// PT units come from i18n.pt.ingredientsParsed but we keep EN as the canonical key
const PT_TO_EN_UNIT = {
  'c. sopa': 'tbsp',
  'c. chá':  'tsp',
  'pitada':  'pinch',
  'cabeça':  'head',
  'noz':     'knob',
  'talo':    'stalk',
  'lata':    'can',
  'ramo':    'sprig',
  'filete':  'fillet',
  'frasco':  'jar',
  'saqueta': 'pouch',
};
// EN units are already their own key; unknown units kept as-is
function toUnitId(unit) {
  if (!unit) return null;
  const u = unit.trim();
  return PT_TO_EN_UNIT[u] || u;
}

// ── Build slug→{en,pt} map from pipeline (while item fields still exist) ────
// We scan all pipeline ingredientsParsed (EN) and i18n.pt.ingredientsParsed (PT)
// to build: slugMap[slug] = { en: "Butter", pt: "Manteiga" }
const slugMap = {};   // id → { en, pt }

for (const f of fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'))) {
  const recipe = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, f), 'utf8'));
  const enList = recipe.ingredientsParsed || [];
  const ptList = recipe.i18n?.pt?.ingredientsParsed || recipe.translations?.pt?.ingredientsParsed || [];

  for (let i = 0; i < enList.length; i++) {
    const enItem = (enList[i].item || '').trim();
    const ptItem = ((ptList[i] && ptList[i].item) || '').trim();
    if (!enItem) continue;
    const id = toSlug(enItem);
    if (!slugMap[id]) slugMap[id] = { en: enItem, pt: ptItem || null };
    // Fill in pt if we get it later
    else if (!slugMap[id].pt && ptItem) slugMap[id].pt = ptItem;
  }
}
console.log(`Built slug map with ${Object.keys(slugMap).length} entries`);

// ── Update ingredient-names.json and ingredient-availability.json ────────────
const availability = JSON.parse(fs.readFileSync(AVAILABILITY_FILE, 'utf8'));
const names = fs.existsSync(NAMES_FILE)
  ? JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'))
  : {};

let avUpdated = 0;
for (const [id] of Object.entries(availability)) {
  const entry = slugMap[id];
  if (!names[id]) names[id] = { en: null, pt: null };
  if (entry && !names[id].en) { names[id].en = entry.en; avUpdated++; }
  if (entry && !names[id].pt && entry.pt) { names[id].pt = entry.pt; avUpdated++; }
}
// Add any new IDs from slugMap not yet in either file
for (const [id, entry] of Object.entries(slugMap)) {
  if (!names[id]) {
    names[id] = { en: entry.en, pt: entry.pt };
    avUpdated++;
  }
  if (!availability[id]) {
    availability[id] = { continente: null, auchan: null, pingodoce: null, lidl: null, aldi: null };
    avUpdated++;
  }
}
fs.writeFileSync(NAMES_FILE, JSON.stringify(names, null, 2));
fs.writeFileSync(AVAILABILITY_FILE, JSON.stringify(availability, null, 2));
console.log(`✅ ingredient-names.json + ingredient-availability.json: updated ${avUpdated} entries (${Object.keys(names).length} total)`);

// ── Normalize pipeline recipes ──────────────────────────────────────────────
let recipesUpdated = 0;
for (const f of fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'))) {
  const filePath = path.join(RECIPES_DIR, f);
  const recipe   = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const enList = recipe.ingredientsParsed || [];
  for (let i = 0; i < enList.length; i++) {
    const ing = enList[i];
    // Fix id: always re-derive from item name
    const id = toSlug(ing.item || '');
    ing.id = id;
    // Replace unit with unitId
    if ('unit' in ing) {
      ing.unitId = toUnitId(ing.unit);
      delete ing.unit;
    }
    // Reorder keys for readability: id, amount, unitId, item, note, optional
    const { id: _id, amount, unitId, item, ...rest } = ing;
    enList[i] = { id: _id, amount: amount ?? null, ...(unitId !== undefined ? { unitId } : {}), item, ...rest };
  }

  // Remove i18n.pt.ingredientsParsed (derivable from lookup)
  if (recipe.i18n?.pt?.ingredientsParsed) {
    delete recipe.i18n.pt.ingredientsParsed;
  }

  fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2));
  recipesUpdated++;
}
console.log(`✅ pipeline/recipes: normalized ${recipesUpdated} files (IDs fixed, unitId added, i18n.pt.ingredientsParsed removed)`);

// ── Normalize current_meals.json ────────────────────────────────────────────
const data  = JSON.parse(fs.readFileSync(CURRENT_MEALS_FILE, 'utf8'));
let mealsUpdated = 0;

for (const meal of data.current_meals) {
  const enList = meal.ingredientsParsed || [];
  for (let i = 0; i < enList.length; i++) {
    const ing = enList[i];
    const id = toSlug(ing.item || ing.id || '');
    const unitId = toUnitId(ing.unit ?? ing.unitId ?? null);
    // Keep only: id, amount, unitId, note, optional (drop item + unit — computed at render)
    const slim = { id, amount: ing.amount ?? null };
    if (unitId) slim.unitId = unitId;
    if (ing.note) slim.note = ing.note;
    if (ing.optional) slim.optional = ing.optional;
    enList[i] = slim;
  }

  // Remove i18n.pt.ingredientsParsed (fully derivable from id + lookup)
  if (meal.i18n?.pt?.ingredientsParsed) {
    delete meal.i18n.pt.ingredientsParsed;
  }

  mealsUpdated++;
}

fs.writeFileSync(CURRENT_MEALS_FILE, JSON.stringify(data, null, 2));
console.log(`✅ current_meals.json: slimmed ${mealsUpdated} meals (item/unit removed, ids fixed)`);

// ── meals.json (generated week — same normalization) ────────────────────────
if (fs.existsSync(MEALS_FILE)) {
  const mealsData = JSON.parse(fs.readFileSync(MEALS_FILE, 'utf8'));
  let weekUpdated = 0;
  for (const meals of Object.values(mealsData)) {
    for (const meal of meals) {
      const parsed = meal.ingredientsParsed || [];
      meal.ingredientsParsed = parsed.map(ing => {
        if (ing.id && !ing.item) return ing; // already migrated
        const id = toSlug(ing.item || ing.id || '');
        const unitId = toUnitId(ing.unit || ing.unitId || null);
        const slim = { id, amount: ing.amount != null ? ing.amount : null };
        if (unitId) slim.unitId = unitId;
        if (ing.note) slim.note = ing.note;
        if (ing.optional) slim.optional = ing.optional;
        return slim;
      });
      if (meal.i18n?.pt?.ingredientsParsed) delete meal.i18n.pt.ingredientsParsed;
      weekUpdated++;
    }
  }
  fs.writeFileSync(MEALS_FILE, JSON.stringify(mealsData, null, 2));
  console.log(`✅ meals.json: normalized ${weekUpdated} meals`);
}
