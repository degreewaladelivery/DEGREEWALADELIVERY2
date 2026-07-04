/**
 * theme/index.ts
 * --------------------------------------------------------------------------
 * Turns shared/tokens.ts (the one source of design truth, also used by the
 * web app) into values React Native can consume directly: colors/spacing/
 * radius/fontSizes are already plain numbers/strings, so they're re-exported
 * as-is. Shadows are CSS box-shadow strings on web, so here they're
 * hand-translated into RN shadow style objects (iOS shadow* props +
 * Android elevation).
 */
import { Platform } from 'react-native';
import { colors, spacing, radius, fontSizes, categoryPalette } from '@shared/tokens';

export { colors, spacing, radius, fontSizes, categoryPalette };

type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const shadow = (offsetY: number, opacity: number, blur: number, elevation: number): ShadowStyle => ({
  shadowColor: '#101828',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'ios' ? opacity : 0,
  shadowRadius: blur,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  sm: shadow(1, 0.06, 2, 1),
  md: shadow(4, 0.08, 16, 4),
  lg: shadow(12, 0.12, 32, 10),
  brand: shadow(8, 0.28, 24, 8),
};

// Poppins isn't linked as a custom font yet, so headings use the system
// font at heavy weight — swap in Poppins-Bold later without touching call sites.
export const fontWeights = {
  heading: '800' as const,
  bold: '700' as const,
  semibold: '600' as const,
  regular: '400' as const,
};
