import React from 'react'
import { Meal } from '../types'
import MealCard from './MealCard'

export default function DayDetail({ date, meals }: { date: Date; meals: Meal[] }) {
  const dayName = date.toLocaleDateString(undefined, { weekday: 'long' })
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
