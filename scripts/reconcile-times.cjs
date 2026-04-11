#!/usr/bin/env node
/**
 * reconcile-times.cjs
 * One-off script: merge prepTime + cookTime into a single cookTime field,
 * then delete the prepTime key from all scraped MOB recipe JSON files.
 */
const fs = require('fs');
const path = require('path');

function parseTimeStr(str) {
  if (!str) return 0;
  const h = parseInt(str.match(/(\d+)\s+hour/)?.[1] ?? 0);
  const m = parseInt(str.match(/(\d+)\s+minute/)?.[1] ?? 0);
  return h * 60 + m;
}

function formatTime(totalMinutes) {
  if (!totalMinutes) return null;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  return parts.join(' ') || null;
}

const MOB_DIR = path.resolve(__dirname, '..', 'src', 'data', 'recipes', 'mob');
let total = 0, changed = 0;
const stats = { both: 0, prepOnly: 0, cookOnly: 0, neither: 0 };

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(full); continue; }
    if (!entry.name.endsWith('.json')) continue;
    total++;

    const r = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (!('prepTime' in r)) continue; // not a scraped recipe file

    const hasPrepTime = !!r.prepTime;
    const hasCookTime = !!r.cookTime;

    if (hasPrepTime && hasCookTime) stats.both++;
    else if (hasPrepTime) stats.prepOnly++;
    else if (hasCookTime) stats.cookOnly++;
    else stats.neither++;

    const totalMins = parseTimeStr(r.prepTime) + parseTimeStr(r.cookTime);
    const combined = formatTime(totalMins);

    // Rebuild the object without prepTime, preserving field order
    const { prepTime, cookTime, ...rest } = r;
    const updated = { ...rest, cookTime: combined ?? cookTime ?? null };

    // Only write if something actually changed
    const before = JSON.stringify(r);
    const after = JSON.stringify(updated);
    if (before !== after) {
      fs.writeFileSync(full, JSON.stringify(updated, null, 2) + '\n', 'utf8');
      changed++;
    } else {
      // Still remove prepTime key even if times didn't change
      if ('prepTime' in r) {
        fs.writeFileSync(full, JSON.stringify(updated, null, 2) + '\n', 'utf8');
        changed++;
      }
    }
  }
}

scan(MOB_DIR);

console.log(`\nReconciliation complete`);
console.log(`  Total files processed : ${total}`);
console.log(`  Files rewritten       : ${changed}`);
console.log(`  Both fields set       : ${stats.both}  (prep+cook summed → cookTime)`);
console.log(`  prepTime only         : ${stats.prepOnly}  (moved → cookTime)`);
console.log(`  cookTime only         : ${stats.cookOnly}  (unchanged)`);
console.log(`  Neither               : ${stats.neither}`);
