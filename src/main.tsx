import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import WeekBanner from './components/WeekBanner'
import DayDetail from './components/DayDetail'
import './styles.css'
import { Meal } from './types'
import mealsData from './data/meals.json'

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

export default function App() {
  const today = new Date()
  const monday = getMonday(today)

  // build week keys
  const weekDates = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(monday, i)), [monday])

  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const selectedKey = selectedDate.toISOString().slice(0, 10)
  // mealsData is a Record<string, Meal[]>
  const mealsForSelected = (mealsData as Record<string, Meal[]>)[selectedKey] ?? []

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
