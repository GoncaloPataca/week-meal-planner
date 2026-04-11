#!/usr/bin/env node
/**
 * enrich-recipe.js — Recipe Enrichment Agent  (stub / pipeline placeholder)
 *
 * This agent is the second stage of the recipe pipeline. It reads the minimal
 * JSON files produced by scrape-recipe.js and computes derived / enriched fields:
 *
 *   ✅ nutrition     — estimated calories, protein, carbs, fat, fiber per serving
 *   ✅ difficulty    — "easy" | "medium" | "hard" based on steps and technique keywords
 *   ✅ category      — normalised meal category ("breakfast" | "lunch" | "dinner" | …)
 *   ✅ totalTime     — derived from prepTime + cookTime when both are present
 *   ✅ ingredients   — optionally re-structured from flat strings into { amount, name }
 *
 * The enriched output is written to scraped/enriched/ and is ready to be imported
 * into the recipe pool (src/data/).
 *
 * Usage:
 *   node scripts/agents/enrich-recipe.js [options]
 *
 * Options:
 *   --in=<dir>       Input directory of minimal JSONs    (default: scraped/raw)
 *   --out=<dir>      Output directory for enriched JSONs (default: scraped/enriched)
 *   --file=<path>    Enrich a single file instead of a whole directory
 *   --model=<model>  Claude model to use                 (default: claude-haiku-4-5)
 *   --dry-run        Print result to stdout; don't write files
 *   --force          Re-enrich files that already have an enriched version
 *
 * Environment:
 *   ANTHROPIC_API_KEY   Required.
 *
 * Pipeline position:
 *   scrape-recipe.js  →  [scraped/raw/*.json]  →  enrich-recipe.js  →  [scraped/enriched/*.json]
 *                                                                              ↓
 *                                                              import into src/data/
 */

// ─────────────────────────────────────────────────────────────────────────────
// TODO: Implement this agent.
//
// Suggested implementation approach:
//
//   1. Read all *.json files from the input directory (or --file).
//
//   2. For each minimal recipe, call the LLM with a prompt like:
//        "Given this recipe, estimate the nutrition per serving and classify the
//         difficulty and meal category. Return structured JSON."
//
//   3. Optionally also call a nutrition API (e.g. Edamam, Nutritionix) for more
//      accurate values than LLM estimation.
//
//   4. Merge the enriched fields into the minimal recipe and write to --out.
//
//   5. Track which files have already been enriched (skip unless --force).
//
// Enriched output shape (extends the minimal schema):
//
//   {
//     // --- all fields from minimal schema ---
//     "name": "...",
//     "url": "...",
//     "ingredients": ["..."],      // flat strings (kept as-is from minimal)
//     "steps": ["..."],
//     "tags": ["..."],
//
//     // --- added by this agent ---
//     "difficulty": "easy",        // "easy" | "medium" | "hard"
//     "category": "dinner",        // "breakfast" | "lunch" | "dinner" | "snack" | "dessert"
//     "totalTime": "25 minutes",   // derived from prepTime + cookTime
//     "nutrition": {               // per serving, estimated
//       "calories": 320,
//       "protein": 18,
//       "carbs": 12,
//       "fat": 22,
//       "fiber": 3
//     },
//
//     // --- optional, structured form of ingredients for the app ---
//     "ingredientsStructured": [
//       { "amount": "4", "name": "cogumelos Portobello" },
//       { "amount": "q.b.", "name": "sal" }
//     ]
//   }
// ─────────────────────────────────────────────────────────────────────────────

console.log('enrich-recipe.js is not yet implemented.');
console.log('See the comments in this file for the suggested implementation approach.');
console.log('Pipeline: scraped/raw/*.json → enrich-recipe.js → scraped/enriched/*.json');
