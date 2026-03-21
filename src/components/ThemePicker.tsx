import React, { useEffect, useState } from 'react'
import { Popover } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { CheckIcon } from '@heroicons/react/24/outline'
import { themes, DEFAULT_THEME_ID, PALETTE_STORAGE_KEY, applyTheme } from '../themes'
import { PaletteIcon } from './icons'

/** Convert 'warm-peach' → 'palette.warmPeach' */
const tKey = (id: string) =>
  'palette.' + id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

export default function ThemePicker() {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string>(() => {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY)
    return (stored && themes.some(t => t.id === stored)) ? stored : DEFAULT_THEME_ID
  })
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    if (resolvedTheme === undefined) return
    applyTheme(activeId, isDark)
  }, [activeId, isDark, resolvedTheme])

  const pick = (id: string, close: () => void) => {
    setActiveId(id)
    localStorage.setItem(PALETTE_STORAGE_KEY, id)
    close()
  }

  return (
    <Popover className="relative">
      <Popover.Button
        className="btn-themed flex-shrink-0 rounded-lg border p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-label={t('palette.label')}
        title={t('palette.label')}
      >
        <PaletteIcon className="w-5 h-5" />
      </Popover.Button>

      <Popover.Panel
        className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl border z-50 overflow-hidden"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {({ close }) => (
          <>
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
                      onClick={() => pick(theme.id, close)}
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
                          <CheckIcon className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Popover.Panel>
    </Popover>
  )
}
