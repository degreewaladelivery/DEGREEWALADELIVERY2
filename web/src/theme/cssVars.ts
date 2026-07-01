/**
 * theme/cssVars.ts
 * --------------------------------------------------------------------------
 * Turns our shared design tokens (TypeScript) into CSS variables on :root,
 * so plain CSS files can use var(--brand), var(--radius-lg), etc.
 *
 * This keeps a SINGLE source of truth: change a colour in shared/tokens.ts
 * and both the JS (inline styles) and the CSS pick it up. We call this once
 * at startup, before React renders.
 */

import { colors, fontSizes, radius, shadows, spacing } from '@shared/tokens';

export function applyThemeVars() {
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

  // Colours  ->  --brand, --brand-dark, --text, --bg-soft ...
  set('--brand', colors.brand);
  set('--brand-dark', colors.brandDark);
  set('--brand-deep', colors.brandDeep);
  set('--brand-tint', colors.brandTint);
  set('--text', colors.text);
  set('--text-muted', colors.textMuted);
  set('--text-faint', colors.textFaint);
  set('--bg', colors.bg);
  set('--bg-soft', colors.bgSoft);
  set('--surface', colors.surface);
  set('--bg-navy', colors.bgNavy);
  set('--border', colors.border);
  set('--border-strong', colors.borderStrong);
  set('--success', colors.success);
  set('--warning', colors.warning);
  set('--danger', colors.danger);
  set('--star', colors.star);

  // Spacing  ->  --space-xs ... --space-3xl   (numbers become "16px")
  for (const [k, v] of Object.entries(spacing)) set(`--space-${k}`, `${v}px`);
  // Radii    ->  --radius-sm ... --radius-pill
  for (const [k, v] of Object.entries(radius)) set(`--radius-${k}`, `${v}px`);
  // Font sizes -> --fs-xs ... --fs-4xl
  for (const [k, v] of Object.entries(fontSizes)) set(`--fs-${k}`, `${v}px`);

  // Shadows
  set('--shadow-sm', shadows.sm);
  set('--shadow-md', shadows.md);
  set('--shadow-lg', shadows.lg);
  set('--shadow-brand', shadows.brand);
}
