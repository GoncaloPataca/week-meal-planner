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

function getInitialDateFromHash(): { selectedISO: string; viewedWeekStart: Date } {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(hash)) {
    const [y, m, d] = hash.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (!isNaN(date.getTime())) {
      return { selectedISO: hash, viewedWeekStart: getMonday(date) }
    }
  }
  return { selectedISO: toISO(today), viewedWeekStart: mondayOfCurrentWeek }
}

const initial = getInitialDateFromHash()

function syncHash(iso: string) {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', '#' + iso)
  }
}

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
  selectedISO: initial.selectedISO,
  viewedWeekStart: initial.viewedWeekStart,
  meals: mealsData as MealsMap,
  setSelectedDate: (d: Date) => {
    const iso = toISO(d)
    syncHash(iso)
    set({ selectedISO: iso })
  },
  setMeals: (m: MealsMap) => set({ meals: m }),
  goToPreviousWeek: () => set((state) => {
    const newWeekStart = new Date(state.viewedWeekStart)
    newWeekStart.setDate(newWeekStart.getDate() - 7)
    const iso = toISO(newWeekStart)
    syncHash(iso)
    return { viewedWeekStart: newWeekStart, selectedISO: iso }
  }),
  goToNextWeek: () => set((state) => {
    const newWeekStart = new Date(state.viewedWeekStart)
    newWeekStart.setDate(newWeekStart.getDate() + 7)
    const iso = toISO(newWeekStart)
    syncHash(iso)
    return { viewedWeekStart: newWeekStart, selectedISO: iso }
  }),
  goToCurrentWeek: () => {
    const iso = toISO(today)
    syncHash(iso)
    set({ viewedWeekStart: mondayOfCurrentWeek, selectedISO: iso })
  },
}))

export default useStore
