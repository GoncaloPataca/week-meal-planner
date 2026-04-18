import React, { useState } from 'react'
import { Disclosure } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  FireIcon,
  LightBulbIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { Meal } from '../types'
import { downloadICS, ICSLabels } from '../utils/calendar'
import translationsData from '../data/translations.json'
import availabilityData from '../data/ingredient-availability.json'

type Translations = Record<string, Record<string, string>>
const tx = translationsData as unknown as Translations

type StoreAvailability = { continente: boolean|null; auchan: boolean|null; pingodoce: boolean|null; lidl: boolean|null; aldi: boolean|null }
const av = availabilityData as Record<string, StoreAvailability>

const STORES: { key: keyof StoreAvailability; name: string; logo: string }[] = [
  { key: 'continente', name: 'Continente', logo: './images/stores/continente.png' },
  { key: 'auchan',     name: 'Auchan',     logo: './images/stores/auchan.png' },
  { key: 'pingodoce',  name: 'Pingo Doce', logo: './images/stores/pingodoce.png' },
  { key: 'lidl',       name: 'Lidl',       logo: './images/stores/lidl.png' },
  { key: 'aldi',       name: 'Aldi',       logo: './images/stores/aldi.png' },
]

const STORE_NAMES = STORES.map(s => s.name).join(', ')

type DisplayedIngredient = { id?: string; amount?: string; name: string; note?: string }

function IngredientWhereToBuy({ id, open }: { id: string; open: boolean }) {
  const entry = av[id]
  if (!entry || STORES.every(s => entry[s.key] === null)) return null

  const available = STORES.filter(s => entry[s.key] === true)

  return (
    <span className="block">
      {open && (
        <span className="flex flex-wrap items-center gap-2 mt-1 ml-0.5">
          {available.length === 0 ? (
            <span className="text-[11px] muted-themed italic">Not found at {STORE_NAMES}</span>
          ) : (
            available.map(s => (
              <img key={s.key} src={s.logo} alt={s.name} title={s.name} className="w-5 h-5 rounded" />
            ))
          )}
        </span>
      )}
    </span>
  )
}

/** Resolve a translation key, falling back through languages then to the key itself. */
function tr(key: string, lang: string): string {
  const entry = tx[key]
  return entry?.[lang] ?? entry?.['en'] ?? key.split(':').pop()?.replace(/-/g, ' ') ?? key
}

export default function MealCard({ meal, dateISO }: { meal: Meal; dateISO: string }) {
  const { t, i18n } = useTranslation()

  // Build a display-friendly ingredients array using lookup tables.
  // ingredientsParsed entries carry only { id, amount, unitId } — language-agnostic.
  // Name resolved via translations.json[`ingredient:<id>`][lang].
  // Unit label comes from t('units.<unitId>').
  const buildDisplayedIngredients = () => {
    const isPT = i18n.language === 'pt'
    const lang = isPT ? 'pt' : 'en'
    const anyMeal = meal as any
    const parsed: Array<{ id: string; amount?: number | null; unitId?: string | null; note?: string }> =
      anyMeal?.ingredientsParsed || []

    if (parsed.length > 0) {
      return parsed.map((p) => {
        const name   = tr(`ingredient:${p.id}`, lang)
        const unit   = p.unitId ? t(`units.${p.unitId}`) : ''
        const amount = p.amount != null ? `${p.amount}${unit ? '\u00a0' + unit : ''}` : undefined
        return { id: p.id, amount, name, note: p.note }
      })
    }

    // Fallback: plain string ingredients list
    const plain = isPT
      ? (anyMeal?.i18n?.pt?.ingredients ?? meal.ingredients ?? [])
      : (meal.ingredients ?? [])
    if (Array.isArray(plain)) {
      if (typeof plain[0] === 'string') return (plain as string[]).map((s) => ({ name: s }))
      return plain as Array<{ name: string; amount?: string }>
    }
    return []
  }

  const displayedIngredients = buildDisplayedIngredients() as Array<{ amount?: string; name: string }>

  const anyMealOuter = meal as any
  const isPT = i18n.language === 'pt'
  const lang = isPT ? 'pt' : 'en'
  const recipeSlug = (anyMealOuter?.url || '').replace(/\/$/, '').split('/').pop() || ''

  const displayedTitle = recipeSlug
    ? tr(`recipe:${recipeSlug}:name`, lang)
    : meal.title

  const enSteps: string[] = meal.steps || []
  const displayedSteps: string[] = enSteps.map((keyOrText) =>
    keyOrText.startsWith('recipe:') ? tr(keyOrText, lang) : keyOrText
  )

  // Resolve image paths relative to the deployment base URL.
  // Data stores absolute-style paths like /images/recipes/foo.jpg.
  // import.meta.env.BASE_URL is './' in production (vite.config base: './'),
  // so this converts /images/... → ./images/... for any deploy sub-path.
  const resolveImage = (path: string) => {
    if (!path) return path
    const base = (import.meta as any).env.BASE_URL.replace(/\/$/, '') // strip trailing slash
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
                    {displayedTitle}
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
            
            {displayedIngredients.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold heading-themed uppercase tracking-wide mb-2">
                  {t('meal.ingredients')}
                </h4>
                <ul className="space-y-1.5">
                  {displayedIngredients.map((ing, i) => {
                    const ingId: string | undefined = (ing as any).id
                    const hasAvail = ingId && av[ingId] && STORES.some(s => av[ingId!][s.key] !== null)
                    const [wtbOpen, setWtbOpen] = useState(false)
                    return (
                      <li key={i} className="text-sm secondary-themed">
                        <div className="flex gap-2">
                          <span className="muted-themed mt-0.5">•</span>
                          <span className="flex-1">
                            {ing.amount && <span className="font-medium heading-themed">{ing.amount}</span>}{' '}
                            {ing.name}
                            {(ing as any).note && <span className="muted-themed italic"> — {(ing as any).note}</span>}
                            {hasAvail && (
                              <button
                                onClick={e => { e.stopPropagation(); setWtbOpen(o => !o) }}
                                className="inline-flex items-center ml-1.5 align-middle tag-themed border rounded px-1 py-0.5 hover:opacity-80 transition-opacity focus:outline-none"
                                style={{ borderColor: 'var(--border)' }}
                                title={t('meal.whereToBuy')}
                              >
                                <ChevronDownIcon className={`w-2.5 h-2.5 transition-transform duration-150 ${wtbOpen ? '' : '-rotate-90'}`} />
                              </button>
                            )}
                          </span>
                        </div>
                        {ingId && <IngredientWhereToBuy id={ingId} open={wtbOpen} />}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {displayedSteps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold heading-themed uppercase tracking-wide mb-2">
                  {t('meal.steps')}
                </h4>
                <ol className="space-y-2">
                  {displayedSteps.map((step, i) => (
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

              {meal.calories != null && (
              <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--primary) 6%, var(--surface))' }}>
                <p className="text-xs font-semibold uppercase tracking-wide secondary-themed mb-2.5">
                  {t('meal.nutrition')} <span className="font-normal normal-case">· {t('meal.perServing')}</span>
                </p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { key: 'calories', value: meal.calories, unit: t('meal.calories'), accent: true,  label: ''                },
                    { key: 'protein',  value: meal.protein,  unit: 'g',               accent: false, label: t('meal.protein') },
                    { key: 'carbs',    value: meal.carbs,    unit: 'g',               accent: false, label: t('meal.carbs')   },
                    { key: 'fat',      value: meal.fat,      unit: 'g',               accent: false, label: t('meal.fat')     },
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
                  const icsLabels: ICSLabels = {
                    servings:    t('meal.servings'),
                    prep:        t('meal.prep'),
                    cook:        t('meal.cook'),
                    ingredients: t('meal.ingredients'),
                    steps:       t('meal.steps'),
                    notes:       t('meal.notes'),
                  }
                  const mealForICS = { ...meal, ingredients: displayedIngredients, steps: displayedSteps, title: displayedTitle }
                  downloadICS(mealForICS as any, dateISO, icsLabels)
                }}
                className="btn-themed flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('calendar.addToCalendar')}</span>
                <span className="sm:hidden">{t('calendar.calendar')}</span>
              </button>
            </div>
          </Disclosure.Panel>
        </article>
      )}
    </Disclosure>
  )
}
