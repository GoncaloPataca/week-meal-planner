import React from 'react'

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
  return r
}

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeekBanner(): JSX.Element {
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
          <div className="day-card" key={d.label}>
            <div className="day-label">{d.label}</div>
            <div className="day-number">{d.dayNumber}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
