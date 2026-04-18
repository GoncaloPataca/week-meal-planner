#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parseDuration(timeStr) {
  if (timeStr == null) return 0
  if (typeof timeStr === 'number') return timeStr
  const s = String(timeStr).trim()
  if (!s) return 0
  const match = s.match(/(\d+)\s*(min|minute|minutes|hour|hr|h|m)/i)
  if (!match) {
    const n = parseInt(s)
    return isNaN(n) ? 0 : n
  }
  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  return (unit === 'h' || unit.startsWith('hour') || unit === 'hr') ? value * 60 : value
}

function formatICSDate(d){
  return new Date(d).toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z'
}

function formatIngredient(ing) {
  if (!ing) return ''
  if (typeof ing === 'string') return ing
  const amount = ing.amount != null ? String(ing.amount) : ''
  const unit = ing.unit ? ('' + ing.unit) : ''
  const item = ing.item || ing.name || ''
  return [amount + (unit ? unit : ''), item].filter(Boolean).join(' ')
}

(function main(){
  try {
    const recipePath = path.join(__dirname, '..', 'pipeline', 'recipes', '10-minute-smoky-harissa-creamy-butter-beans-lunch.json')
    if (!fs.existsSync(recipePath)) {
      console.error('Recipe file not found:', recipePath)
      process.exit(2)
    }
    const raw = fs.readFileSync(recipePath, 'utf8')
    const meal = JSON.parse(raw)

    const start = new Date()
    const prep = meal.prep ?? 0
    const cook = meal.cook ?? meal.cookTime ?? 0
    const prepM = parseDuration(prep)
    const cookM = parseDuration(cook)
    const duration = (prepM + cookM) || 60
    const end = new Date(start.getTime() + duration * 60 * 1000)

    let desc = `${meal.name || meal.title}\n\n`
    if (meal.servings) desc += `Servings: ${meal.servings}\\n`
    if (prepM) desc += `Prep time: ${prepM} min\\n`
    if (cookM) desc += `Cook time: ${cookM} min\\n`

    if (Array.isArray(meal.i18n && meal.i18n.pt && meal.i18n.pt.ingredientsParsed) && meal.i18n.pt.ingredientsParsed.length > 0) {
      // handled below, but keep safe
    }

    if (Array.isArray(meal.ingredientsParsed) && meal.ingredientsParsed.length > 0) {
      desc += `\\nIngredients:\\n`
      meal.ingredientsParsed.forEach(i => { desc += `- ${formatIngredient(i)}\\n` })
    } else if (meal.i18n && meal.i18n.pt && Array.isArray(meal.i18n.pt.ingredientsParsed) && meal.i18n.pt.ingredientsParsed.length > 0) {
      desc += `\\nIngredients:\\n`
      meal.i18n.pt.ingredientsParsed.forEach(i => { desc += `- ${formatIngredient(i)}\\n` })
    } else if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
      desc += `\\nIngredients:\\n`
      meal.ingredients.forEach(i => { desc += `- ${i}\\n` })
    }

    if (Array.isArray(meal.steps) && meal.steps.length > 0) {
      desc += `\\nSteps:\\n`
      meal.steps.forEach((s, idx) => { desc += `${idx+1}. ${s}\\n\\n` })
    } else if (meal.i18n && meal.i18n.pt && Array.isArray(meal.i18n.pt.steps) && meal.i18n.pt.steps.length > 0) {
      desc += `\\nSteps:\\n`
      meal.i18n.pt.steps.forEach((s, idx) => { desc += `${idx+1}. ${s}\\n\\n` })
    }

    if (meal.url) desc += `\\nURL: ${meal.url}\\n`

    const uid = `${toSlug(meal.name || meal.title)}-${Date.now()}@week-meal-planner`

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Week Meal Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `UID:${uid}`,
      `SUMMARY:${(meal.name || meal.title).replace(/\r?\n/g,' ' )}`,
      `DESCRIPTION:${desc.replace(/\n/g,'\\n')}`,
      ...(meal.url ? [`URL:${meal.url}`] : []),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ]

    const ics = icsLines.join('\r\n')
    const startStamp = start.toISOString().slice(0,19).replace(/[:T]/g,'-')
    const filename = `${toSlug(meal.name || meal.title)}-${startStamp}.ics`
    const outPath = path.join(__dirname, '..', filename)
    fs.writeFileSync(outPath, ics, 'utf8')
    console.log(outPath)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
})()
