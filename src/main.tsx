import React, { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import WeekBanner from './components/WeekBanner'
import DayDetail from './components/DayDetail'
import './styles.css'
import useStore from './store'

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

  // build week keys (still useful for any future needs)
  const weekDates = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(monday, i)), [monday])

  // selected date and meals are now read from the Zustand store inside components
  const selectedISO = useStore((s) => s.selectedISO)

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", margin: 0 }}>This Week's Table</h1>
      <p style={{ marginTop: 6, color: '#666' }}>Seven days of meals. Tap a day to see the detail.</p>
      <WeekBanner />
      <DayDetail />
    </div>
  )
}

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
