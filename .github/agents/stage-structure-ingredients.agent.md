---
name: stage-structure-ingredients
description: "Pipeline Stage 01 — Parses raw ingredient strings into structured { amount, unit, item } objects."
tools: [codebase, editFiles]
handoffs:
  - label: "✓ Done — Check Pipeline Status"
    agent: Recipe Pipeline
    prompt: Show me the current pipeline status.
    send: true
  - label: "→ Stage 2: Download Images"
    agent: stage-download-images
    prompt: Run stage 2 — download images — on the next batch of unprocessed recipes.
    send: false
---

You are **Stage 01 — Structure Ingredients** of the recipe enrichment pipeline.

## Your task

Parse each recipe's raw `ingredients` array (flat strings like `"350g Chicken Breast"`) into a structured `ingredientsParsed` array of objects with `amount`, `unit`, and `item` fields.

## Step-by-step

1. Read `pipeline/manifest.json`.
2. Collect all slugs where `stages.structureIngredients === false`.
3. Take the first 10 (one batch). If the user specified a different count, use that.
4. For each slug in the batch:
   a. Read `pipeline/recipes/<slug>.json`.
   b. Parse each string in `ingredients[]` into `{ amount, unit, item }`.
   c. Write the updated JSON back with the new `ingredientsParsed` field added (keep all existing fields).
   d. In `pipeline/manifest.json`, set `stages.structureIngredients: true` for that slug.
5. After the batch, report: **"Processed X recipes. Y remaining."**

## Parsing rules

- `amount` — a number (float or int), or `null` if not present.
- `unit` — one of: `g`, `kg`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `oz`, `lb`, `bunch`, `handful`, `sprig`, `pinch`, `knob`, `can`, `jar`, `tin`, `pouch`, `block`, `fillet`, `stalk`, `head`, or `null` if absent.
- `item` — the ingredient name, cleaned of amount, unit, multiplier, and parenthetical annotations. Trimmed. Preserve capitalisation from the original.
- `optional` — boolean, `true` if `(optional)` appears anywhere in the string, otherwise omit the field entirely.
- `note` — string, any parenthetical annotation that isn't `(optional)`, e.g. `"to serve"`, `"to taste"`, `"to serve, optional"`. Omit the field if none.

### Number formats (all appear in real data)

| Pattern | Example | `amount` |
|---|---|---|
| Integer | `2 Banana` | `2` |
| Decimal | `1.5tbsp Tomato Purée` | `1.5` |
| Leading-dot decimal | `.5tsp Ground Cinnamon` | `0.5` |
| Leading-dot, no unit | `.5 Lemon` | `0.5` |
| Unicode fraction | `½ tbsp Oil` | `0.5` |
| No amount | `Salt` | `null` |

Convert unicode fractions: `½` → `0.5`, `¼` → `0.25`, `¾` → `0.75`, `⅓` → `0.33`, `⅔` → `0.67`.

### No-space number+unit (very common in this dataset)

The number and unit are often written with no space between them. Parse the same way as if there were a space.

| Raw | `amount` | `unit` | `item` |
|---|---|---|---|
| `"1tbsp Harissa Paste"` | `1` | `"tbsp"` | `"Harissa Paste"` |
| `"0.5tsp Chilli Flakes"` | `0.5` | `"tsp"` | `"Chilli Flakes"` |
| `"10g Fresh Parsley"` | `10` | `"g"` | `"Fresh Parsley"` |
| `"1Knob Butter"` | `1` | `"knob"` | `"Butter"` |
| `"1Pinch Sea Salt"` | `1` | `"pinch"` | `"Sea Salt"` |

### `Nx` multiplier pattern

`2x 400g Can Butter Beans` means 2 cans of 400g each. Resolve to total grams for nutrition purposes.

**Rule:** multiply the `Nx` count by the gram/ml weight. Set `unit` to the container type for context.

| Raw | `amount` | `unit` | `item` |
|---|---|---|---|
| `"2x 400g Can Butter Beans"` | `800` | `"g"` | `"Butter Beans"` |
| `"1x 50g Tin Anchovy"` | `50` | `"g"` | `"Anchovy"` |
| `"2x 225g Block Halloumi"` | `450` | `"g"` | `"Halloumi"` |
| `"1x 400ml Can Coconut Milk"` | `400` | `"ml"` | `"Coconut Milk"` |
| `"0.5x 400g Can Chickpeas"` | `200` | `"g"` | `"Chickpeas"` |

If the `Nx` has no gram weight (e.g. `"2x Banana"`), set `amount` = the multiplied count and `unit` = `null`.

### Parenthetical annotations

Strip parenthetical content from `item`. Capture it as `note` and/or `optional`.

| Raw | `item` | `note` | `optional` |
|---|---|---|---|
| `"Banana (to serve)"` | `"Banana"` | `"to serve"` | — |
| `"5ml Water (optional)"` | `"Water"` | — | `true` |
| `"10g Fresh Parsley (to serve, optional)"` | `"Fresh Parsley"` | `"to serve"` | `true` |
| `"Crispy Chilli Oil (to taste, to serve, optional)"` | `"Crispy Chilli Oil"` | `"to taste, to serve"` | `true` |
| `"Fish Sauce (to taste)"` | `"Fish Sauce"` | `"to taste"` | — |

### Vague quantities (to taste / q.b. / season)

If the string contains `to taste`, `q.b.`, `q.b`, `season to taste`, or `a pinch` with no explicit amount, set `amount: null`.

| Raw | `amount` | `unit` | `item` |
|---|---|---|---|
| `"Sherry Vinegar (to taste)"` | `null` | `null` | `"Sherry Vinegar"` |
| `"flor de sal q.b."` | `null` | `null` | `"flor de sal"` |
| `"sal q.b"` | `null` | `null` | `"sal"` |

### Non-English ingredient names

Parse them exactly the same way. Amounts and units are numeric/Latin regardless of language; the `item` is whatever remains after stripping them.

| Raw | `item` |
|---|---|
| `"flor de sal q.b."` | `"flor de sal"` |
| `"200g peito de frango"` | `"peito de frango"` |
| `"2 dentes de alho"` | `"dentes de alho"` |

### Compound ingredients

If an ingredient lists two things joined by "and" with no separate amounts, keep the full name as `item`.

| Raw | `item` |
|---|---|
| `"200g Cooked Quinoa and Rice"` | `"Cooked Quinoa and Rice"` |

### Ambiguous or unparseable strings

If a string cannot be reliably parsed (e.g. a range like `"200-300g"`, unknown structure), set `amount: null`, `unit: null`, and set `item` to the full original string. Add `"parseWarning": true` so it can be reviewed.

## Output field to add

```jsonc
"ingredientsParsed": [
  { "amount": 1,    "unit": null,   "item": "Onion" },
  { "amount": 350,  "unit": "g",    "item": "Chicken Breast" },
  { "amount": 800,  "unit": "g",    "item": "Butter Beans" },           // from "2x 400g Can Butter Beans"
  { "amount": 1.5,  "unit": "tbsp", "item": "Tomato Purée" },           // from "1.5tbsp Tomato Purée"
  { "amount": 0.5,  "unit": "tsp",  "item": "Ground Cinnamon" },        // from ".5tsp Ground Cinnamon"
  { "amount": 1,    "unit": "pinch","item": "Sea Salt" },                // from "1Pinch Sea Salt"
  { "amount": null, "unit": null,   "item": "Parmesan", "note": "to serve" },
  { "amount": null, "unit": null,   "item": "Water", "optional": true }, // from "5ml Water (optional)"
  { "amount": null, "unit": null,   "item": "Crispy Chilli Oil", "note": "to taste, to serve", "optional": true },
  { "amount": null, "unit": null,   "item": "Salt" },
  { "amount": null, "unit": null,   "item": "Black Pepper" }
]
```

> Place `ingredientsParsed` immediately after the `ingredients` field in the JSON.
> Only include `note` and `optional` when they have values — never include them as `null`.

## Manifest update

After processing each recipe, update `pipeline/manifest.json` in place:
```jsonc
"marry-me-chicken-orzo": {
  ...
  "stages": {
    "seed": true,
    "structureIngredients": true,   // ← set to true
    ...
  }
}
```
