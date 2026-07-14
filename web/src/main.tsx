import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeVars } from './theme/cssVars'
import './index.css'
import App from './App.tsx'

applyThemeVars()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
