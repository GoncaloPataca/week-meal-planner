import React from 'react'
import { Meal } from '../types'
import { Disclosure } from '@headlessui/react'

export default function MealCard({ meal }: { meal: Meal }) {
  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <article className="meal-card">
          <Disclosure.Button className="meal-header" as="div">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="meal-label">{meal.label}</span>
              <h3 className="meal-title">{meal.title}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="meal-meta">
                {meal.servings ? <span>{meal.servings} servings</span> : null}
                {meal.prep ? <span>· {meal.prep} prep</span> : null}
                {meal.cook ? <span>· {meal.cook} cook</span> : null}
              </div>
              <span className={`chev ${open ? 'open' : ''}`} aria-hidden>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className={`disclosure-panel ${open ? 'open' : 'closed'}`}>
            {meal.tags && (
              <div className="meal-tags">
                {meal.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            )}

            {meal.ingredients && (
              <div className="ingredients">
                <h4>Ingredients</h4>
                <ul>
                  {meal.ingredients.map((ing, i) => (
                    <li key={i}><strong>{ing.amount ?? ''}</strong> {ing.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {meal.steps && (
              <div className="steps">
                <h4>Steps</h4>
                <ol>
                  {meal.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}

            {meal.notes && <div className="notes">{meal.notes}</div>}
          </Disclosure.Panel>
        </article>
      )}
    </Disclosure>
  )
}
