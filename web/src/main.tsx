import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeVars } from './theme/cssVars'
import './index.css'
import App from './App.tsx'

// Inject our brand colours/spacing as CSS variables BEFORE the first render,
// so every component can use var(--brand) and friends from the start.
applyThemeVars()

// (Design-preview mode is OFF: the site is live and fully interactive, backed
// by real Supabase catalog data. To re-freeze it as a click-less design demo,
// import and call enableDesignPreviewMode() from './lib/designPreview'.)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
