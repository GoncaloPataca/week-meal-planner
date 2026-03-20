#!/usr/bin/env node

/**
 * Generate a week of meals (breakfast + lunch + dinner) and update meals.json
 * Usage: node scripts/generate-week.js [start-date] [--seed=123]
 * Example: node scripts/generate-week.js 2026-03-23 --seed=42
 *
 * Recipe sources:
 *   src/data/allBreakfasts.json  — morning meals
 *   src/data/AllLunches.json    — lunch meals
 *   src/data/AllDinners.json    — dinner meals
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

function loadJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Recipe file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Seeded random number generator for deterministic randomness
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

function parseDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getNextMonday(fromDate) {
  const date = new Date(fromDate);
  const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date;
}

function getCurrentMonday(fromDate) {
  const date = new Date(fromDate);
  // If today is Sunday (0) go back 6 days, otherwise go back to most recent Monday
  const dayOfWeek = date.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysBack);
  return date;
}

function makeMealEntry(recipe, type) {
  const configs = {
    breakfast: {
      idPrefix: 'breakfast',
      label: 'Morning',
      time: '08:00',
      notes: null,
    },
    lunch: {
      idPrefix: 'lunch',
      label: 'Lunch',
      time: '13:00',
      notes: null,
    },
    dinner: {
      idPrefix: 'dinner',
      label: 'Dinner',
      time: '20:00',
      notes: null,
    },
  };

  const cfg = configs[type];
  const entry = {
    id: `${cfg.idPrefix}-${recipe.id}`,
    label: cfg.label,
    time: cfg.time,
    title: recipe.name,
    servings: recipe.servings,
    prep: recipe.prepTime,
    cook: recipe.cookTime,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    url: recipe.url || null,
    image: recipe.image || null,
  };
  if (cfg.notes) entry.notes = cfg.notes;
  if (recipe.nutrition) entry.nutrition = recipe.nutrition;
  return entry;
}

function generateWeek(startDate, seed = null) {
  const breakfastRecipes = loadJson('allBreakfasts.json');
  const lunchRecipes     = loadJson('AllLunches.json');
  const dinnerRecipes    = loadJson('AllDinners.json');

  const random = seed !== null ? new SeededRandom(seed) : null;
  const shuffle = arr =>
    random ? random.shuffle(arr) : [...arr].sort(() => Math.random() - 0.5);

  const breakfasts = shuffle(breakfastRecipes).slice(0, 7);
  const lunches    = shuffle(lunchRecipes).slice(0, 7);
  const dinners    = shuffle(dinnerRecipes).slice(0, 7);

  const meals = {};

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateISO = formatDate(date);

    meals[dateISO] = [
      makeMealEntry(breakfasts[i], 'breakfast'),
      makeMealEntry(lunches[i],    'lunch'),
      makeMealEntry(dinners[i],    'dinner'),
    ];
  }

  return meals;
}

function updateMealsJson(newMeals, options = {}) {
  const mealsPath = path.join(__dirname, '..', 'src', 'data', 'meals.json');
  
  let existingMeals = {};
  if (fs.existsSync(mealsPath)) {
    const content = fs.readFileSync(mealsPath, 'utf8');
    existingMeals = JSON.parse(content);
  }
  
  // Merge or replace existing meals
  if (options.replace) {
    // Replace the entire day for every date in the new week
    Object.keys(newMeals).forEach(date => {
      existingMeals[date] = newMeals[date];
    });
  } else {
    // Default: merge by label — keep existing meals, add any label not already present
    Object.keys(newMeals).forEach(date => {
      if (!existingMeals[date]) {
        existingMeals[date] = newMeals[date];
      } else {
        const existingLabels = new Set(existingMeals[date].map(m => m.label));
        const toAdd = newMeals[date].filter(m => !existingLabels.has(m.label));
        existingMeals[date] = [...existingMeals[date], ...toAdd];
      }
    });
  }
  
  // Sort by date
  const sortedMeals = Object.keys(existingMeals)
    .sort()
    .reduce((acc, key) => {
      acc[key] = existingMeals[key];
      return acc;
    }, {});

  if (!options.simulate) {
    fs.writeFileSync(mealsPath, JSON.stringify(sortedMeals, null, 2) + '\n', 'utf8');
  }
  
  return sortedMeals;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    seed: null,
    replace: false,
    nextWeek: false,
    dryRun: false,
    help: false
  };
  
  args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--replace' || arg === '-r') {
      options.replace = true;
    } else if (arg === '--next-week' || arg === '-n') {
      options.nextWeek = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg.startsWith('--seed=')) {
      options.seed = parseInt(arg.split('=')[1]);
    } else if (!arg.startsWith('-')) {
      options.startDate = arg;
    }
  });
  
  return options;
}

function printHelp() {
  console.log(`
Generate Week - Meal Planner Script

Generates a full week of meals (breakfast, lunch, dinner) from:
  src/data/allBreakfasts.json
  src/data/AllLunches.json
  src/data/AllDinners.json

Usage: node scripts/generate-week.js [start-date] [options]

Arguments:
  start-date        Starting date for the week (ISO format: YYYY-MM-DD)
                    If omitted, uses next Monday from today

Options:
  --next-week, -n   Target next week instead of the current week
  --seed=NUMBER     Use a seed for deterministic random selection (default: random)
  --replace, -r     Replace existing meals for these dates (default: keep existing)
  --dry-run, -d     Show what would be generated without writing to file
  --help, -h        Show this help message

Examples:
  node scripts/generate-week.js
  node scripts/generate-week.js 2026-03-23
  node scripts/generate-week.js 2026-03-23 --seed=42
  node scripts/generate-week.js --replace --seed=123
  node scripts/generate-week.js --dry-run
`);
}

// Main execution
function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  try {
    // Determine start date
    let startDate;
    if (options.startDate) {
      startDate = parseDate(options.startDate);
    } else if (options.nextWeek) {
      startDate = getNextMonday(new Date());
    } else {
      startDate = getCurrentMonday(new Date());
    }
    
    console.log(`Generating meals for week starting ${formatDate(startDate)}`);
    if (options.seed !== null) console.log(`Using seed: ${options.seed} (deterministic)`);

    // Generate candidate meals
    const newMeals = generateWeek(startDate, options.seed);

    // Resolve the final persisted state (write, or simulate without writing)
    const finalMeals = options.dryRun
      ? updateMealsJson(newMeals, { ...options, simulate: true })
      : updateMealsJson(newMeals, options);

    // Show what will actually be displayed to the user
    console.log('\n📅 Final meals for the week:\n');
    Object.keys(newMeals).forEach(date => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`  ${dayName}, ${date}:`);
      (finalMeals[date] || []).forEach(m => console.log(`    [${m.label.padEnd(9)}] ${m.title}`));
    });

    if (options.dryRun) {
      console.log('\n✨ Dry run — no files were modified');
    } else {
      console.log('\n✅ meals.json updated');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
