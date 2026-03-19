import React from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from 'next-themes'
import Navbar from './components/Navbar'
import WeekBanner from './components/WeekBanner'
import DayDetail from './components/DayDetail'
import './styles.css'
import './i18n'

function AppContent() {
  const { t } = useTranslation()

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 dark:from-zinc-900 dark:via-neutral-900 dark:to-slate-900 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          <header className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-neutral-900 dark:text-neutral-100 mb-1 sm:mb-2">
              {t('app.title')}
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
              {t('app.subtitle')}
            </p>
          </header>
          <WeekBanner />
          <DayDetail />
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppContent />
    </ThemeProvider>
  )
}

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
