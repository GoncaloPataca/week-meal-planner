import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
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
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
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
                <SunIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <MoonIcon className="w-5 h-5" />
              )}
            </NavButton>
          </div>
        </div>
      </div>
    </nav>
  )
}
