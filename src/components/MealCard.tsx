import React from 'react'
import { Disclosure } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { Meal } from '../types'

export default function MealCard({ meal }: { meal: Meal }) {
  const { t } = useTranslation()
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
        <article className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all duration-200">
          <Disclosure.Button className="w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:ring-inset">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${labelColors[meal.label] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {meal.label}
                  </span>
                  {meal.tags && meal.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-serif font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                  {meal.title}
                </h3>
                {(meal.servings || meal.prep || meal.cook) && (
                  <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {meal.servings && <span>🍽 {meal.servings} {t('meal.servings')}</span>}
                    {meal.prep && <span>⏱ {meal.prep} {t('meal.prep')}</span>}
                    {meal.cook && <span>🔥 {meal.cook} {t('meal.cook')}</span>}
                  </div>
                )}
              </div>
              <div className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className="px-5 pb-5 space-y-4 border-t border-neutral-100 dark:border-neutral-700">
            <div className="pt-4"></div>
            
            {meal.ingredients && meal.ingredients.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                  {t('meal.ingredients')}
                </h4>
                <ul className="space-y-1.5">
                  {meal.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-neutral-600 dark:text-neutral-400 flex gap-2">
                      <span className="text-neutral-400 dark:text-neutral-600">•</span>
                      <span>
                        {ing.amount && <span className="font-medium text-neutral-700 dark:text-neutral-300">{ing.amount}</span>}{' '}
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.steps && meal.steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                  {t('meal.steps')}
                </h4>
                <ol className="space-y-2">
                  {meal.steps.map((step, i) => (
                    <li key={i} className="text-sm text-neutral-600 dark:text-neutral-400 flex gap-3">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {meal.notes && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-300 italic">
                  💡 {meal.notes}
                </p>
              </div>
            )}
          </Disclosure.Panel>
        </article>
      )}
    </Disclosure>
  )
}
