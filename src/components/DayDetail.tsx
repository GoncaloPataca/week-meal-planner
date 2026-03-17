import React from 'react'
import { Meal } from '../types'
import MealCard from './MealCard'
import useStore from '../store'

export default function DayDetail({ date }: { date?: Date }) {
  const selectedISO = useStore((s) => s.selectedISO)
  const mealsMap = useStore((s) => s.meals)

  const iso = date ? date.toISOString().slice(0, 10) : selectedISO
  const currentDate = date ?? new Date(iso)
  const meals: Meal[] = mealsMap[iso] ?? []

  const dayName = currentDate.toLocaleDateString(undefined, { weekday: 'long' })
  return (
    <section className="day-detail">
      <h2 className="day-detail-title">{dayName} <span className="muted">{meals.length} meals planned</span></h2>
      <div className="meals-list">
        {meals.map((m) => (
          <MealCard key={m.id} meal={m} />
        ))}
      </div>
    </section>
  )
}
