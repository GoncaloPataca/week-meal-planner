import React from 'react'
import useStore from '../store'

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
      dayNumber: date.getDate()
    }
  })

  return (
    <section className="week-banner">
      <div className="week-banner-inner">
        {days.map((d) => (
          <button
            key={d.label}
            className={`day-card ${sameDay(d.date, new Date(selectedISO)) ? 'selected' : ''}`}
            onClick={() => setSelectedDate(d.date)}
          >
            <div className="day-label">{d.label}</div>
            <div className="day-number">{d.dayNumber}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
