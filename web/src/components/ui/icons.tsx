/**
 * components/ui/icons.tsx
 * --------------------------------------------------------------------------
 * Inline line-icons (Feather-style, MIT). They draw with
 * `stroke="currentColor"`, so you set their colour with CSS `color`
 * (e.g. color: var(--brand) makes them orange). Crisp at any size and fully
 * recolourable — unlike emojis.
 */

interface IconProps {
  size?: number;
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

const Svg = ({ size = 22, children }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} {...base}>
    {children}
  </svg>
);

/* ---- Hero badges -------------------------------------------------------- */

/** Grid — "Wide Range of Categories" */
export const GridIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);

/** Truck — "Fast Delivery" / "Easy Mode of Delivery" */
export const TruckIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="1" y="3" width="15" height="13" rx="1.5" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </Svg>
);

/** Award — "Best Quality" */
export const AwardIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </Svg>
);

/** Lock — "Easy & Secure Payments" */
export const LockIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

/* ---- Why Choose --------------------------------------------------------- */

/** Leaf — "Healthy & Hygienic" */
export const LeafIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
  </Svg>
);

/** Coffee — "Gourmet Options" */
export const CoffeeIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </Svg>
);

/** Sparkles — "Plan a Party" */
export const SparklesIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
    <path d="M19 14l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" />
  </Svg>
);

/** Gift — "Gift Cards Collection" */
export const GiftIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </Svg>
);

/** Calendar — "Schedule Your Order" */
export const CalendarIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);

/* ---- Stats -------------------------------------------------------------- */

/** Buildings — "Cities" */
export const BuildingIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M3 21h18" />
    <rect x="4" y="9" width="7" height="12" />
    <rect x="13" y="4" width="7" height="17" />
    <path d="M7 13h.01M7 17h.01M16 8h.01M16 12h.01M16 16h.01" />
  </Svg>
);

/** Users — "Happy Customers" */
export const UsersIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

/** Store — "Shops" */
export const StoreIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M3 9 4.5 4h15L21 9" />
    <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
    <path d="M3 9h18" />
    <path d="M9 20v-5h6v5" />
  </Svg>
);

/** Shopping bag — "Products" */
export const BagIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Svg>
);

/* ---- App features ------------------------------------------------------- */

/** Tag — "Exclusive Offers" */
export const TagIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Svg>
);

/** Credit card — "Easy Payments" */
export const CreditCardIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </Svg>
);

/** Map pin — "Live Order Tracking" / header location */
export const MapPinIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);

/** Headphones — "Quick Support" */
export const HeadphonesIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </Svg>
);

/* ---- Header ------------------------------------------------------------- */

/** House — bottom-nav "Home" tab */
export const HomeIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  </Svg>
);

/** Person — bottom-nav "Account" tab */
export const UserIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
  </Svg>
);

/** Shopping cart — header cart button */
export const CartIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </Svg>
);

/** Search — hero search bar */
export const SearchIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

/** Hamburger menu — mobile nav toggle */
export const MenuIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </Svg>
);

/** Close (X) — mobile nav close */
export const XIcon = ({ size }: IconProps) => (
  <Svg size={size}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);
