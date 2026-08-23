import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Product } from '@shared/types';
import { useCartStore } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import { Thumb } from './Thumb';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme';

export function ItemRow({ product }: { product: Product }) {
  const navigation = useNavigation<any>();
  const qty = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);

  const onAdd = () => addItem(product);

  return (
    <View style={styles.row}>
      {/* Tapping the row opens the full item — the description here is clipped
          to two lines, and there was previously no way to read the rest. */}
      <View style={styles.thumb}>
        <Thumb src={product.imageUrl} emoji="🛒" tint="#F4F6F9" fontSize={22} style={styles.thumbImg} />
      </View>
      <TouchableOpacity
        style={styles.info}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ItemDetail', { productId: product.id })}
      >
        <Text style={styles.name}>{product.name}</Text>
        {product.unit ? <Text style={styles.unit}>{product.unit}</Text> : null}
        {product.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <Text style={styles.price}>{formatRupees(product.price)}</Text>
        <Text style={styles.more}>More details ›</Text>
      </TouchableOpacity>

      {qty === 0 ? (
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={onAdd}>
          <Text style={styles.addText}>Add +</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.stepper}>
          <TouchableOpacity onPress={() => decrement(product.id)} hitSlop={8}>
            <Text style={styles.stepBtn}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{qty}</Text>
          <TouchableOpacity onPress={() => addItem(product)} hitSlop={8}>
            <Text style={styles.stepBtn}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    flexShrink: 0,
  },
  thumbImg: { borderRadius: 0 },
  info: { flex: 1 },
  name: { fontSize: fontSizes.md + 0.5, fontWeight: fontWeights.bold, color: colors.text },
  unit: { fontSize: fontSizes.xs + 0.5, fontWeight: fontWeights.semibold, color: colors.textMuted, marginTop: 2 },
  desc: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  more: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.brand, marginTop: 2 },
  price: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text, marginTop: 6 },

  addBtn: {
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addText: { color: colors.brand, fontWeight: fontWeights.heading, fontSize: fontSizes.sm },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepBtn: { color: colors.brand, fontSize: fontSizes.lg, fontWeight: fontWeights.heading, width: 18, textAlign: 'center' },
  qty: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text, minWidth: 16, textAlign: 'center' },
});
