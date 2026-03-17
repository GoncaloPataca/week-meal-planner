import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import WeekBanner from './components/WeekBanner'
import DayDetail from './components/DayDetail'
import './styles.css'
import { Meal } from './types'

function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, days: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  r.setHours(0, 0, 0, 0)
  return r
}

const sampleMeals: Record<string, Meal[]> = {}

// sample: Tuesday (index 1)
const tuesdayMeal1: Meal = {
  id: 'oats-1',
  label: 'Morning',
  title: 'Berry Overnight Oats',
  servings: 2,
  prep: '5m',
  cook: '0m',
  tags: ['Vegetarian'],
  ingredients: [
    { amount: '1 cup', name: 'rolled oats' },
    { amount: '1 cup', name: 'milk' },
    { amount: '1/2 cup', name: 'Greek yoghurt' },
    { amount: '1 tbsp', name: 'honey' },
    { amount: '1/2 cup', name: 'mixed berries' }
  ],
  steps: ['Combine oats, milk, yoghurt, and honey in a jar.', 'Refrigerate overnight.', 'Top with berries before serving.'],
  notes: 'Prepare the night before — grab and go.'
}

const tuesdayMeal2: Meal = {
  id: 'rice-1',
  label: 'Evening',
  title: 'Veggie Fried Rice',
  servings: 2,
  prep: '10m',
  cook: '12m',
  tags: ['Vegan'],
  ingredients: [
    { amount: '2 cups', name: 'cooked rice' },
    { amount: '1 cup', name: 'mixed vegetables' },
    { amount: '2 tbsp', name: 'soy sauce' }
  ],
  steps: ['Sauté vegetables.', 'Add rice and soy sauce, stir fry until heated.'],
}

export default function App() {
  const today = new Date()
  const monday = getMonday(today)

  // build week keys
  const weekDates = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(monday, i)), [monday])

  // assign sample meals to Tuesday (index 1)
  weekDates.forEach((d, i) => {
    const key = d.toISOString().slice(0, 10)
    if (i === 1) sampleMeals[key] = [tuesdayMeal1, tuesdayMeal2]
    else sampleMeals[key] = []
  })

  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const selectedKey = selectedDate.toISOString().slice(0, 10)
  const mealsForSelected = sampleMeals[selectedKey] ?? []

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", margin: 0 }}>This Week's Table</h1>
      <p style={{ marginTop: 6, color: '#666' }}>Seven days of meals. Tap a day to see the detail.</p>
      <WeekBanner selectedDate={selectedDate} onSelect={(d) => setSelectedDate(d)} />
      <DayDetail date={selectedDate} meals={mealsForSelected} />
    </div>
  )
}

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
