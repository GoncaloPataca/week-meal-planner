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
    <section className="space-y-6">
      <div className="flex items-baseline gap-3">
        <h2 className="text-3xl font-serif font-semibold text-slate-900">
          {dayName}
        </h2>
        <span className="text-sm text-slate-500 font-medium">
          {meals.length} {meals.length === 1 ? 'meal' : 'meals'} planned
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meals.map((m) => (
          <MealCard key={m.id} meal={m} />
        ))}
      </div>
    </section>
  )
}
