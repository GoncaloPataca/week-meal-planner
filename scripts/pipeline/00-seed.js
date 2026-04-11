#!/usr/bin/env node
/**
 * Pipeline Stage 00 — Seed
 *
 * Copies recipes from source folders (e.g. src/data/recipes/mob/) into the
 * canonical pipeline/recipes/ folder, deduplicating by slug (filename).
 * Already-present files are skipped unless --force is passed.
 *
 * Usage:
 *   node scripts/pipeline/00-seed.js
 *   node scripts/pipeline/00-seed.js --force   # overwrite existing files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

const SOURCES = [
  path.join(ROOT, 'src/data/recipes/mob/breakfasts'),
  path.join(ROOT, 'src/data/recipes/mob/lunches'),
  path.join(ROOT, 'src/data/recipes/mob/dinners'),
  // Add more source folders here as new scrapers are built
];

const DEST = path.join(ROOT, 'pipeline/recipes');
const MANIFEST_PATH = path.join(ROOT, 'pipeline/manifest.json');

const FORCE = process.argv.includes('--force');

// ── helpers ──────────────────────────────────────────────────────────────────

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function scanSource(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));
}

// ── main ─────────────────────────────────────────────────────────────────────

fs.mkdirSync(DEST, { recursive: true });

const manifest = loadManifest();

let copied = 0;
let skipped = 0;
const seen = new Set();

for (const sourceDir of SOURCES) {
  for (const srcPath of scanSource(sourceDir)) {
    const slug = path.basename(srcPath, '.json');

    if (seen.has(slug)) {
      // Duplicate across source folders — already copied, skip silently
      continue;
    }
    seen.add(slug);

    const destPath = path.join(DEST, path.basename(srcPath));

    if (!FORCE && fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    fs.copyFileSync(srcPath, destPath);
    copied++;

    // Register in manifest if not already there
    if (!manifest[slug]) {
      manifest[slug] = {
        slug,
        source: path.relative(ROOT, srcPath),
        seededAt: new Date().toISOString(),
        stages: {
          seed: true,
          structureIngredients: false,
          enrichNutrition: false,
          downloadImages: false,
          translate: false,
          computePortions: false,
        },
      };
    }
  }
}

saveManifest(manifest);

console.log(`\nSeed complete`);
console.log(`  Copied  : ${copied}`);
console.log(`  Skipped : ${skipped} (already present; use --force to overwrite)`);
console.log(`  Total   : ${seen.size} unique recipes`);
console.log(`  Manifest: pipeline/manifest.json\n`);
