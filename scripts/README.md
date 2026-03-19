# Meal Generation Scripts

## generate-week.js

Automatically generates a week of random breakfast recipes and updates `meals.json`.

### Quick Usage

```bash
# Generate next Monday's week with random recipes
npm run generate:week

# Generate and replace next Monday's week with random recipes
npm run generate:next-week

# Generate a specific week (Monday-Sunday)
node scripts/generate-week.js 2026-03-23

# Generate with deterministic seed (same seed = same recipes)
node scripts/generate-week.js 2026-03-30 --seed=42

# Replace existing meals for the week
node scripts/generate-week.js 2026-03-30 --replace

# Preview without modifying files
node scripts/generate-week.js --dry-run
```

### Options

- **`[start-date]`**: Starting date for the week (ISO format: YYYY-MM-DD)
  - If omitted, uses next Monday from today
  - Example: `2026-03-23`

- **`--seed=NUMBER`**: Use a seed for deterministic random selection
  - Same seed always produces same recipe selection
  - Useful for reproducible meal plans
  - Example: `--seed=42`

- **`--replace, -r`**: Replace existing meals for these dates
  - By default, existing meals are preserved
  - Use this to regenerate a week

- **`--dry-run, -d`**: Show what would be generated without writing to file
  - Perfect for testing and previewing
  - Displays JSON output

- **`--help, -h`**: Show help message

### Features

- **Deterministic Random Selection**: Use `--seed` for reproducible meal plans
- **Safe by Default**: Preserves existing meals unless `--replace` is used
- **Complete Meal Data**: Includes all recipe details, images, and URLs
- **Automatic Date Calculation**: Defaults to next Monday if no date provided
- **Sorted Output**: meals.json is always sorted by date
- **7-Day Week**: Generates Monday through Sunday (7 breakfasts)

### Examples

```bash
# Generate next week with specific seed
node scripts/generate-week.js --seed=123 --replace

# Preview what would be generated for April
node scripts/generate-week.js 2026-04-06 --dry-run

# Generate multiple weeks
node scripts/generate-week.js 2026-03-23 --seed=1 --replace
node scripts/generate-week.js 2026-03-30 --seed=2 --replace
node scripts/generate-week.js 2026-04-06 --seed=3 --replace

# Keep existing meals but add a new week
node scripts/generate-week.js 2026-04-13
```

### How It Works

1. **Loads Recipe Data**: Uses the 10 breakfast recipes from `breakfastService.ts`
2. **Shuffles**: Randomly (or deterministically with seed) shuffles recipes
3. **Selects 7**: Picks 7 recipes for the week (one per day)
4. **Generates Meals**: Creates complete meal entries with all metadata
5. **Updates meals.json**: Merges with existing data, sorted by date

### Recipe Selection

The script selects from these 10 breakfast recipes:

1. Panquecas de Banana e Aveia sem Glúten
2. Overnight Oats de Frutos Vermelhos
3. Smoothie Bowl Verde Energizante
4. Panquecas de Batata-Doce e Canela
5. Pudim de Chia com Manga Fresca
6. Smoothie Cremoso de Abacate e Cacau
7. Tapioca Recheada com Ovo e Espinafres
8. Papas de Aveia com Maçã Caramelizada e Nozes
9. Açaí Bowl Energizante com Granola
10. Ovos Assados em Abacate

Each meal includes:
- Full ingredients list with amounts
- Step-by-step cooking instructions
- Tags (dietary info)
- Prep and cook times
- Servings and calories
- Recipe URL and image

### Tips

- **Use seeds for meal planning**: Pick different seeds for variety across weeks
- **Dry run first**: Always test with `--dry-run` before replacing meals
- **Backup**: The script preserves existing non-breakfast meals
- **Automation**: Run weekly via cron or GitHub Actions for automated meal planning

### Future Enhancements

Potential improvements:
- Support for lunch and dinner generation
- Dietary preference filtering (vegan, high-protein, etc.)
- Nutritional balance across the week
- Meal variety constraints (no same recipe within X days)
- Integration with external recipe APIs
