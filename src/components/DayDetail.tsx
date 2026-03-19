import React from 'react'
import { useTranslation } from 'react-i18next'
import { Meal } from '../types'
import MealCard from './MealCard'
import useStore, { getMonday } from '../store'
import { downloadMultipleICS } from '../utils/calendar'

export default function DayDetail({ date }: { date?: Date }) {
  const { t } = useTranslation()
  const selectedISO = useStore((s) => s.selectedISO)
  const mealsMap = useStore((s) => s.meals)
  const viewedWeekStart = useStore((s) => s.viewedWeekStart)

  const iso = date ? date.toISOString().slice(0, 10) : selectedISO
  const currentDate = date ?? new Date(iso)
  const meals: Meal[] = mealsMap[iso] ?? []

  const dayOfWeek = currentDate.getDay()
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = t(`days.${dayKeys[dayOfWeek]}Full`)

  const handleExportDay = () => {
    if (meals.length === 0) return
    const mealData = meals.map(meal => ({ meal, dateISO: iso }))
    downloadMultipleICS(mealData, `meals-${dayName.toLowerCase()}-${iso}`)
  }

  const handleExportWeek = () => {
    const monday = getMonday(viewedWeekStart)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
    
    const allMeals = days.flatMap(dayISO => {
      const dayMeals = mealsMap[dayISO] ?? []
      return dayMeals.map(meal => ({ meal, dateISO: dayISO }))
    })
    
    if (allMeals.length === 0) return
    const weekLabel = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    downloadMultipleICS(allMeals, `meals-week-${weekLabel}`)
  }
  
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold heading-themed">
            {dayName}
          </h2>
          <span className="text-xs sm:text-sm secondary-themed font-medium">
            {meals.length} {meals.length === 1 ? t('meal.singular') : t('meal.plural')} {t('meal.planned')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {meals.length > 0 && (
            <button
              onClick={handleExportDay}
              className="btn-themed flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{t('calendar.exportDay')}</span>
            </button>
          )}
          <button
            onClick={handleExportWeek}
            className="btn-themed flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">{t('calendar.exportWeek')}</span>
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {meals.map((m) => (
          <MealCard key={m.id} meal={m} dateISO={iso} />
        ))}
      </div>
    </section>
  )
}
