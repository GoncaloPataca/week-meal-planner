import React from 'react'
import { Meal } from '../types'

export default function MealCard({ meal }: { meal: Meal }) {
  return (
    <article className="meal-card">
      <div className="meal-header">
        <span className="meal-label">{meal.label}</span>
        <h3 className="meal-title">{meal.title}</h3>
      </div>
      <div className="meal-meta">
        {meal.servings ? <span>{meal.servings} servings</span> : null}
        {meal.prep ? <span>· {meal.prep} prep</span> : null}
        {meal.cook ? <span>· {meal.cook} cook</span> : null}
      </div>
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
    </article>
  )
}
