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
    <section className="mb-12">
      <Tab.Group selectedIndex={selectedIndex >= 0 ? selectedIndex : 0} onChange={(i) => setSelectedDate(days[i].date)}>
        <Tab.List className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((d) => {
            const meals = mealsMap[d.iso] ?? []
            const dots = meals.slice(0, 3).map((_, i) => mealColors[i % mealColors.length])
            const isToday = sameDay(d.date, today)

            return (
              <Tab
                key={d.iso}
                className={({ selected }) => `
                  flex-shrink-0 relative flex flex-col items-center gap-2 px-4 py-3 min-w-[100px]
                  rounded-2xl border-2 transition-all duration-200
                  ${selected 
                    ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-100' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                `}
              >
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {d.label}
                </div>
                {isToday && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></div>
                )}
                {dots.length > 0 && (
                  <div className="flex gap-1.5">
                    {dots.map((color, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
                <div className="text-2xl font-bold text-slate-900">
                  {d.dayNumber}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                </div>
              </Tab>
            )
          })}
        </Tab.List>
      </Tab.Group>
    </section>
  )
}
