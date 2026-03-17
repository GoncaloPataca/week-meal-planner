import React, { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import WeekBanner from './components/WeekBanner'
import DayDetail from './components/DayDetail'
import './styles.css'
import './i18n'
import useStore from './store'
import { useDarkMode } from './hooks/useDarkMode'

function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
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

export default function App() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useDarkMode()
  const today = new Date()
  const monday = getMonday(today)

  // build week keys (still useful for any future needs)
  const weekDates = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(monday, i)), [monday])

  // selected date and meals are now read from the Zustand store inside components
  const selectedISO = useStore((s) => s.selectedISO)

  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark)

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pt' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 dark:from-zinc-900 dark:via-neutral-900 dark:to-slate-900 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-neutral-900 dark:text-neutral-100 mb-1 sm:mb-2">
              {t('app.title')}
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
              {t('app.subtitle')}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={toggleLanguage}
              className="flex-shrink-0 px-3 py-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 text-sm font-medium text-neutral-700 dark:text-neutral-300"
              aria-label={t('language.toggle')}
            >
              {i18n.language.toUpperCase()}
            </button>
            <button
              onClick={toggleTheme}
              className="flex-shrink-0 p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
              aria-label={t('theme.toggle')}
            >
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </header>
        <WeekBanner />
        <DayDetail />
      </div>
    </div>
  )
}

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
