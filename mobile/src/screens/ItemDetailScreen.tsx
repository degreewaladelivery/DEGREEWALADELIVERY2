import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product } from '@shared/types';
import { fetchProductById } from '../lib/catalog';
import { useCartStore } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import { useTabBarSpace } from '../lib/tabBarSpace';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

export function ItemDetailScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'ItemDetail'>>();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const qty = useCartStore((s) => (product ? s.items[product.id]?.quantity ?? 0 : 0));
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);

  useEffect(() => {
    let active = true;
    fetchProductById(params.productId)
      .then((found) => {
        if (!active) return;
        setProduct(found);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setProduct(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.productId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Item not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unavailable = !product.isAvailable;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomSpace + spacing.xl }}
      >
        <View style={[styles.imageWrap, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          {/* "contain", not "cover": this is the screen someone opens to look at
              the product, so the whole photo has to be visible. Cover fills the
              box by cropping, which on a tall photo shows a band from the middle
              and hides what the customer came to see. */}
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Text style={styles.imageEmoji}>🛒</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          {product.unit ? <Text style={styles.unit}>{product.unit}</Text> : null}
          <Text style={styles.price}>{formatRupees(product.price)}</Text>

          {unavailable ? (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Currently unavailable</Text>
            </View>
          ) : qty === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.9}
              onPress={() => addItem(product)}
            >
              <Text style={styles.addText}>Add to Cart</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => decrement(product.id)} hitSlop={10}>
                <Text style={styles.stepBtn}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{qty} in cart</Text>
              <TouchableOpacity onPress={() => addItem(product)} hitSlop={10}>
                <Text style={styles.stepBtn}>+</Text>
              </TouchableOpacity>
            </View>
          )}

          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              {/* Untruncated, unlike the list row — seeing the whole thing is
                  the reason for opening this screen. */}
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  notFound: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  backLink: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.brand },

  imageWrap: { backgroundColor: colors.surface, paddingBottom: spacing.lg },
  backBtn: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  back: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  image: {
    marginHorizontal: spacing.lg,
    height: 280,
    borderRadius: radius.lg,
    // A plain backdrop behind the letterboxing, so a photo that does not fill
    // the box reads as deliberate rather than broken.
    backgroundColor: '#fff',
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 64 },

  body: { padding: spacing.lg, gap: spacing.sm },
  name: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.text },
  unit: { fontSize: fontSizes.sm, color: colors.textMuted },
  price: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heading,
    color: colors.brand,
    marginTop: spacing.xs,
  },

  addBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.brand,
  },
  addText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  stepBtn: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.brand },
  qty: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },

  soldOut: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  soldOutText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.textMuted },

  section: { marginTop: spacing.lg, gap: spacing.xs },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text },
  description: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
});
