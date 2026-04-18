export interface Ingredient {
  name: string
  amount?: string
}

/**
 * A single parsed ingredient entry as stored in current_meals.json.
 * `id` is a stable slug keyed into ingredient-availability.json.
 * Display name and unit label are resolved at render time from the
 * ingredient-availability lookup and the `units` i18n namespace.
 */
export interface ParsedIngredient {
  /** Stable slug — e.g. "xo-sauce", "spring-onion" */
  id: string
  amount: number | null
  /** EN unit key — e.g. "tbsp", "g", "tsp". Resolved via t('units.<unitId>'). */
  unitId?: string | null
  note?: string
  optional?: boolean
}

/**
 * Entry in src/data/ingredient-availability.json.
 * Keyed by the same slug as ParsedIngredient.id.
 * Names live separately in src/data/translations.json under `ingredient:<id>`.
 */
export interface IngredientAvailability {
  continente: boolean | null
  auchan:     boolean | null
  pingodoce:  boolean | null
  lidl:       boolean | null
  aldi:       boolean | null
}

/**
 * A single entry in src/data/translations.json.
 * Key format: `ingredient:<slug>`, `recipe:<slug>:name`, `recipe:<slug>:step:<n>`, etc.
 * Each value maps a language code to its translation string.
 */
export type TranslationEntry = Record<string, string>

export interface Meal {
  id: string
  label: string // e.g. "Morning", "Evening", "Dinner"
  title: string
  time?: string // e.g. "08:00", "12:30", "19:00"
  servings?: number
  prep?: string | number // e.g. "5m", "10 min", or raw minutes as number
  cook?: string | number // e.g. "10m", "25 minutes", or raw minutes as number
  tags?: string[]
  ingredients?: Ingredient[]
  steps?: string[]
  notes?: string
  url?: string // URL to the original recipe
  image?: string // Path to local image file
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}
