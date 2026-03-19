import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { themes, DEFAULT_THEME_ID, PALETTE_STORAGE_KEY, applyTheme } from '../themes'
import NavButton from './NavButton'

/** Convert 'warm-peach' → 'palette.warmPeach' */
const tKey = (id: string) =>
  'palette.' + id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

export default function ThemePicker() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  // Lazy-init from localStorage so we never start on the wrong palette
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY)
    return (stored && themes.some(t => t.id === stored)) ? stored : DEFAULT_THEME_ID
  })
  const panelRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Only apply once next-themes has resolved dark/light — avoids a false
  // light-mode flash on dark-mode users during the first render tick
  useEffect(() => {
    if (resolvedTheme === undefined) return
    applyTheme(activeId, isDark)
  }, [activeId, isDark, resolvedTheme])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (id: string) => {
    setActiveId(id)
    localStorage.setItem(PALETTE_STORAGE_KEY, id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      <NavButton
        variant="icon"
        onClick={() => setOpen(v => !v)}
        aria-label={t('palette.label')}
        title={t('palette.label')}
      >
        {/* Painter's palette icon */}
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 3.17 2.12 5 4.5 5 .83 0 1.5.67 1.5 1.5S7.33 20 6.5 20C4.5 20 2 18 2 12 2 6.48 6.48 2 12 2z" />
          <path d="M22 12c0 5.52-4.48 10-10 10" />
          <circle cx="8.5"  cy="7"  r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12"   cy="5"  r="1.2" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="7"  r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17"   cy="11" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </NavButton>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl border z-50 overflow-hidden"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <p
            className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--muted)' }}
          >
            {t('palette.label')}
          </p>

          <ul className="px-2 pb-2 space-y-0.5">
            {themes.map(theme => {
              const isActive = theme.id === activeId
              return (
                <li key={theme.id}>
                  <button
                    onClick={() => pick(theme.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all duration-150"
                    style={{
                      backgroundColor: isActive
                        ? `color-mix(in srgb, var(--primary) 14%, transparent)`
                        : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          'color-mix(in srgb, var(--muted) 12%, transparent)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Four swatches: bg, primary, muted, border */}
                    <span className="flex gap-0.5 shrink-0">
                      {theme.preview.map((col, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </span>

                    <span
                      className="flex-1 text-sm font-medium"
                      style={{ color: 'var(--text)' }}
                    >
                      {t(tKey(theme.id))}
                    </span>

                    {isActive && (
                      <span style={{ color: 'var(--primary)' }}>
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
