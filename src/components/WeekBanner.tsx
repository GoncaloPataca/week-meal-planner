import React from 'react'
import { Tab } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import useStore from '../store'
import { downloadMultipleICS } from '../utils/calendar'

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
  const { t } = useTranslation()
  const selectedISO = useStore((s) => s.selectedISO)
  const setSelectedDate = useStore((s) => s.setSelectedDate)
  const viewedWeekStart = useStore((s) => s.viewedWeekStart)
  const meals = useStore((s) => s.meals)
  const goToPreviousWeek = useStore((s) => s.goToPreviousWeek)
  const goToNextWeek = useStore((s) => s.goToNextWeek)
  const goToCurrentWeek = useStore((s) => s.goToCurrentWeek)

  const today = new Date()
  const monday = viewedWeekStart

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(monday, i)
    return {
      date,
      label: t(`days.${dayKeys[i]}`),
      dayNumber: date.getDate(),
      iso: date.toISOString().slice(0, 10)
    }
  })

  const mealsMap = useStore((s) => s.meals)

  // Predefined color palette for meal dots
  const mealColors = ['#EA580C', '#059669', '#7C3AED', '#E11D48', '#0EA5E9', '#F59E0B']

  const selectedIndex = days.findIndex((d) => d.iso === selectedISO)

  const todayISO = today.toISOString().slice(0, 10)
  const mondayOfCurrentWeek = getMonday(today)
  const isCurrentWeek = monday.getTime() === mondayOfCurrentWeek.getTime()

  return (
    <section className="mb-8 sm:mb-12 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <button
          onClick={goToPreviousWeek}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300"
          aria-label={t('navigation.previousWeek')}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">{t('navigation.previousWeek')}</span>
        </button>

        {!isCurrentWeek && (
          <button
            onClick={goToCurrentWeek}
            className="px-3 sm:px-4 py-2 rounded-lg bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 text-xs sm:text-sm font-medium text-white"
          >
            {t('navigation.today')}
          </button>
        )}

        <button
          onClick={goToNextWeek}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300"
          aria-label={t('navigation.nextWeek')}
        >
          <span className="hidden sm:inline">{t('navigation.nextWeek')}</span>
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <Tab.Group selectedIndex={selectedIndex >= 0 ? selectedIndex : 0} onChange={(i) => setSelectedDate(days[i].date)}>
        <Tab.List className="flex justify-between gap-1.5 sm:gap-2 p-1">
          {days.map((d) => {
            const meals = mealsMap[d.iso] ?? []
            const dots = meals.slice(0, 3).map((_, i) => mealColors[i % mealColors.length])
            const isToday = sameDay(d.date, today)

            return (
              <Tab
                key={d.iso}
                className={({ selected }) => `
                  flex-1 relative flex flex-col items-center gap-1 sm:gap-2 px-1.5 py-2 sm:px-3 sm:py-3 min-w-0
                  rounded-xl sm:rounded-2xl transition-all duration-200
                  ${selected 
                    ? 'bg-white dark:bg-neutral-800 border-2 border-slate-300 dark:border-neutral-500 shadow-lg' 
                    : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm'
                  }
                  focus:outline-none focus-visible:outline-none
                `}
              >
                <div className="text-[0.6rem] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  {d.label}
                </div>
                {isToday && (
                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500"></div>
                )}
                {dots.length > 0 && (
                  <div className="flex gap-1">
                    {dots.map((color, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
                <div className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {d.dayNumber}
                </div>
                <div className="hidden sm:block text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  {meals.length} {meals.length === 1 ? t('meal.singular') : t('meal.plural')}
                </div>
              </Tab>
            )
          })}
        </Tab.List>
      </Tab.Group>
    </section>
  )
}
