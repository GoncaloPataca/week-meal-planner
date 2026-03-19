export interface ThemeVars {
  bg: string
  surface: string
  muted: string
  border: string
  text: string
  primary: string
}

export interface Theme {
  id: string
  name: string
  /** Four swatches shown in the picker: bg, primary, muted, border */
  preview: [string, string, string, string]
  light: ThemeVars
  dark: ThemeVars
}

export const themes: Theme[] = [
  {
    id: 'warm-peach',
    name: 'Warm Peach',
    preview: ['#FAF3E0', '#D4723A', '#CFC2B8', '#E8DCCF'],
    light: {
      bg: '#FAF3E0',
      surface: '#FFF8F2',
      muted: '#CFC2B8',
      border: '#E8DCCF',
      text: '#3D2B1F',
      primary: '#D4723A',
    },
    dark: {
      bg: '#1A100A',
      surface: '#231510',
      muted: '#7A5A48',
      border: '#2E1E12',
      text: '#F0E4D8',
      primary: '#D4723A',
    },
  },
  {
    id: 'sage-cream',
    name: 'Sage & Cream',
    preview: ['#F5F5ED', '#5F8B65', '#9BAE9B', '#C8D4C0'],
    light: {
      bg: '#F5F5ED',
      surface: '#FAFAF5',
      muted: '#9BAE9B',
      border: '#C8D4C0',
      text: '#2D3B2D',
      primary: '#5F8B65',
    },
    dark: {
      bg: '#0F160F',
      surface: '#141C14',
      muted: '#4A604A',
      border: '#1E2E1E',
      text: '#E2EEE2',
      primary: '#7BAB82',
    },
  },
  {
    id: 'dusty-rose',
    name: 'Dusty Rose',
    preview: ['#FBF0F0', '#C46E6E', '#C9AAAA', '#DFCACA'],
    light: {
      bg: '#FBF0F0',
      surface: '#FFF5F5',
      muted: '#C9AAAA',
      border: '#DFCACA',
      text: '#3D2020',
      primary: '#C46E6E',
    },
    dark: {
      bg: '#170A0A',
      surface: '#200D0D',
      muted: '#6A4040',
      border: '#2A1212',
      text: '#F5E8E8',
      primary: '#C46E6E',
    },
  },
  {
    id: 'lavender-fog',
    name: 'Lavender Fog',
    preview: ['#F4F0F8', '#7B6EC8', '#B8B0CC', '#D4CCDF'],
    light: {
      bg: '#F4F0F8',
      surface: '#FAF8FD',
      muted: '#B8B0CC',
      border: '#D4CCDF',
      text: '#2D2840',
      primary: '#7B6EC8',
    },
    dark: {
      bg: '#0E0B18',
      surface: '#130F1F',
      muted: '#4A4070',
      border: '#1A152A',
      text: '#EBE8F5',
      primary: '#9D91D4',
    },
  },
  {
    id: 'butter-yellow',
    name: 'Butter Yellow',
    preview: ['#FEFAED', '#A88A20', '#C8BC8A', '#E0D8B0'],
    light: {
      bg: '#FEFAED',
      surface: '#FFFDF5',
      muted: '#C8BC8A',
      border: '#E0D8B0',
      text: '#3D3420',
      primary: '#A88A20',
    },
    dark: {
      bg: '#12100A',
      surface: '#1C1800',
      muted: '#5A4E20',
      border: '#2A2400',
      text: '#F5F0E0',
      primary: '#C8A83A',
    },
  },
]

export const DEFAULT_THEME_ID = 'warm-peach'
export const PALETTE_STORAGE_KEY = 'app-palette'

/** Writes CSS variables directly onto <html>. Called on mount + whenever dark mode or palette changes. */
export function applyTheme(themeId: string, isDark: boolean): void {
  const theme = themes.find(t => t.id === themeId) ?? themes[0]
  const vars = isDark ? theme.dark : theme.light
  const root = document.documentElement
  root.setAttribute('data-palette', themeId)
  root.style.setProperty('--bg', vars.bg)
  root.style.setProperty('--surface', vars.surface)
  root.style.setProperty('--muted', vars.muted)
  root.style.setProperty('--border', vars.border)
  root.style.setProperty('--text', vars.text)
  root.style.setProperty('--primary', vars.primary)
}
