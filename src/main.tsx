import React from 'react'
import { createRoot } from 'react-dom/client'

const App: React.FC = () => (
  <main style={{fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh'}}>
    <h1>Hello World</h1>
  </main>
)

const rootElement = document.getElementById('app') as HTMLElement
const root = createRoot(rootElement)
root.render(<App />)
