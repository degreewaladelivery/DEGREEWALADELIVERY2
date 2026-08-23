import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  SORT_LABELS,
  type ProductFilters,
  type ProductSort,
} from '@shared/productFilters';
import { colors, spacing, fontSizes, fontWeights } from '../theme';

const SORTS = Object.keys(SORT_LABELS) as Exclude<ProductSort, 'default'>[];

/**
 * Sort and stock controls for a list of items.
 *
 * Every option is a visible toggle rather than a menu behind a "Filters" button:
 * there are only four of them, and a control the customer can see the state of
 * beats one they have to open to find out what it is currently doing.
 */
export function ItemFilters({
  filters,
  onChange,
}: {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip
        label="In stock"
        active={filters.inStockOnly}
        onPress={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
      />
      {SORTS.map((sort) => (
        <Chip
          key={sort}
          label={SORT_LABELS[sort]}
          active={filters.sort === sort}
          // Tapping the active sort clears it, so there is always a way back to
          // the catalogue's own order without hunting for a "reset".
          onPress={() =>
            onChange({ ...filters, sort: filters.sort === sort ? 'default' : sort })
          }
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textMuted },
  chipTextActive: { color: colors.brand },
});
