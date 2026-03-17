import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    return stored || 'system'
  })

  useEffect(() => {
    const applyTheme = () => {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark)

      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    applyTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const toggleTheme = () => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const currentIsDark = theme === 'dark' || (theme === 'system' && systemPrefersDark)
    const newTheme = currentIsDark ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return { theme, toggleTheme }
}
