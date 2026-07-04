/**
 * components/icons.tsx
 * --------------------------------------------------------------------------
 * React Native port of the web app's Feather-style line-icons
 * (web/src/components/ui/icons.tsx), using react-native-svg. Unlike CSS,
 * RN has no `currentColor` cascade, so each icon takes an explicit `color`
 * prop instead of inheriting it.
 */
import Svg, { Path, Circle, Rect, Line, Polygon, Polyline } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

const base = {
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/* ---- Hero badges -------------------------------------------------------- */

export const GridIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} {...base} />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} {...base} />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} {...base} />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} {...base} />
  </Svg>
);

export const TruckIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="1" y="3" width="15" height="13" rx="1.5" stroke={color} {...base} />
    <Polygon points="16 8 20 8 23 11 23 16 16 16 16 8" stroke={color} {...base} />
    <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} {...base} />
    <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} {...base} />
  </Svg>
);

export const AwardIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="8" r="7" stroke={color} {...base} />
    <Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" stroke={color} {...base} />
  </Svg>
);

export const LockIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} {...base} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} {...base} />
  </Svg>
);

/* ---- Why Choose --------------------------------------------------------- */

export const LeafIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" stroke={color} {...base} />
    <Path d="M2 21c0-3 1.85-5.36 5.08-6" stroke={color} {...base} />
  </Svg>
);

export const CoffeeIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={color} {...base} />
    <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={color} {...base} />
    <Line x1="6" y1="2" x2="6" y2="4" stroke={color} {...base} />
    <Line x1="10" y1="2" x2="10" y2="4" stroke={color} {...base} />
    <Line x1="14" y1="2" x2="14" y2="4" stroke={color} {...base} />
  </Svg>
);

export const SparklesIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" stroke={color} {...base} />
    <Path d="M19 14l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" stroke={color} {...base} />
  </Svg>
);

export const GiftIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polyline points="20 12 20 22 4 22 4 12" stroke={color} {...base} />
    <Rect x="2" y="7" width="20" height="5" stroke={color} {...base} />
    <Line x1="12" y1="22" x2="12" y2="7" stroke={color} {...base} />
    <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" stroke={color} {...base} />
    <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" stroke={color} {...base} />
  </Svg>
);

export const CalendarIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} {...base} />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={color} {...base} />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={color} {...base} />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} {...base} />
  </Svg>
);

/* ---- Stats -------------------------------------------------------------- */

export const BuildingIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 21h18" stroke={color} {...base} />
    <Rect x="4" y="9" width="7" height="12" stroke={color} {...base} />
    <Rect x="13" y="4" width="7" height="17" stroke={color} {...base} />
    <Path d="M7 13h.01M7 17h.01M16 8h.01M16 12h.01M16 16h.01" stroke={color} {...base} />
  </Svg>
);

export const UsersIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} {...base} />
    <Circle cx="9" cy="7" r="4" stroke={color} {...base} />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={color} {...base} />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} {...base} />
  </Svg>
);

export const StoreIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 9 4.5 4h15L21 9" stroke={color} {...base} />
    <Path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" stroke={color} {...base} />
    <Path d="M3 9h18" stroke={color} {...base} />
    <Path d="M9 20v-5h6v5" stroke={color} {...base} />
  </Svg>
);

export const BagIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={color} {...base} />
    <Line x1="3" y1="6" x2="21" y2="6" stroke={color} {...base} />
    <Path d="M16 10a4 4 0 0 1-8 0" stroke={color} {...base} />
  </Svg>
);

/* ---- App features / header ---------------------------------------------- */

export const TagIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke={color} {...base} />
    <Line x1="7" y1="7" x2="7.01" y2="7" stroke={color} {...base} />
  </Svg>
);

export const CreditCardIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke={color} {...base} />
    <Line x1="1" y1="10" x2="23" y2="10" stroke={color} {...base} />
  </Svg>
);

export const MapPinIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} {...base} />
    <Circle cx="12" cy="10" r="3" stroke={color} {...base} />
  </Svg>
);

export const HeadphonesIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke={color} {...base} />
    <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" stroke={color} {...base} />
    <Path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke={color} {...base} />
  </Svg>
);

export const HomeIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 11l9-8 9 8" stroke={color} {...base} />
    <Path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" stroke={color} {...base} />
  </Svg>
);

export const UserIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="8" r="4" stroke={color} {...base} />
    <Path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" stroke={color} {...base} />
  </Svg>
);

export const MicIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke={color} {...base} />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={color} {...base} />
    <Line x1="12" y1="19" x2="12" y2="23" stroke={color} {...base} />
  </Svg>
);

export const ZapIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} stroke="none" />
  </Svg>
);

export const SlidersIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Line x1="4" y1="21" x2="4" y2="14" stroke={color} {...base} />
    <Line x1="4" y1="10" x2="4" y2="3" stroke={color} {...base} />
    <Line x1="12" y1="21" x2="12" y2="12" stroke={color} {...base} />
    <Line x1="12" y1="8" x2="12" y2="3" stroke={color} {...base} />
    <Line x1="20" y1="21" x2="20" y2="16" stroke={color} {...base} />
    <Line x1="20" y1="12" x2="20" y2="3" stroke={color} {...base} />
    <Line x1="1" y1="14" x2="7" y2="14" stroke={color} {...base} />
    <Line x1="9" y1="8" x2="15" y2="8" stroke={color} {...base} />
    <Line x1="17" y1="16" x2="23" y2="16" stroke={color} {...base} />
  </Svg>
);

export const BookmarkIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke={color} {...base} />
  </Svg>
);

export const PercentCircleIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={color} {...base} />
    <Line x1="8.5" y1="15.5" x2="15.5" y2="8.5" stroke={color} {...base} />
    <Circle cx="9" cy="9" r="1.25" fill={color} stroke="none" />
    <Circle cx="15" cy="15" r="1.25" fill={color} stroke="none" />
  </Svg>
);

export const CartIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="9" cy="21" r="1" stroke={color} {...base} />
    <Circle cx="20" cy="21" r="1" stroke={color} {...base} />
    <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke={color} {...base} />
  </Svg>
);

export const SearchIcon = ({ size = 22, color = '#15172B' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="8" stroke={color} {...base} />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} {...base} />
  </Svg>
);
