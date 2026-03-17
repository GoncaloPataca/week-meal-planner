import React from 'react'
import useStore from '../store'
import { Tab } from '@headlessui/react'

interface Props {
  selectedDate?: Date
  onSelect?: (date: Date) => void
}

function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay() // 0 (Sun) - 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day // adjust so Monday is first
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

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function sameDay(a?: Date, b?: Date) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function WeekBanner(_: Props): JSX.Element {
  const selectedISO = useStore((s) => s.selectedISO)
  const setSelectedDate = useStore((s) => s.setSelectedDate)

  const today = new Date()
  const monday = getMonday(today)

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(monday, i)
    return {
      date,
      label: dayNames[i],
      dayNumber: date.getDate(),
      iso: date.toISOString().slice(0, 10)
    }
  })

  const mealsMap = useStore((s) => s.meals)

  // Predefined color palette for meal dots
  const mealColors = ['#EA580C', '#059669', '#7C3AED', '#E11D48', '#0EA5E9', '#F59E0B']

  const selectedIndex = days.findIndex((d) => d.iso === selectedISO)

  return (
    <section className="week-banner">
      <Tab.Group selectedIndex={selectedIndex >= 0 ? selectedIndex : 0} onChange={(i) => setSelectedDate(days[i].date)}>
        <Tab.List className="week-banner-inner">
          {days.map((d) => {
            const meals = mealsMap[d.iso] ?? []
            const dots = meals.slice(0, 3).map((_, i) => mealColors[i % mealColors.length])

            return (
              <Tab key={d.iso} className={({ selected }) => `day-card ${selected ? 'selected' : ''}`}>
                <div className="day-label">{d.label}</div>
                <div className="day-dots">
                  {dots.map((c, i) => (
                    <span key={i} className="day-dot" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="day-number">{d.dayNumber}</div>
                <div className="day-count">{meals.length} meals</div>
              </Tab>
            )
          })}
        </Tab.List>
      </Tab.Group>
    </section>
  )
}
