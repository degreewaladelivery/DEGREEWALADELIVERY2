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
  sm: shadow(1, 0.05, 3, 1),
  md: shadow(6, 0.08, 20, 4),
  lg: shadow(14, 0.1, 40, 10),
  brand: shadow(6, 0.3, 20, 8),
};

export const fontWeights = {
  heading: '800' as const,
  bold: '700' as const,
  semibold: '600' as const,
  regular: '400' as const,
};
