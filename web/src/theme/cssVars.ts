import { colors, fontSizes, radius, shadows, spacing } from '@shared/tokens';

export function applyThemeVars() {
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(name, value);

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

  for (const [k, v] of Object.entries(spacing)) set(`--space-${k}`, `${v}px`);

  for (const [k, v] of Object.entries(radius)) set(`--radius-${k}`, `${v}px`);

  for (const [k, v] of Object.entries(fontSizes)) set(`--fs-${k}`, `${v}px`);

  set('--shadow-sm', shadows.sm);
  set('--shadow-md', shadows.md);
  set('--shadow-lg', shadows.lg);
  set('--shadow-brand', shadows.brand);
}
