---
applyTo: "pipeline/**"
---

# Recipe Pipeline — Shared Context

## Folder layout

```
pipeline/
  recipes/      ← 277 canonical recipe JSON files (one per unique slug)
  images/       ← locally downloaded images land here as <slug>.jpg
  manifest.json ← tracks which pipeline stages have run on each recipe
```

## Recipe JSON shape (grows with each stage)

```jsonc
{
  // ── always present after seed ──────────────────────────────────
  "name": "Marry Me Chicken Orzo",
  "url": "https://www.mob.co.uk/recipes/marry-me-chicken-orzo",
  "image": "https://files.mob-cdn.co.uk/recipes/2024/09/220A9848.png",
  "servings": 3,
  "cookTime": "40 minutes",
  "ingredients": ["1 Onion", "350g Chicken Breast", "..."],   // flat raw strings
  "steps": ["Finely dice the onion...", "..."],
  "tags": ["dinner", "pasta", "chicken", "mob-co-uk"],

  // ── added by stage 01 (structureIngredients) ──────────────────
  "ingredientsParsed": [
    { "amount": 1, "unit": null, "item": "Onion" },
    { "amount": 350, "unit": "g", "item": "Chicken Breast" }
  ],

  // ── added by stage 02 (downloadImages) ───────────────────────
  "imagePath": "pipeline/images/marry-me-chicken-orzo.jpg",

  // ── added by stage 03 (enrichNutrition) ──────────────────────
  "nutrition": {
    "kcal": 620, "protein": 38, "carbs": 52, "fat": 18, "fiber": 4
  },

  // ── added by stage 04 (computePortions) ──────────────────────
  "portionWeight": 320,    // grams per serving (estimated)

  // ── added by stage 05 (translate) ────────────────────────────
  "i18n": {
    "pt": {
      "name": "Frango Orzo 'Casa-te Comigo'",
      "ingredients": ["1 Cebola", "350g Peito de Frango", "..."],
      "steps": ["Pique finamente a cebola...", "..."]
    }
  }
}
```

## Manifest structure

```jsonc
// pipeline/manifest.json
{
  "marry-me-chicken-orzo": {
    "slug": "marry-me-chicken-orzo",
    "source": "src/data/recipes/mob/dinners/marry-me-chicken-orzo.json",
    "seededAt": "2026-03-30T22:01:17.368Z",
    "stages": {
      "seed": true,
      "structureIngredients": false,
      "enrichNutrition": false,
      "downloadImages": false,
      "translate": false,
      "computePortions": false
    }
  }
}
```

## Rules for all pipeline agents

1. **Always read the manifest first** to find which recipes need the current stage.
2. **Process in batches of 10** — never try to load all 277 at once.
3. **In-place enrichment** — add new fields to the existing recipe JSON; never remove existing fields.
4. **Update the manifest** after each recipe is processed (set the stage flag to `true`).
5. **Source files are read-only** — `src/data/recipes/mob/` is the reference copy; never modify it.
6. **Report progress** — after each batch, tell the user how many are done and how many remain.
