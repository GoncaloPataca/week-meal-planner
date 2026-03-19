import { Meal } from '../types'

function parseDuration(timeStr?: string): number {
  if (!timeStr) return 0
  const match = timeStr.match(/(\d+)\s*(min|hour|hr|h)/i)
  if (!match) return 0
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  return unit.includes('h') ? value * 60 : value
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function generateICS(meal: Meal, dateISO: string): string {
  // Use meal.time if available, otherwise default to 10:00 AM
  const timeStr = meal.time || '10:00'
  const date = new Date(dateISO + 'T' + timeStr + ':00')
  
  // Calculate duration from prep + cook time
  const prepMinutes = parseDuration(meal.prep)
  const cookMinutes = parseDuration(meal.cook)
  const totalMinutes = prepMinutes + cookMinutes || 60 // default 1 hour if no times
  
  const endDate = new Date(date.getTime() + totalMinutes * 60 * 1000)
  
  // Build description with ingredients and steps
  let description = `${meal.title}\\n\\n`
  
  if (meal.servings) {
    description += `Servings: ${meal.servings}\\n`
  }
  if (meal.prep) {
    description += `Prep time: ${meal.prep}\\n`
  }
  if (meal.cook) {
    description += `Cook time: ${meal.cook}\\n`
  }
  if (meal.tags) {
    description += `Tags: ${meal.tags.join(', ')}\\n`
  }
  
  if (meal.ingredients && meal.ingredients.length > 0) {
    description += `\\nIngredients:\\n`
    meal.ingredients.forEach(ing => {
      description += `- ${ing.amount ? ing.amount + ' ' : ''}${ing.name}\\n`
    })
  }
  
  if (meal.steps && meal.steps.length > 0) {
    description += `\\nSteps:\\n`
    meal.steps.forEach((step, i) => {
      description += `${i + 1}. ${step}\\n`
    })
  }
  
  if (meal.notes) {
    description += `\\nNotes: ${meal.notes}\\n`
  }
  
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
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
  
  return ics
}

export function generateMultipleICS(meals: Array<{ meal: Meal, dateISO: string }>, filename: string): string {
  const events = meals.map(({ meal, dateISO }) => {
    const timeStr = meal.time || '10:00'
    const date = new Date(dateISO + 'T' + timeStr + ':00')
    
    const prepMinutes = parseDuration(meal.prep)
    const cookMinutes = parseDuration(meal.cook)
    const totalMinutes = prepMinutes + cookMinutes || 60
    
    const endDate = new Date(date.getTime() + totalMinutes * 60 * 1000)
    
    let description = `${meal.title}\\n\\n`
    
    if (meal.servings) description += `Servings: ${meal.servings}\\n`
    if (meal.prep) description += `Prep time: ${meal.prep}\\n`
    if (meal.cook) description += `Cook time: ${meal.cook}\\n`
    if (meal.tags) description += `Tags: ${meal.tags.join(', ')}\\n`
    
    if (meal.ingredients && meal.ingredients.length > 0) {
      description += `\\nIngredients:\\n`
      meal.ingredients.forEach(ing => {
        description += `- ${ing.amount ? ing.amount + ' ' : ''}${ing.name}\\n`
      })
    }
    
    if (meal.steps && meal.steps.length > 0) {
      description += `\\nSteps:\\n`
      meal.steps.forEach((step, i) => {
        description += `${i + 1}. ${step}\\n`
      })
    }
    
    if (meal.notes) description += `\\nNotes: ${meal.notes}\\n`
    
    return [
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(date)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `UID:${meal.id}-${dateISO}@week-meal-planner`,
      `SUMMARY:${meal.label}: ${meal.title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT'
    ].join('\r\n')
  })
  
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Week Meal Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n')
  
  return ics
}

export function downloadICS(meal: Meal, dateISO: string) {
  const ics = generateICS(meal, dateISO)
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

export function downloadMultipleICS(meals: Array<{ meal: Meal, dateISO: string }>, filename: string) {
  const ics = generateMultipleICS(meals, filename)
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

  const todoComponents = meal.ingredients.map((ing, index) => {
    const uid = `${meal.id}-ingredient-${index}-${dateISO}@week-meal-planner`
    const summary = `${ing.amount ? ing.amount + ' ' : ''}${ing.name}`
    const description = `Ingredient for: ${meal.title} (${meal.label})`
    
    return [
      'BEGIN:VTODO',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:NEEDS-ACTION',
      'PRIORITY:5',
      'END:VTODO'
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