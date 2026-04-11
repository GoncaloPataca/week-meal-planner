import create from 'zustand'
import { StateSelector } from 'zustand'
import { Meal } from './types'
import mealsData from './data/meals.json'

type MealsMap = Record<string, Meal[]>

export function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const today = new Date()
const mondayOfCurrentWeek = getMonday(today)

interface AppState {
  selectedISO: string
  viewedWeekStart: Date
  meals: MealsMap
  setSelectedDate: (d: Date) => void
  setMeals: (m: MealsMap) => void
  goToPreviousWeek: () => void
  goToNextWeek: () => void
  goToCurrentWeek: () => void
}

export const useStore = create<AppState>((set, get) => ({
  selectedISO: toISO(today),
  viewedWeekStart: mondayOfCurrentWeek,
  meals: mealsData as MealsMap,
  setSelectedDate: (d: Date) => set({ selectedISO: toISO(d) }),
  setMeals: (m: MealsMap) => set({ meals: m }),
  goToPreviousWeek: () => set((state) => {
    const newWeekStart = new Date(state.viewedWeekStart)
    newWeekStart.setDate(newWeekStart.getDate() - 7)
    return { 
      viewedWeekStart: newWeekStart,
      selectedISO: toISO(newWeekStart)
    }
  }),
  goToNextWeek: () => set((state) => {
    const newWeekStart = new Date(state.viewedWeekStart)
    newWeekStart.setDate(newWeekStart.getDate() + 7)
    return { 
      viewedWeekStart: newWeekStart,
      selectedISO: toISO(newWeekStart)
    }
  }),
  goToCurrentWeek: () => set({ 
    viewedWeekStart: mondayOfCurrentWeek,
    selectedISO: toISO(today)
  }),
}))

export default useStore
