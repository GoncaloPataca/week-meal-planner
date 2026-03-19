import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import ThemePicker from './ThemePicker'
import NavButton from './NavButton'

export default function Navbar() {
  const { i18n } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'pt' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <nav
      className="backdrop-blur-sm border-b sticky top-0 z-50 transition-colors duration-300"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <h1 className="text-lg sm:text-xl font-serif font-semibold heading-themed">
            Week Meal Planner
          </h1>
          <div className="flex gap-2">
            <NavButton
              variant="text"
              onClick={toggleLanguage}
              aria-label="Change language"
            >
              {i18n.language.toUpperCase()}
            </NavButton>
            <ThemePicker />
            <NavButton
              variant="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </NavButton>
          </div>
        </div>
      </div>
    </nav>
  )
}
