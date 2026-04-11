import React from 'react'
import { Tab } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
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

  const mondayOfCurrentWeek = getMonday(today)
  const minWeekStart = new Date(mondayOfCurrentWeek)
  minWeekStart.setDate(minWeekStart.getDate() - 2 * 7)
  const maxWeekStart = new Date(mondayOfCurrentWeek)
  maxWeekStart.setDate(maxWeekStart.getDate() + 2 * 7)

  const canGoPrev = monday.getTime() > minWeekStart.getTime()
  const canGoNext = monday.getTime() < maxWeekStart.getTime()

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(monday, i)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return {
      date,
      label: t(`days.${dayKeys[i]}`),
      dayNumber: date.getDate(),
      iso: `${y}-${m}-${d}`
    }
  })

  const mealsMap = useStore((s) => s.meals)

  // Predefined color palette for meal dots
  const mealColors = ['#EA580C', '#059669', '#7C3AED', '#E11D48', '#0EA5E9', '#F59E0B']

  const selectedIndex = days.findIndex((d) => d.iso === selectedISO)

  const todayISO = today.toISOString().slice(0, 10)
  const isCurrentWeek = monday.getTime() === mondayOfCurrentWeek.getTime()

  return (
    <section className="mb-8 sm:mb-12 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <button
          onClick={goToPreviousWeek}
          disabled={!canGoPrev}
          className="btn-themed flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs sm:text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('navigation.previousWeek')}
        >
          <ChevronLeftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">{t('navigation.previousWeek')}</span>
        </button>

        {!isCurrentWeek && (
          <button
            onClick={goToCurrentWeek}
            className="btn-primary-themed px-3 sm:px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs sm:text-sm font-medium"
          >
            {t('navigation.today')}
          </button>
        )}

        <button
          onClick={goToNextWeek}
          disabled={!canGoNext}
          className="btn-themed flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs sm:text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('navigation.nextWeek')}
        >
          <span className="hidden sm:inline">{t('navigation.nextWeek')}</span>
          <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                  week-day-tab flex-1 relative flex flex-col items-center gap-1 sm:gap-2 px-1.5 py-2 sm:px-3 sm:py-3 min-w-0
                  rounded-xl sm:rounded-2xl transition-all duration-200
                  ${selected
                    ? 'border-2 shadow-lg'
                    : 'border hover:shadow-sm'
                  }
                  focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400
                `}
              >
                <div className="text-[0.6rem] sm:text-xs font-semibold secondary-themed uppercase tracking-wide">
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
                <div className="text-lg sm:text-2xl font-bold heading-themed">
                  {d.dayNumber}
                </div>
                <div className="hidden sm:block text-xs secondary-themed font-medium">
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
