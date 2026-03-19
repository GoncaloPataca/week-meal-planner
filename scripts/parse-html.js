/**
 * Parses test.html and regenerates src/data/allBreakfasts.json from scratch.
 * Usage: node scripts/parse-html.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function cleanText(str) {
  return str
    .replace(/<[^>]+>/g, '')   // strip tags
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim();
}

function parseRecipe(block, nextBlock) {
  // ── ID ──────────────────────────────────────────────────────────────────
  const id = parseInt(block.match(/id="receita-(\d+)"/)[1]);

  // ── Image ────────────────────────────────────────────────────────────────
  const imgMatch = block.match(/src="\/recipes\/([^"]+)"/);
  const image = imgMatch ? `/images/recipes/${imgMatch[1]}` : '';

  // ── Name ─────────────────────────────────────────────────────────────────
  const nameMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const name = nameMatch ? cleanText(nameMatch[1]) : '';

  // ── Tags ─────────────────────────────────────────────────────────────────
  // Tags appear before the h2, inside rounded-full bg-primary/10 spans
  const tagSection = block.slice(0, block.indexOf('<h2'));
  const tags = [...tagSection.matchAll(/bg-primary\/10[^>]*>([\s\S]*?)<\/span>/g)]
    .map(m => cleanText(m[1]))
    .filter(Boolean);

  // ── Prep / Cook / Servings ───────────────────────────────────────────────
  // Three "font-semibold text-sm" paragraphs: prep, cook, servings
  const statValues = [...block.matchAll(/<p class="font-semibold text-sm">([\s\S]*?)<\/p>/g)]
    .map(m => cleanText(m[1]));
  const prepTime  = statValues[0] || '';
  const cookTime  = statValues[1] || '';
  const servings  = parseInt(statValues[2]) || 1;

  // ── Calories ─────────────────────────────────────────────────────────────
  // First "text-2xl font-bold" paragraph (highlighted with text-accent)
  const calMatch = block.match(/<p class="text-2xl font-bold[^"]*text-accent">(\d+)<\/p>/);
  const calories = calMatch ? parseInt(calMatch[1]) : 0;

  // ── Ingredients ──────────────────────────────────────────────────────────
  // Structure: <span class="font-medium">AMOUNT</span> <span class="text-muted-foreground">— NAME</span>
  const ingredients = [];
  const ingRegex = /<span\s[^>]*class="font-medium">([\s\S]*?)<\/span>\s*<span[^>]*class="text-muted-foreground">([\s\S]*?)<\/span>/g;
  for (const m of block.matchAll(ingRegex)) {
    const amount = cleanText(m[1]);
    // Name has a leading " — " separator
    const name_ing = cleanText(m[2]).replace(/^—\s*/, '');
    if (amount && name_ing) {
      ingredients.push({ amount, name: name_ing });
    }
  }

  // ── Steps ────────────────────────────────────────────────────────────────
  // Structure: <p class="text-sm leading-relaxed pt-0.5 print:text-xs">STEP</p>
  const steps = [...block.matchAll(/<p class="text-sm leading-relaxed pt-0\.5 print:text-xs">([\s\S]*?)<\/p>/g)]
    .map(m => cleanText(m[1]))
    .filter(Boolean);

  // ── URL ──────────────────────────────────────────────────────────────────
  const url = `https://pequeno-almoco.chefantonioduarte.com/#receita-${id}`;

  return { id, name, ingredients, steps, tags, calories, prepTime, cookTime, servings, url, image };
}

// ── Main ──────────────────────────────────────────────────────────────────

const html = readFileSync(join(ROOT, 'test.html'), 'utf8');

// Split into per-recipe blocks using the article id as delimiter
const articlePattern = /(?=<article id="receita-\d+")/g;
const parts = html.split(articlePattern).filter(p => /id="receita-\d+"/.test(p));

console.log(`Found ${parts.length} recipe blocks in HTML`);

const recipes = parts.map((block, i) => parseRecipe(block, parts[i + 1]));

// Sanity check
const missing = recipes.filter(r => !r.name || !r.image);
if (missing.length) {
  console.warn(`⚠️  ${missing.length} recipes with missing name/image:`, missing.map(r => r.id));
}
const noIngredients = recipes.filter(r => r.ingredients.length === 0);
if (noIngredients.length) {
  console.warn(`⚠️  ${noIngredients.length} recipes with no ingredients:`, noIngredients.map(r => r.id));
}
const noSteps = recipes.filter(r => r.steps.length === 0);
if (noSteps.length) {
  console.warn(`⚠️  ${noSteps.length} recipes with no steps:`, noSteps.map(r => r.id));
}

// Write output
const outPath = join(ROOT, 'src', 'data', 'allBreakfasts.json');
writeFileSync(outPath, JSON.stringify(recipes, null, 2) + '\n', 'utf8');

console.log(`✅ Written ${recipes.length} recipes to src/data/allBreakfasts.json`);

// Print summary
recipes.forEach(r =>
  console.log(`  [${String(r.id).padStart(3)}] ${r.name} | ${r.ingredients.length} ing | ${r.steps.length} steps | ${r.tags.join(', ')}`)
);
