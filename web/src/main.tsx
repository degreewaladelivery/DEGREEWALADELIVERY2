import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeVars } from './theme/cssVars'
import './index.css'
import App from './App.tsx'

// Inject our brand colours/spacing as CSS variables BEFORE the first render,
// so every component can use var(--brand) and friends from the start.
applyThemeVars()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
