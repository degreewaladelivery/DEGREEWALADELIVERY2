import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeVars } from './theme/cssVars'
import { enableDesignPreviewMode } from './lib/designPreview'
import './index.css'
import App from './App.tsx'

// Inject our brand colours/spacing as CSS variables BEFORE the first render,
// so every component can use var(--brand) and friends from the start.
applyThemeVars()

// DESIGN-PREVIEW MODE: buttons & links do nothing (animations still play).
// Remove this line to restore full navigation/cart functionality.
enableDesignPreviewMode()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
