# Recipe Agent Pipeline

A modular, LLM-powered pipeline for scraping recipes from public websites into structured JSON.

---

## Architecture overview

```
URL(s)
  │
  ▼
┌─────────────────────┐      site-patterns.json
│   scrape-recipe.js  │◄────────────────────────┐
│   (Scraper Agent)   │─────────────────────────►│  (pattern cache, auto-updated)
└─────────────────────┘
          │
          │  scraped/raw/*.json
          │  (minimal schema — fields directly extracted from pages)
          ▼
┌─────────────────────┐
│  enrich-recipe.js   │  ← TODO: implement
│  (Enricher Agent)   │
└─────────────────────┘
          │
          │  scraped/enriched/*.json
          │  (full schema — nutrition, difficulty, structured ingredients, …)
          ▼
    src/data/*.json   ←  imported into the app recipe pool
```

---

## Stage 1 — Scraper Agent (`scrape-recipe.js`)

### What it does

Accepts a single URL and handles two cases automatically:

| Page type | Behaviour |
|-----------|-----------|
| **Single recipe page** | Extracts one recipe → writes `scraped/raw/<name>.json` |
| **Collection / gallery / category page** | Discovers all individual recipe URLs on the page, then processes each one. Follows pagination automatically. |

### How it works

1. **Fetch** the page HTML.
2. **Clean** it — strips scripts, ads, navbars, footers to reduce tokens.
3. **Check the site-pattern cache** (`site-patterns.json`). If a known CSS-selector pattern exists for this domain, it tries a fast cheerio-based extraction — no LLM call needed.
4. **Fall back to the LLM** if the cache misses or the cheerio result looks incomplete. Claude receives the cleaned HTML and must call one of two tools:
   - `save_recipe` — for single recipe pages.
   - `discover_recipe_urls` — for collection pages (returns all recipe URLs + optional next-page URL).
5. **Cache selectors** — when the LLM saves a recipe, it also provides the CSS selectors it used. These are stored in `site-patterns.json` so future pages from the same site skip the LLM entirely.

### Site-pattern cache (optimisation)

```jsonc
// site-patterns.json — auto-managed, do not edit by hand
{
  "www.example.com": {
    "detectedAt": "2026-03-30",
    "exampleUrl": "https://www.example.com/recipe/my-pasta",
    "selectors": {
      "name":        "h1.recipe-title",
      "image":       ".recipe-hero img",
      "servings":    ".servings-count",
      "prepTime":    ".prep-time",
      "cookTime":    ".cook-time",
      "ingredients": ".ingredient-item",
      "steps":       ".instruction-step",
      "tags":        ".recipe-tag"
    }
  }
}
```

**First visit to a site:** LLM extracts the recipe + suggests selectors → selectors cached.  
**All subsequent visits:** cheerio uses cached selectors → no LLM call, instant and free.  
**If the site redesigns:** cheerio result is sparse (< 2 ingredients or < 1 step) → automatic LLM fallback, cache updated.

### Output format (minimal schema)

Defined in `schemas/recipe-scrape-minimal.schema.json`. Reference example in `simple-scrape-format.json`.

Key design choices:
- **Ingredients are flat strings** — `"200g queijo ralado"`, not `{ amount, name }`. Simple to produce, easy for a human or downstream agent to read.
- **No `nutrition` field** — always `null` at scrape time; the enrichment agent computes it.
- **`image` is an absolute URL** — as found on the source page.
- **`tags` always include the domain slug** — so you can filter recipes by source site.

### Usage

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Single recipe
node scripts/agents/scrape-recipe.js https://www.apitadadopai.com/cogumelos-recheados/

# Collection page — discovers and scrapes every recipe on the page
node scripts/agents/scrape-recipe.js https://www.mob.kitchen/categories/breakfast

# Preview JSON without writing files
node scripts/agents/scrape-recipe.js <url> --dry-run

# Force re-scrape (overwrite existing files)
node scripts/agents/scrape-recipe.js <url> --force

# Custom output directory
node scripts/agents/scrape-recipe.js <url> --out=scraped/mob-breakfasts

# Skip pattern cache — always use the LLM (useful when debugging selectors)
node scripts/agents/scrape-recipe.js <url> --no-cache

# Use a cheaper/faster model (e.g. for collection discovery)
node scripts/agents/scrape-recipe.js <url> --model=claude-haiku-4-5
```

### npm shortcut

```bash
npm run scrape:recipe -- <url>
npm run scrape:recipe -- <url> --dry-run
```

---

## Stage 2 — Enricher Agent (`enrich-recipe.js`)  *(TODO)*

Reads all minimal JSONs from `scraped/raw/` and computes derived fields:

| Field | How |
|-------|-----|
| `nutrition` | LLM estimation or external API (Edamam, Nutritionix) |
| `difficulty` | LLM classification based on steps and technique keywords |
| `category` | `"breakfast"` \| `"lunch"` \| `"dinner"` \| `"snack"` \| `"dessert"` |
| `totalTime` | Parsed from `prepTime` + `cookTime` |
| `ingredientsStructured` | Re-parsed from flat strings into `{ amount, name }` objects |

Enriched files land in `scraped/enriched/` and are ready to import into `src/data/`.

```bash
npm run enrich:recipes
npm run enrich:recipes -- --file=scraped/raw/cogumelos-recheados.json
```

---

## Adding a new scraping source

1. Find the URL of a recipe page or collection page on the target site.
2. Run the scraper in dry-run mode first to review the output:
   ```bash
   node scripts/agents/scrape-recipe.js <url> --dry-run
   ```
3. If the output looks good, run without `--dry-run` to write files.
4. The agent will automatically cache CSS selectors for the domain — future runs against the same site will be instant.
5. Review the files in `scraped/raw/` and fix anything unexpected before enriching.

---

## Installation

The agent requires the Anthropic SDK (not bundled with the app):

```bash
npm install @anthropic-ai/sdk
```

`node-fetch` and `cheerio` are already in the project dependencies.
