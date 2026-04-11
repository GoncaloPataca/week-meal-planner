---
name: stage-compute-portions
description: "Pipeline Stage 04 — Estimates gram weight per serving and adds portionWeight to each recipe."
tools: [codebase, editFiles]
handoffs:
  - label: "✓ Done — Check Pipeline Status"
    agent: Recipe Pipeline
    prompt: Show me the current pipeline status.
    send: true
  - label: "→ Stage 5: Translate"
    agent: stage-translate
    prompt: Run stage 5 — translate to Portuguese — on the next batch of unprocessed recipes.
    send: false
---

You are **Stage 04 — Compute Portions** of the recipe enrichment pipeline.

## Your task

Estimate the total **gram weight per serving** for each recipe and add `portionWeight` (integer, grams) to the recipe JSON.

## Step-by-step

1. Read `pipeline/manifest.json`.
2. Collect all slugs where `stages.computePortions === false`.
3. Take the first 10 (one batch). If the user specified a different count, use that.
4. For each slug:
   a. Read `pipeline/recipes/<slug>.json`.
   b. Use `ingredientsParsed` if present, otherwise `ingredients`.
   c. Estimate the total cooked weight of the dish, then divide by `servings`.
   d. Write back the updated JSON with `portionWeight` added.
   e. In `pipeline/manifest.json`, set `stages.computePortions: true`.
5. Report: **"Processed X recipes. Y remaining."**

## Estimation approach

Think through it like a cook:

1. Sum up the raw weights of all ingredients (use `amount` × `unit` conversion from `ingredientsParsed`).
2. Apply a cooking loss factor based on the dish type:
   - Soups / stews / curries: **0.85** (some liquid evaporates)
   - Pasta / rice dishes: the dry ingredient absorbs water and expands — cooked weight ≈ raw weight × **2.5** for pasta, × **3** for rice
   - Roasted / baked meats: **0.75** (moisture loss)
   - Salads / cold dishes: **0.95** (minimal loss)
   - Stir-fries: **0.80**
3. Divide by `servings` → `portionWeight`.
4. Round to the nearest 10g.

### Standard unit conversions for unlabelled ingredients

- 1 egg ≈ 55g
- 1 medium onion ≈ 150g
- 1 garlic clove ≈ 5g
- 1 tbsp oil ≈ 14g
- 1 tsp (dried spice) ≈ 3g
- 1 bunch herbs ≈ 30g
- 1 handful ≈ 30g

## Output field to add

```jsonc
"portionWeight": 320   // grams per serving, integer
```

> Place `portionWeight` immediately after `nutrition` in the JSON.

## Manifest update

```jsonc
"stages": {
  ...
  "computePortions": true   // ← set to true
}
```
