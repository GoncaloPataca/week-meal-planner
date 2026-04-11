#!/usr/bin/env node
/**
 * scrape-mob-dinners.js
 *
 * Scrapes the first 100 lunch recipes from mob.co.uk and saves them as
 * JSON files in src/data/recipes/mob/dinners/, following the recipe-scrape-minimal schema.
 *
 * No LLM required — extracts directly from schema.org JSON-LD embedded in the
 * server-rendered HTML.
 *
 * Usage:
 *   node scripts/scrape-mob-dinners.js [options]
 *
 * Options:
 *   --limit=<n>     Max recipes to scrape (default: 100)
 *   --out=<dir>     Output directory (default: src/data/recipes/mob/dinners)
 *   --delay=<ms>    Delay between requests in ms (default: 800)
 *   --force         Overwrite already-scraped files
 *   --dry-run       Print JSON to stdout; don't write files
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limit   = parseInt(args.find(a => a.startsWith('--limit='))?.slice(8) ?? '100');
const outDir  = args.find(a => a.startsWith('--out='))?.slice(6) ?? join(ROOT, 'src/data/recipes/mob/dinners');
const delay   = parseInt(args.find(a => a.startsWith('--delay='))?.slice(8) ?? '800');
const force   = args.includes('--force');
const dryRun  = args.includes('--dry-run');

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Convert ISO 8601 duration (PT20M, PT1H30M, P0D) to total minutes */
function parseDurationMinutes(iso) {
  if (!iso || iso === 'P0D' || iso === 'PT0S') return 0;
  const hours   = parseInt(iso.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = parseInt(iso.match(/(\d+)M/)?.[1] ?? 0);
  return hours * 60 + minutes;
}

/** Format total minutes as a plain string, e.g. '1 hour 30 minutes', or null */
function formatDuration(totalMinutes) {
  if (!totalMinutes) return null;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  return parts.join(' ') || null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
    timeout: 20000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── JSON-LD extraction ────────────────────────────────────────────────────────

function extractJsonLd(html) {
  const $ = cheerio.load(html);
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { blocks.push(JSON.parse($(el).html())); } catch {}
  });
  return blocks;
}

function findRecipeBlock(blocks) {
  for (const block of blocks) {
    if (block['@type'] === 'Recipe') return block;
    if (Array.isArray(block['@graph'])) {
      const found = block['@graph'].find(n => n['@type'] === 'Recipe');
      if (found) return found;
    }
  }
  return null;
}

// ── Algolia URL collection ─────────────────────────────────────────────────────

const ALGOLIA_APP_ID = '0A23VQXVIM';
const ALGOLIA_API_KEY = '3ca3a4eebd2fb1062c72933cba7b5617';
const ALGOLIA_INDEX  = 'Entries';

/**
 * Collect recipe URLs from Algolia's search index.
 * Returns an array of absolute recipe URLs, up to `limit`.
 */
async function collectRecipeUrls(limit) {
  const perPage = Math.min(100, limit);
  const urls = [];
  let page = 0;

  while (urls.length < limit) {
    const params = new URLSearchParams({
      query: '',
      facetFilters: 'meals.title:Dinner',
      hitsPerPage: perPage,
      page,
      attributesToRetrieve: 'uri,sectionHandle',
    }).toString();

    const res = await fetch(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ params }),
      }
    );
    if (!res.ok) throw new Error(`Algolia HTTP ${res.status}`);
    const data = await res.json();

    const hits = data.hits ?? [];
    if (hits.length === 0) break;

    for (const hit of hits) {
      if (hit.sectionHandle === 'recipes' && hit.uri) {
        const url = 'https://www.mob.co.uk/' + hit.uri;
        if (!urls.includes(url)) urls.push(url);
      }
    }

    console.log(`   Algolia page ${page}: ${hits.length} hits → ${urls.length} recipe URLs`);

    if (data.nbPages && page >= data.nbPages - 1) break;
    page++;
  }

  return urls.slice(0, limit);
}

// ── Recipe page scraping ──────────────────────────────────────────────────────

function mapRecipe(ld, url) {
  if (!ld) return null;

  const name        = ld.name?.trim();
  const image       = ld.image ?? ld.thumbnailUrl ?? null;
  const servings    = ld.recipeYield ? parseInt(ld.recipeYield) || null : null;
  const cookTime    = formatDuration(parseDurationMinutes(ld.prepTime) + parseDurationMinutes(ld.cookTime));
  const ingredients = (ld.recipeIngredient ?? []).map(s => s.trim()).filter(Boolean);
  const steps       = (ld.recipeInstructions ?? [])
    .map(s => (typeof s === 'string' ? s : s.text ?? '').trim())
    .filter(Boolean);

  // Tags from recipeCategory — split on commas, lowercase, hyphenate
  const rawCategories = (ld.recipeCategory ?? '').split(',').map(c => slugify(c.trim())).filter(Boolean);
  const tags = [...new Set([...rawCategories, 'mob-co-uk'])];

  if (!name || ingredients.length === 0 || steps.length === 0) return null;

  return { name, url, image, servings, cookTime, ingredients, steps, tags };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🍽️  MOB Dinner Scraper`);
  console.log(`   Target: ${limit} recipes → ${dryRun ? 'stdout (dry run)' : outDir}\n`);

  if (!dryRun) mkdirSync(outDir, { recursive: true });

  // Step 1: Collect recipe URLs via the search API
  console.log(`🔍 Collecting recipe URLs from search API...\n`);
  const toScrape = await collectRecipeUrls(limit);
  console.log(`\n🔗 Collected ${toScrape.length} recipe URLs\n`);

  // Step 2: Scrape each recipe page
  let saved = 0, skipped = 0, failed = 0;

  for (let i = 0; i < toScrape.length; i++) {
    const url = toScrape[i];
    const slug = url.split('/').pop();
    const outPath = join(outDir, `${slug}.json`);

    process.stdout.write(`[${String(i + 1).padStart(3)}/${toScrape.length}] ${slug} `);

    if (!force && !dryRun && existsSync(outPath)) {
      console.log('⏭  (already exists)');
      skipped++;
      continue;
    }

    try {
      const html = await fetchHtml(url);
      const blocks = extractJsonLd(html);
      const ld = findRecipeBlock(blocks);
      const recipe = mapRecipe(ld, url);

      if (!recipe) {
        console.log('⚠️  No complete recipe data found');
        failed++;
      } else if (dryRun) {
        console.log('✅');
        console.log(JSON.stringify(recipe, null, 2));
        saved++;
      } else {
        writeFileSync(outPath, JSON.stringify(recipe, null, 2) + '\n', 'utf8');
        console.log(`✅  (${recipe.ingredients.length} ing, ${recipe.steps.length} steps)`);
        saved++;
      }
    } catch (err) {
      console.log(`❌  ${err.message}`);
      failed++;
    }

    if (i < toScrape.length - 1) await sleep(delay);
  }

  console.log(`\n🎉 Done — saved: ${saved}, skipped: ${skipped}, failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
