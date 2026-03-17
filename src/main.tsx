import React from 'react'
import { createRoot } from 'react-dom/client'
import WeekBanner from './components/WeekBanner'
import './styles.css'

const App: React.FC = () => (
  <div>
    <h1 style={{fontFamily: "Georgia, 'Times New Roman', serif", margin: 0}}>This Week's Table</h1>
    <p style={{marginTop:6, color:'#666'}}>Seven days of meals. Tap a day to see the detail.</p>
    <WeekBanner />
  </div>
)

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
