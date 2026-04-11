#!/usr/bin/env node
/**
 * scrape-recipe.js — Recipe Scraper Agent
 *
 * Uses an LLM (Claude) to extract recipe data from any public website into
 * the minimal JSON format defined in schemas/recipe-scrape-minimal.schema.json.
 *
 * Handles two page types automatically:
 *   - Single recipe page  → extracts and saves one JSON file.
 *   - Collection page     → discovers all individual recipe URLs, then
 *                           processes each one (supports pagination).
 *
 * Site-pattern optimisation:
 *   After the LLM successfully extracts a recipe, it is also asked to suggest
 *   CSS selectors for the key fields. These are stored in site-patterns.json
 *   keyed by domain. On subsequent runs against the same domain, the agent
 *   tries a fast cheerio-based extraction first and only falls back to the LLM
 *   if the result looks incomplete (< 2 ingredients or < 1 step).
 *
 * Usage:
 *   node scripts/agents/scrape-recipe.js <url> [options]
 *
 * Options:
 *   --out=<dir>      Output directory for scraped JSON files  (default: scraped/raw)
 *   --model=<model>  Claude model to use                      (default: claude-opus-4-5)
 *   --force          Overwrite already-scraped files
 *   --dry-run        Print extracted JSON to stdout; don't write files
 *   --no-cache       Skip site-pattern cache; always use the LLM
 *
 * Environment:
 *   ANTHROPIC_API_KEY   Required. Your Anthropic API key.
 *
 * Examples:
 *   # Single recipe
 *   node scripts/agents/scrape-recipe.js https://www.apitadadopai.com/cogumelos-recheados/
 *
 *   # Collection page (agent discovers and processes every recipe on the page)
 *   node scripts/agents/scrape-recipe.js https://www.mob.kitchen/categories/breakfast
 *
 *   # Dry run — useful for testing before writing files
 *   node scripts/agents/scrape-recipe.js <url> --dry-run
 */

import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const PATTERNS_FILE = join(__dirname, 'site-patterns.json');
const EXAMPLE_FILE  = join(ROOT, 'simple-scrape-format.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getDomain(url) {
  return new URL(url).hostname;
}

function loadPatterns() {
  return existsSync(PATTERNS_FILE)
    ? JSON.parse(readFileSync(PATTERNS_FILE, 'utf8'))
    : {};
}

function savePatterns(patterns) {
  writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2) + '\n', 'utf8');
}

// ── HTML fetching & cleaning ──────────────────────────────────────────────────

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0; +https://github.com/your-project)',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    },
    timeout: 15000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

/**
 * Strips noise (scripts, ads, navbars, footers) and collapses whitespace so
 * the HTML sent to the LLM is as compact as possible.
 */
function cleanHtml(html) {
  const $ = cheerio.load(html);

  // Remove elements that never contain recipe content
  $(
    'script, style, noscript, iframe, svg, canvas, ' +
    'header, footer, nav, aside, ' +
    '[class*="cookie"], [id*="cookie"], ' +
    '[class*="popup"], [id*="popup"], [class*="modal"], [id*="modal"], ' +
    '[class*="banner"], [id*="banner"], ' +
    '[class*="newsletter"], [id*="newsletter"], ' +
    '[class*="ad-"], [id*="ad-"], [class*="advertisement"], ' +
    '[class*="sidebar"], [id*="sidebar"], ' +
    '[class*="related"], [id*="related"], ' +
    '[class*="comment"], [id*="comment"]'
  ).remove();

  // Prefer the <main> or <article> region if it exists
  const main = $('main, article, [role="main"]').first();
  const content = main.length ? main.html() : $.html();

  return (content ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')   // strip HTML comments
    .replace(/\s{2,}/g, ' ')           // collapse whitespace
    .trim();
}

// ── Fast cheerio extraction (site-pattern cache) ──────────────────────────────

/**
 * Attempt to extract a recipe using cached CSS selectors for this domain.
 * Returns null if the result is too sparse to trust.
 */
function tryPatternExtraction(url, html, pattern) {
  try {
    const $ = cheerio.load(html);
    const s = pattern.selectors;

    const name        = $(s.name).first().text().trim();
    const image       = $(s.image).first().attr('src') ?? $(s.image).first().attr('data-src') ?? null;
    const servings    = parseInt($(s.servings).first().text()) || null;
    const prepTime    = $(s.prepTime).first().text().trim() || null;
    const cookTime    = $(s.cookTime).first().text().trim() || null;
    const ingredients = $(s.ingredients).map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const steps       = $(s.steps).map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const tags        = s.tags ? $(s.tags).map((_, el) => slugify($(el).text().trim())).get().filter(Boolean) : [];

    // Confidence check — if the core fields look empty, fall back to LLM
    if (!name || ingredients.length < 2 || steps.length < 1) return null;

    // Add domain slug as a source tag
    const domain = getDomain(url);
    const domainSlug = slugify(domain.replace(/^www\./, ''));
    if (!tags.includes(domainSlug)) tags.push(domainSlug);

    return { name, url, image, servings, prepTime, cookTime, ingredients, steps, tags };
  } catch {
    return null; // any parsing error → fall back to LLM
  }
}

// ── LLM tools & system prompt ─────────────────────────────────────────────────

const EXAMPLE_RECIPE = JSON.parse(readFileSync(EXAMPLE_FILE, 'utf8'));

const SYSTEM_PROMPT = `\
You are a precise recipe data extraction agent. Your only job is to extract structured recipe data from HTML pages into a minimal JSON format and call the appropriate tool.

## Output format

Every recipe MUST match this exact structure (this is a real example):
${JSON.stringify(EXAMPLE_RECIPE, null, 2)}

### Field rules

- **name**        — Recipe name exactly as found on the page. Do not translate.
- **url**         — The exact URL of this recipe page.
- **image**       — Absolute URL of the main recipe image. null if not present.
- **servings**    — Number of servings as a number. null if not stated.
- **prepTime**    — Prep time as a plain string, e.g. "20 minutes". null if absent.
- **cookTime**    — Cook/bake time as a plain string. null if absent.
- **ingredients** — Array of FLAT STRINGS. Merge amount + ingredient into one readable line.
  Good:  ["4 cogumelos Portobello", "q.b. sal", "200g queijo ralado", "2 dentes de alho"]
  Bad:   [{"amount": "4", "name": "cogumelos"}]  ← never use objects
  Bad:   ["cogumelos Portobello"]               ← always include the amount when available
- **steps**       — Ordered list of preparation steps. One instruction per string.
- **tags**        — Lowercase, hyphenated category/label tags from the page (e.g. "sem-gluten", "prato-principal"). Always add the source domain slug as a tag (e.g. "apitadadopai", "mob-kitchen").

### What to OMIT
- NO \`nutrition\` field — a downstream enrichment agent handles that.
- NO fields not listed above.
- Do NOT translate any content.

### Structured data priority
Prefer JSON-LD (schema.org/Recipe), microdata, or OpenGraph if present — they are more reliable than raw HTML parsing. Fall back to visual HTML parsing only if no structured data exists.

---

## Page types

### Single recipe page
Call \`save_recipe\` with the extracted data.

### Collection / gallery / category page
A page listing multiple recipes (e.g. "All breakfasts", a tag page, a search results page).
Call \`discover_recipe_urls\` with every individual recipe URL you can find.
Do NOT try to extract recipe details from a collection page.
If the collection is paginated, also return the next page URL so the orchestrator can continue.

---

## After saving a recipe — selector hints
When you call \`save_recipe\`, also fill in the \`selector_hints\` field with the CSS selectors (or JSON-LD path) you used to extract each field. This allows the system to bypass the LLM for future pages from the same site.
Example hint: { "name": "h1.wprm-recipe-name", "ingredients": ".wprm-recipe-ingredient" }
`;

const TOOLS = [
  {
    name: 'save_recipe',
    description: 'Save one extracted recipe in the minimal format. Call this once per recipe page.',
    input_schema: {
      type: 'object',
      required: ['recipe'],
      additionalProperties: false,
      properties: {
        recipe: {
          type: 'object',
          required: ['name', 'url', 'ingredients', 'steps'],
          additionalProperties: false,
          properties: {
            name:        { type: 'string' },
            url:         { type: 'string' },
            image:       { type: ['string', 'null'] },
            servings:    { type: ['number', 'null'] },
            prepTime:    { type: ['string', 'null'] },
            cookTime:    { type: ['string', 'null'] },
            ingredients: { type: 'array', items: { type: 'string' } },
            steps:       { type: 'array', items: { type: 'string' } },
            tags:        { type: 'array', items: { type: 'string' } },
          },
        },
        selector_hints: {
          type: 'object',
          description: 'CSS selectors (or JSON-LD key paths) used to extract each field. Used to build the site-pattern cache.',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
  {
    name: 'discover_recipe_urls',
    description: 'Called when the page is a collection of recipes. Returns all individual recipe URLs found on the page.',
    input_schema: {
      type: 'object',
      required: ['urls'],
      additionalProperties: false,
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Absolute URLs of individual recipe pages discovered on this collection page.',
        },
        next_page_url: {
          type: ['string', 'null'],
          description: 'URL of the next page if the collection is paginated. null otherwise.',
        },
      },
    },
  },
];

// ── LLM call ─────────────────────────────────────────────────────────────────

async function callLLM(url, cleanedHtml, model, client) {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    tool_choice: { type: 'any' }, // force a tool call; no prose responses
    messages: [
      {
        role: 'user',
        content:
          `Extract recipe data from the page below and call the appropriate tool.\n\n` +
          `URL: ${url}\n\n` +
          `HTML (cleaned):\n${cleanedHtml.slice(0, 120_000)}`, // ~30k tokens upper bound
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse) {
    throw new Error(
      `LLM did not call a tool. Stop reason: ${response.stop_reason}. ` +
      `Content: ${JSON.stringify(response.content).slice(0, 300)}`
    );
  }
  return { toolName: toolUse.name, toolInput: toolUse.input };
}

// ── Core orchestrator ─────────────────────────────────────────────────────────

async function scrapeUrl(url, opts = {}) {
  const {
    outDir   = join(ROOT, 'scraped', 'raw'),
    dryRun   = false,
    model    = 'claude-opus-4-5',
    force    = false,
    noCache  = false,
    client,
    depth    = 0,       // recursion depth (collection → individual pages)
  } = opts;

  const indent = '  '.repeat(depth);
  console.log(`\n${indent}🌐 Fetching: ${url}`);

  const html   = await fetchHtml(url);
  const domain = getDomain(url);

  // ── 1. Try site-pattern cache first (fast, free) ──────────────────────────
  if (!noCache) {
    const patterns = loadPatterns();
    const pattern  = patterns[domain];
    if (pattern?.selectors) {
      const cached = tryPatternExtraction(url, html, pattern);
      if (cached) {
        console.log(`${indent}⚡ Pattern cache hit for ${domain} — skipping LLM`);
        return [await saveRecipe(cached, { outDir, dryRun, force, indent })];
      }
      console.log(`${indent}⚠️  Pattern cache miss for ${domain} — falling back to LLM`);
    }
  }

  // ── 2. LLM extraction ────────────────────────────────────────────────────
  const cleanedHtml            = cleanHtml(html);
  const { toolName, toolInput } = await callLLM(url, cleanedHtml, model, client);

  // ── 3a. Single recipe ─────────────────────────────────────────────────────
  if (toolName === 'save_recipe') {
    const { recipe, selector_hints } = toolInput;

    // Persist selector hints to the pattern cache so future pages skip the LLM
    if (selector_hints && Object.keys(selector_hints).length > 0 && !noCache) {
      const patterns = loadPatterns();
      patterns[domain] = {
        detectedAt     : new Date().toISOString().slice(0, 10),
        exampleUrl     : url,
        selectors      : selector_hints,
      };
      savePatterns(patterns);
      console.log(`${indent}💡 Cached selectors for ${domain}`);
    }

    return [await saveRecipe(recipe, { outDir, dryRun, force, indent })];
  }

  // ── 3b. Collection page ───────────────────────────────────────────────────
  if (toolName === 'discover_recipe_urls') {
    const { urls, next_page_url } = toolInput;
    console.log(`${indent}📚 Collection — ${urls.length} recipe URL(s) discovered`);
    if (next_page_url) {
      console.log(`${indent}📄 Paginated — next page: ${next_page_url}`);
    }

    // Recursively scrape each individual recipe URL
    const results = [];
    for (const recipeUrl of urls) {
      try {
        const scraped = await scrapeUrl(recipeUrl, { ...opts, depth: depth + 1 });
        results.push(...scraped);
      } catch (err) {
        console.error(`${indent}  ❌ Failed: ${recipeUrl} — ${err.message}`);
      }
    }

    // Follow pagination if present
    if (next_page_url) {
      const nextResults = await scrapeUrl(next_page_url, { ...opts, depth });
      results.push(...nextResults);
    }

    return results;
  }

  throw new Error(`Unexpected tool name from LLM: ${toolName}`);
}

// ── Save helper ───────────────────────────────────────────────────────────────

async function saveRecipe(recipe, { outDir, dryRun, force, indent = '' }) {
  console.log(`${indent}✅ "${recipe.name}" — ${recipe.ingredients?.length ?? 0} ingredients, ${recipe.steps?.length ?? 0} steps`);

  if (dryRun) {
    console.log(JSON.stringify(recipe, null, 2));
    return recipe;
  }

  mkdirSync(outDir, { recursive: true });
  const filename = `${slugify(recipe.name)}.json`;
  const outPath  = join(outDir, filename);

  if (!force && existsSync(outPath)) {
    console.log(`${indent}⏭️  Already exists — skipping (use --force to overwrite): ${filename}`);
    return recipe;
  }

  writeFileSync(outPath, JSON.stringify(recipe, null, 2) + '\n', 'utf8');
  console.log(`${indent}💾 Saved: ${filename}`);
  return recipe;
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const HELP = `
Usage:
  node scripts/agents/scrape-recipe.js <url> [options]

Options:
  --out=<dir>    Output directory for JSON files  (default: scraped/raw)
  --model=<id>   Claude model to use              (default: claude-opus-4-5)
  --force        Overwrite already-scraped files
  --dry-run      Print JSON to stdout; don't write files
  --no-cache     Skip site-pattern cache; always call the LLM

Environment:
  ANTHROPIC_API_KEY   Required.

Examples:
  # Single recipe page
  node scripts/agents/scrape-recipe.js https://www.apitadadopai.com/cogumelos-recheados/

  # Collection page — agent discovers and scrapes every recipe
  node scripts/agents/scrape-recipe.js https://www.mob.kitchen/categories/breakfast

  # Preview without writing files
  node scripts/agents/scrape-recipe.js <url> --dry-run

  # Force re-scrape, different output dir
  node scripts/agents/scrape-recipe.js <url> --force --out=scraped/mob-breakfasts
`;

const args = process.argv.slice(2);

if (!args.length || args.includes('--help') || args.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY environment variable is required.');
  console.error('    Export it with: export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const url    = args.find((a) => !a.startsWith('--'));
const outDir = args.find((a) => a.startsWith('--out='))?.slice('--out='.length);
const model  = args.find((a) => a.startsWith('--model='))?.slice('--model='.length) ?? 'claude-opus-4-5';
const dryRun = args.includes('--dry-run');
const force  = args.includes('--force');
const noCache = args.includes('--no-cache');

if (!url) {
  console.error('❌  No URL provided. Run with --help for usage.');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

scrapeUrl(url, { outDir, dryRun, model, force, noCache, client })
  .then((recipes) => {
    console.log(`\n🎉 Done — ${recipes.length} recipe(s) scraped.`);
  })
  .catch((err) => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
