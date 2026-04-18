#!/usr/bin/env node
const fs = require('fs');

function toSlug(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/, '');
}
const PT_TO_EN_UNIT = { 'c. sopa':'tbsp','c. chá':'tsp','pitada':'pinch','cabeça':'head','noz':'knob','talo':'stalk','lata':'can','ramo':'sprig','filete':'fillet','frasco':'jar','saqueta':'pouch' };
function toUnitId(u) { if (!u) return null; return PT_TO_EN_UNIT[u.trim()] || u.trim(); }

const data = JSON.parse(fs.readFileSync('src/data/meals.json', 'utf8'));
let updated = 0;

for (const meals of Object.values(data)) {
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
    if (meal.i18n && meal.i18n.pt && meal.i18n.pt.ingredientsParsed) {
      delete meal.i18n.pt.ingredientsParsed;
    }
    updated++;
  }
}

fs.writeFileSync('src/data/meals.json', JSON.stringify(data, null, 2));
console.log('Updated', updated, 'meals in meals.json');
