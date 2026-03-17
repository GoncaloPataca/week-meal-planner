import create from 'zustand'
import { StateSelector } from 'zustand'
import { Meal } from './types'
import mealsData from './data/meals.json'

type MealsMap = Record<string, Meal[]>

interface AppState {
  selectedISO: string
  meals: MealsMap
  setSelectedDate: (d: Date) => void
  setMeals: (m: MealsMap) => void
}

export const useStore = create<AppState>((set) => ({
  selectedISO: new Date().toISOString().slice(0, 10),
  meals: mealsData as MealsMap,
  setSelectedDate: (d: Date) => set({ selectedISO: d.toISOString().slice(0, 10) }),
  setMeals: (m: MealsMap) => set({ meals: m })
}))

export default useStore
