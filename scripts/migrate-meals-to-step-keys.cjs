#!/usr/bin/env node
const fs = require('fs');

function slugFromUrl(url) {
  return (url || '').replace(/\/$/, '').split('/').pop();
}

// Migrate current_meals.json
const data = JSON.parse(fs.readFileSync('src/data/current_meals.json', 'utf8'));
let mealsUpdated = 0;
for (const meal of data.current_meals) {
  const slug = slugFromUrl(meal.url);
  if (!slug) continue;
  meal.steps = (meal.steps || []).map((s, i) =>
    typeof s === 'string' && s.startsWith('recipe:') ? s : `recipe:${slug}:step:${i}`
  );
  const pt = meal.i18n && meal.i18n.pt;
  if (pt) { delete pt.steps; delete pt.name; delete pt.mealType; }
  mealsUpdated++;
}
fs.writeFileSync('src/data/current_meals.json', JSON.stringify(data, null, 2));
console.log('current_meals.json: updated', mealsUpdated, 'meals');

// Migrate meals.json
const mealsData = JSON.parse(fs.readFileSync('src/data/meals.json', 'utf8'));
let weekUpdated = 0;
for (const meals of Object.values(mealsData)) {
  for (const meal of meals) {
    const slug = slugFromUrl(meal.url);
    if (!slug) continue;
    meal.steps = (meal.steps || []).map((s, i) =>
      typeof s === 'string' && s.startsWith('recipe:') ? s : `recipe:${slug}:step:${i}`
    );
    const pt = meal.i18n && meal.i18n.pt;
    if (pt) { delete pt.steps; delete pt.name; delete pt.mealType; }
    weekUpdated++;
  }
}
fs.writeFileSync('src/data/meals.json', JSON.stringify(mealsData, null, 2));
console.log('meals.json: updated', weekUpdated, 'meals');
