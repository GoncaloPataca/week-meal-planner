export interface Ingredient {
  name: string
  amount?: string
}

export interface Meal {
  id: string
  label: string // e.g. "Morning", "Evening", "Dinner"
  title: string
  servings?: number
  prep?: string // e.g. "5m"
  cook?: string // e.g. "10m"
  tags?: string[]
  ingredients?: Ingredient[]
  steps?: string[]
  notes?: string
}
