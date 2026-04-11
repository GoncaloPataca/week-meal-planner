import React from 'react'
import { useTranslation } from 'react-i18next'
import { Meal } from '../types'
import MealCard from './MealCard'
import DayNutritionSummary from './DayNutritionSummary'
import useStore from '../store'

export default function DayDetail({ date }: { date?: Date }) {
  const { t } = useTranslation()
  const selectedISO = useStore((s) => s.selectedISO)
  const mealsMap = useStore((s) => s.meals)

  const iso = date
    ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    : selectedISO
  // Parse ISO as local midnight (not UTC) to avoid timezone shift
  const [y, mo, da] = iso.split('-').map(Number)
  const currentDate = date ?? new Date(y, mo - 1, da)
  const meals: Meal[] = mealsMap[iso] ?? []

  const dayOfWeek = currentDate.getDay()
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = t(`days.${dayKeys[dayOfWeek]}Full`)

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-1 sm:gap-3">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold heading-themed">
            {dayName}
          </h2>
          <span className="text-xs sm:text-sm secondary-themed font-medium">
            {meals.length} {meals.length === 1 ? t('meal.singular') : t('meal.plural')} {t('meal.planned')}
          </span>
        </div>
      </div>
      <DayNutritionSummary meals={meals} />
      <div className="flex flex-col gap-4">
        {meals.map((m) => (
          <MealCard key={m.id} meal={m} dateISO={iso} />
        ))}
      </div>
    </section>
  )
}
