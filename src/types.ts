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
