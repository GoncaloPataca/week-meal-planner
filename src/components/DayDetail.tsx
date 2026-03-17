import React from 'react'
import { useTranslation } from 'react-i18next'
import { Meal } from '../types'
import MealCard from './MealCard'
import useStore from '../store'

export default function DayDetail({ date }: { date?: Date }) {
  const { t } = useTranslation()
  const selectedISO = useStore((s) => s.selectedISO)
  const mealsMap = useStore((s) => s.meals)

  const iso = date ? date.toISOString().slice(0, 10) : selectedISO
  const currentDate = date ?? new Date(iso)
  const meals: Meal[] = mealsMap[iso] ?? []

  const dayOfWeek = currentDate.getDay()
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = t(`days.${dayKeys[dayOfWeek]}Full`)

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-neutral-900 dark:text-neutral-100">
          {dayName}
        </h2>
        <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium">
          {meals.length} {meals.length === 1 ? t('meal.singular') : t('meal.plural')} {t('meal.planned')}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {meals.map((m) => (
          <MealCard key={m.id} meal={m} />
        ))}
      </div>
    </section>
  )
}
