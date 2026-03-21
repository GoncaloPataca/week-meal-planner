import React from 'react'
import { Disclosure } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  FireIcon,
  LightBulbIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
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
    <Disclosure>
      {({ open }) => (
        <article
          className="rounded-xl border shadow-sm hover:shadow-md transition-all duration-200"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <Disclosure.Button className="w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-inset">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                {meal.image && (
                  <img 
                    src={resolveImage(meal.image)}
                    alt={meal.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="text-lg font-serif font-semibold heading-themed leading-snug break-words">
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
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </a>
                  )}
                  {(meal.servings || meal.prep || meal.cook) && (
                    <div className="flex items-center gap-3 text-sm secondary-themed">
                      {meal.servings && <span className="inline-flex items-center gap-1"><UsersIcon className="w-4 h-4 flex-shrink-0" />{meal.servings} {t('meal.servings')}</span>}
                      {meal.prep && <span className="inline-flex items-center gap-1"><ClockIcon className="w-4 h-4 flex-shrink-0" />{meal.prep} {t('meal.prep')}</span>}
                      {meal.cook && <span className="inline-flex items-center gap-1"><FireIcon className="w-4 h-4 flex-shrink-0" />{meal.cook} {t('meal.cook')}</span>}
                    </div>
                  )}
                </div>
                <div className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon className="w-5 h-5" />
                </div>
              </div>
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
                <p className="text-sm italic flex items-start gap-1.5">
                  <LightBulbIcon className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{meal.notes}</span>
                </p>
              </div>
            )}

            {meal.nutrition && (
              <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--primary) 6%, var(--surface))' }}>
                <p className="text-xs font-semibold uppercase tracking-wide secondary-themed mb-2.5">
                  {t('meal.nutrition')} <span className="font-normal normal-case">· {t('meal.perServing')}</span>
                </p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { key: 'calories', value: meal.nutrition.calories, unit: t('meal.calories'), accent: true,  label: ''                },
                    { key: 'protein',  value: meal.nutrition.protein,  unit: 'g',                accent: false, label: t('meal.protein') },
                    { key: 'carbs',    value: meal.nutrition.carbs,    unit: 'g',                accent: false, label: t('meal.carbs')   },
                    { key: 'fat',      value: meal.nutrition.fat,      unit: 'g',                accent: false, label: t('meal.fat')     },
                    { key: 'fiber',    value: meal.nutrition.fiber,    unit: 'g',                accent: false, label: t('meal.fiber')   },
                  ].map(({ key, value, unit, accent, label }) => (
                    <div key={key}>
                      <p className={`text-lg font-bold leading-none ${accent ? 'link-themed' : 'heading-themed'}`}>
                        {value != null ? value : '–'}
                      </p>
                      <p className="text-[10px] secondary-themed leading-tight">{value != null ? unit : ''}</p>
                      {label && <p className="text-[10px] secondary-themed font-medium leading-tight mt-0.5">{label}</p>}
                    </div>
                  ))}
                </div>
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
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                  <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
