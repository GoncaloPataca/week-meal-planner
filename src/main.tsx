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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="text-4xl lg:text-5xl font-serif font-semibold text-slate-900 mb-2">
            This Week's Table
          </h1>
          <p className="text-base text-slate-600">
            Seven days of meals. Tap a day to see the detail.
          </p>
        </header>
        <WeekBanner />
        <DayDetail />
      </div>
    </div>
  )
}

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
