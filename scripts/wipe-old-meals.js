import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEALS_FILE = path.join(__dirname, '../src/data/meals.json');
const KEEP_WEEKS = 3; // current week + 2 full past weeks

function wipeOldMeals() {
  if (!fs.existsSync(MEALS_FILE)) {
    console.error('⚠️ Meals file not found. Ensure the path is correct.');
    process.exit(1);
  }

  const mealsData = JSON.parse(fs.readFileSync(MEALS_FILE, 'utf-8'));

  // Compute cutoff as a plain ISO date string to avoid UTC vs local time-of-day bugs
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_WEEKS * 7);
  const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

  const updatedMeals = Object.entries(mealsData).reduce((result, [date, meals]) => {
    if (date >= cutoffISO) {
      result[date] = meals;
    }
    return result;
  }, {});

  const removed = Object.keys(mealsData).length - Object.keys(updatedMeals).length;
  fs.writeFileSync(MEALS_FILE, JSON.stringify(updatedMeals, null, 2), 'utf-8');

  console.log(`✅ Wiped ${removed} day(s) older than ${cutoffISO} (keeping ${KEEP_WEEKS} weeks).`);
}

wipeOldMeals();