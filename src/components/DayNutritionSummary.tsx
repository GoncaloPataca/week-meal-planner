import { useTranslation } from 'react-i18next'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { Meal } from '../types'

interface Props {
  meals: Meal[]
}

const MACROS = [
  { key: 'protein' as const, labelKey: 'meal.protein' },
  { key: 'carbs'   as const, labelKey: 'meal.carbs'   },
  { key: 'fat'     as const, labelKey: 'meal.fat'     },
]

export default function DayNutritionSummary({ meals }: Props) {
  const { t } = useTranslation()

  const withNutrition = meals.filter((m) => m.calories != null)
  if (withNutrition.length === 0) return null

  const totals = withNutrition.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein:  acc.protein  + (m.protein  ?? 0),
      carbs:    acc.carbs    + (m.carbs    ?? 0),
      fat:      acc.fat      + (m.fat      ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const partial = withNutrition.length < meals.length

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="w-3 h-3" style={{ color: 'var(--primary)' }} />
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] secondary-themed">
            {t('nutrition.title')}
          </span>
        </div>
        {partial && (
          <span className="text-[9px] secondary-themed">
            {withNutrition.length}/{meals.length} {t('nutrition.mealsWithData')}
          </span>
        )}
      </div>

      {/* 4 equal stat columns */}
      <div className="flex pb-3">
        {/* Calories */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span
            className="text-[26px] font-bold font-serif leading-none"
            style={{ color: 'var(--primary)' }}
          >
            {Math.round(totals.calories)}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] secondary-themed">
            kcal
          </span>
        </div>

        {/* Macro columns */}
        {MACROS.map(({ key, labelKey }) => (
          <div
            key={key}
            className="flex-1 flex flex-col items-center gap-0.5"
            style={{ borderLeft: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}
          >
            <span className="text-xl font-bold font-mono heading-themed leading-none">
              {Math.round(totals[key])}
              <span className="text-[9px] font-normal secondary-themed ml-0.5">g</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] secondary-themed">
              {t(labelKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
