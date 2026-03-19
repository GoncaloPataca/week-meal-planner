/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Crimson Pro', 'Georgia', 'serif'],
      },
      colors: {
        primary: {
          50: '#fff8f3',
          100: '#fdeedc',
          200: '#fbd6b8',
          300: '#f8b691',
          400: '#f39b69',
          500: '#ee7f3f',
          600: '#d96f35',
          700: '#b85a2b',
          800: '#944522',
          900: '#6f3219',
        },
        secondary: {
          50: '#f7fff6',
          100: '#e6ffee',
          200: '#c9f8dd',
          300: '#a9eec2',
          400: '#7fd9a0',
          500: '#54c07f',
          600: '#3fa468',
          700: '#2e8150',
          800: '#236241',
          900: '#174433',
        },
        accent: {
          50: '#fff6fb',
          100: '#ffeef5',
          200: '#ffd6ea',
          300: '#ffbadb',
          400: '#ff9cbe',
          500: '#ff6f9f',
          600: '#e05585',
          700: '#b83f67',
          800: '#8f2f4f',
          900: '#67223a',
        },
        bg: {
          DEFAULT: '#FAF3E0',
        },
        surface: {
          DEFAULT: '#FFF8F2',
        },
        muted: '#CFC2B8',
        border: '#E8DCCF',
      },
    },
  },
  plugins: [],
}
