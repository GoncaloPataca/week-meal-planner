import React from 'react'
import { Disclosure } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { Meal } from '../types'
import { downloadICS, downloadIngredientsICS } from '../utils/calendar'

export default function MealCard({ meal, dateISO }: { meal: Meal; dateISO: string }) {
  const { t } = useTranslation()

  // Resolve image paths relative to the deployment base URL.
  // Data stores absolute-style paths like /images/recipes/foo.jpg.
  // import.meta.env.BASE_URL is './' in production (vite.config base: './'),
  // so this converts /images/... → ./images/... for any deploy sub-path.
  const resolveImage = (path: string) => {
    if (!path) return path
    const base = import.meta.env.BASE_URL.replace(/\/$/, '') // strip trailing slash
    return path.startsWith('/') ? `${base}${path}` : path
  }
  
  const labelColors: Record<string, string> = {
    'Morning': 'bg-amber-100 text-amber-800',
    'Lunch': 'bg-emerald-100 text-emerald-800',
    'Dinner': 'bg-blue-100 text-blue-800',
    'Evening': 'bg-violet-100 text-violet-800',
    'Dessert': 'bg-pink-100 text-pink-800',
  }

  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <article
          className="rounded-xl border shadow-sm hover:shadow-md transition-all duration-200"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <Disclosure.Button className="w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-inset">
            <div className="flex items-start justify-between gap-3">
              {meal.image && (
                <img 
                  src={resolveImage(meal.image)}
                  alt={meal.title}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${labelColors[meal.label] || 'tag-themed'}`}>
                    {meal.label}
                  </span>
                  {meal.tags && meal.tags.map((tag) => (
                    <span key={tag} className="tag-themed inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-serif font-semibold heading-themed leading-snug">
                  {meal.title}
                </h3>
                {meal.url && (
                  <a 
                    href={meal.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link-themed text-xs hover:underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('meal.viewOriginal')}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                {(meal.servings || meal.prep || meal.cook) && (
                  <div className="flex items-center gap-3 text-sm secondary-themed">
                    {meal.servings && <span>🍽 {meal.servings} {t('meal.servings')}</span>}
                    {meal.prep && <span>⏱ {meal.prep} {t('meal.prep')}</span>}
                    {meal.cook && <span>🔥 {meal.cook} {t('meal.cook')}</span>}
                  </div>
                )}
              </div>
              <div className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="pt-4"></div>
            
            {meal.ingredients && meal.ingredients.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold heading-themed uppercase tracking-wide mb-2">
                  {t('meal.ingredients')}
                </h4>
                <ul className="space-y-1.5">
                  {meal.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm secondary-themed flex gap-2">
                      <span className="muted-themed">•</span>
                      <span>
                        {ing.amount && <span className="font-medium heading-themed">{ing.amount}</span>}{' '}
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.steps && meal.steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold heading-themed uppercase tracking-wide mb-2">
                  {t('meal.steps')}
                </h4>
                <ol className="space-y-2">
                  {meal.steps.map((step, i) => (
                    <li key={i} className="text-sm secondary-themed flex gap-3">
                      <span className="step-num-themed flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {meal.notes && (
              <div className="note-themed border rounded-lg p-3">
                <p className="text-sm italic">
                  💡 {meal.notes}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  downloadICS(meal, dateISO)
                }}
                className="btn-themed flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">{t('calendar.addToCalendar')}</span>
                <span className="sm:hidden">{t('calendar.calendar')}</span>
              </button>
              {meal.ingredients && meal.ingredients.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadIngredientsICS(meal, dateISO)
                  }}
                  className="btn-themed flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="hidden sm:inline">{t('calendar.addIngredients')}</span>
                  <span className="sm:hidden">{t('calendar.ingredients')}</span>
                </button>
              )}
            </div>
          </Disclosure.Panel>
        </article>
      )}
    </Disclosure>
  )
}
