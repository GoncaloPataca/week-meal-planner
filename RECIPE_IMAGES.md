# Recipe Images and URLs

## Overview

All meals in the app now support:
- **Recipe Images**: Display a thumbnail image for each meal
- **Recipe URLs**: Link to the original recipe source

## Implementation

### 1. Type Definition

The `Meal` interface in `src/types.ts` now includes:

```typescript
export interface Meal {
  // ... existing fields
  url?: string      // URL to the original recipe
  image?: string    // Path to local image file
}
```

### 2. Images Location

Recipe images are stored in:
```
/public/images/recipes/
```

Images are served from the root path: `/images/recipes/filename.jpg`

### 3. Adding Images to Meals

When adding a meal to `meals.json`, include the `url` and `image` fields:

```json
{
  "id": "breakfast-1",
  "label": "Morning",
  "title": "Panquecas de Banana e Aveia sem Glúten",
  "url": "https://pequeno-almoco.chefantonioduarte.com/#panquecas-de-banana-e-aveia-sem-gluten",
  "image": "/images/recipes/panquecas-banana-aveia.jpg",
  "ingredients": [...],
  "steps": [...]
}
```

### 4. Display

The `MealCard` component automatically:
- Shows a 80x80px thumbnail image on the left (if `image` is provided)
- Displays a "View original recipe" link with external icon (if `url` is provided)
- Opens the URL in a new tab when clicked

### 5. Breakfast Recipe Images

All 10 breakfast recipes from Chef António Duarte have been downloaded:

1. `panquecas-banana-aveia.jpg` - Panquecas de Banana e Aveia sem Glúten
2. `overnight-oats.jpg` - Overnight Oats de Frutos Vermelhos
3. `smoothie-bowl-verde.jpg` - Smoothie Bowl Verde Energizante
4. `panquecas-batata-doce.jpg` - Panquecas de Batata-Doce e Canela
5. `pudim-chia-manga.jpg` - Pudim de Chia com Manga Fresca
6. `smoothie-abacate-cacau.jpg` - Smoothie Cremoso de Abacate e Cacau
7. `tapioca-ovo-espinafres.jpg` - Tapioca Recheada com Ovo e Espinafres
8. `papas-aveia-maca.jpg` - Papas de Aveia com Maçã Caramelizada e Nozes
9. `acai-bowl.jpg` - Açaí Bowl Energizante com Granola
10. `ovos-abacate.jpg` - Ovos Assados em Abacate

### 6. Breakfast Service Metadata

The `breakfastService.ts` includes a `recipeMetadata` object mapping recipe IDs to their URLs and images:

```typescript
export const recipeMetadata: Record<number, { url: string; image: string }> = {
  1: { 
    url: "https://pequeno-almoco.chefantonioduarte.com/#panquecas-de-banana-e-aveia-sem-gluten", 
    image: "/images/recipes/panquecas-banana-aveia.jpg" 
  },
  // ... more recipes
};
```

## Downloading More Images

To download additional images from Chef António Duarte's website:

```bash
cd public/images/recipes
curl -o recipe-name.jpg "https://pequeno-almoco.chefantonioduarte.com/recipes/recipe-name.jpg"
```

Or use the included `download_images.sh` script.

## Best Practices

1. **Image Format**: Use JPEG for photos (smaller file size)
2. **Image Size**: Images should be at least 200x200px for quality display
3. **File Naming**: Use lowercase with hyphens (e.g., `panquecas-banana-aveia.jpg`)
4. **Attribution**: Include recipe source in the `notes` field
5. **URLs**: Use anchor links (#) to specific recipe sections when possible

## Translation

The "View original recipe" link is translated:
- **English**: "View original recipe"
- **Portuguese**: "Ver receita original"

Add translations in `src/locales/en.json` and `src/locales/pt.json`:

```json
{
  "meal": {
    "viewOriginal": "View original recipe"
  }
}
```

## Example: Complete Meal Entry

```json
{
  "id": "breakfast-1",
  "label": "Morning",
  "time": "08:00",
  "title": "Panquecas de Banana e Aveia sem Glúten",
  "servings": 2,
  "prep": "5 min",
  "cook": "10 min",
  "tags": ["sem glúten", "sem lactose", "sem açúcar", "rápido"],
  "ingredients": [
    { "amount": "2 unidades", "name": "Banana madura" },
    { "amount": "1 xícara (80g)", "name": "Aveia em flocos" }
  ],
  "steps": [
    "Esmague as bananas num recipiente.",
    "Adicione os ovos e bata bem."
  ],
  "notes": "Pequeno-almoço do Chef António Duarte • 375 calorias por porção",
  "url": "https://pequeno-almoco.chefantonioduarte.com/#panquecas-de-banana-e-aveia-sem-gluten",
  "image": "/images/recipes/panquecas-banana-aveia.jpg"
}
```
