import { Meal } from '../types'

function parseDuration(timeStr?: string | number): number {
  if (timeStr == null) return 0
  // Raw number → already in minutes
  if (typeof timeStr === 'number') return timeStr
  const s = String(timeStr).trim()
  if (!s) return 0
  const match = s.match(/(\d+)\s*(min|hour|hr|h|m)/i)
  if (!match) {
    // Plain numeric string like "55"
    const n = parseInt(s)
    return isNaN(n) ? 0 : n
  }
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  return unit === 'h' || unit.startsWith('hour') || unit === 'hr' ? value * 60 : value
}

/** Format a prep/cook value for human display ("25 min", "1h 10min", etc.) */
function formatTime(val?: string | number): string | null {
  if (val == null) return null
  if (typeof val === 'number') return `${val} min`
  const s = String(val).trim()
  if (!s) return null
  // Already has a unit label — use as-is
  if (/[a-zA-Z]/.test(s)) return s
  // Bare number string
  const n = parseInt(s)
  return isNaN(n) ? s : `${n} min`
}

/** Render one ingredient regardless of whether it's a plain string or {amount, name} object */
function formatIngredient(ing: any): string {
  if (typeof ing === 'string') return ing
  const amount = ing.amount ? String(ing.amount).trim() : ''
  const name   = ing.name   ? String(ing.name).trim()   : (ing.item ? String(ing.item).trim() : '')
  return [amount, name].filter(Boolean).join(' ')
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export interface ICSLabels {
  servings: string
  prep: string
  cook: string
  ingredients: string
  steps: string
  notes: string
}

const DEFAULT_LABELS: ICSLabels = {
  servings:    'Servings',
  prep:        'Prep time',
  cook:        'Cook time',
  ingredients: 'Ingredients',
  steps:       'Steps',
  notes:       'Notes',
}

function buildDescription(meal: Meal, labels: ICSLabels = DEFAULT_LABELS): string {
  let d = `${meal.title}\\n\\n`

  if (meal.servings) d += `${labels.servings}: ${meal.servings}\\n`

  const prep = formatTime(meal.prep)
  const cook = formatTime(meal.cook)
  if (prep) d += `${labels.prep}: ${prep}\\n`
  if (cook) d += `${labels.cook}: ${cook}\\n`

  if (meal.ingredients && meal.ingredients.length > 0) {
    d += `\\n${labels.ingredients}:\\n`
    meal.ingredients.forEach((ing: any) => {
      d += `- ${formatIngredient(ing)}\\n`
    })
  }

  if (meal.steps && meal.steps.length > 0) {
    d += `\\n${labels.steps}:\\n`
    meal.steps.forEach((step, i) => {
      d += `${i + 1}. ${step}\\n\\n`
    })
  }

  if (meal.notes) d += `\\n${labels.notes}: ${meal.notes}\\n`

  return d
}

export function generateICS(meal: Meal, dateISO: string, labels?: ICSLabels): string {
  const timeStr = meal.time || '10:00'
  const date = new Date(dateISO + 'T' + timeStr + ':00')

  const prepMinutes = parseDuration(meal.prep)
  const cookMinutes = parseDuration(meal.cook)
  const totalMinutes = prepMinutes + cookMinutes || 60

  const endDate = new Date(date.getTime() + totalMinutes * 60 * 1000)

  const description = buildDescription(meal, labels)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Week Meal Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(date)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `UID:${meal.id}-${dateISO}@week-meal-planner`,
    `SUMMARY:${meal.label}: ${meal.title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    ...(meal.url ? [`URL:${meal.url}`] : []),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return ics
}

export function generateMultipleICS(meals: Array<{ meal: Meal; dateISO: string }>, _filename: string, labels?: ICSLabels): string {
  const events = meals.map(({ meal, dateISO }) => {
    const timeStr = meal.time || '10:00'
    const date = new Date(dateISO + 'T' + timeStr + ':00')

    const prepMinutes = parseDuration(meal.prep)
    const cookMinutes = parseDuration(meal.cook)
    const totalMinutes = prepMinutes + cookMinutes || 60

    const endDate = new Date(date.getTime() + totalMinutes * 60 * 1000)

    const description = buildDescription(meal, labels)

    return [
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(date)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `UID:${meal.id}-${dateISO}@week-meal-planner`,
      `SUMMARY:${meal.label}: ${meal.title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      ...(meal.url ? [`URL:${meal.url}`] : []),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
    ].join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Week Meal Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(meal: Meal, dateISO: string, labels?: ICSLabels) {
  const ics = generateICS(meal, dateISO, labels)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${meal.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadMultipleICS(meals: Array<{ meal: Meal, dateISO: string }>, filename: string, labels?: ICSLabels) {
  const ics = generateMultipleICS(meals, filename, labels)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
export function generateTodoICS(meal: Meal, dateISO: string): string {
  if (!meal.ingredients || meal.ingredients.length === 0) {
    return ''
  }

  const todoComponents = meal.ingredients.map((ing: any, index) => {
    const uid = `${meal.id}-ingredient-${index}-${dateISO}@week-meal-planner`
    const summary = formatIngredient(ing)
    const description = `Ingredient for: ${meal.title} (${meal.label})`

    return [
      'BEGIN:VTODO',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:NEEDS-ACTION',
      'PRIORITY:5',
      'END:VTODO',
    ]
  })

  const allLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Week Meal Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...todoComponents.flat(),
    'END:VCALENDAR'
  ]

  return allLines.join('\r\n')
}

export function downloadIngredientsICS(meal: Meal, dateISO: string) {
  const icsContent = generateTodoICS(meal, dateISO)
  if (!icsContent) return
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${meal.title.toLowerCase().replace(/\s+/g, '-')}-ingredients.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}