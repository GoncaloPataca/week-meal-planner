export interface Ingredient {
  name: string
  amount?: string
}

export interface Meal {
  id: string
  label: string // e.g. "Morning", "Evening", "Dinner"
  title: string
  time?: string // e.g. "08:00", "12:30", "19:00"
  servings?: number
  prep?: string // e.g. "5m"
  cook?: string // e.g. "10m"
  tags?: string[]
  ingredients?: Ingredient[]
  steps?: string[]
  notes?: string
}
