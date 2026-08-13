import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeVars } from './theme/cssVars'
import { blockMapboxAttributionLinks } from './lib/mapboxLinks'
import './index.css'
import App from './App.tsx'

applyThemeVars()
blockMapboxAttributionLinks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
