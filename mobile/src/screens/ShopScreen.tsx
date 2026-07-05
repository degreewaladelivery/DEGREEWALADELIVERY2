import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Product } from '@shared/types';
import { fetchShopPage, type ShopPage } from '../lib/catalog';
import type { HomeStackParamList } from '../navigation/types';
import { Thumb } from '../components/Thumb';
import { ItemRow } from '../components/ItemRow';
import { useCartStore, selectCount } from '../store/cartStore';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const BRAND = '#FF6B00';
type Nav = NativeStackNavigationProp<HomeStackParamList, 'Shop'>;

function groupBySection(products: Product[]): Record<string, Product[]> {
  const groups: Record<string, Product[]> = {};
  for (const p of products) {
    const key = p.section ?? 'Menu';
    (groups[key] ??= []).push(p);
  }
  return groups;
}

export function ShopScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'Shop'>>();
  const insets = useSafeAreaInsets();

  const [page, setPage] = useState<ShopPage | null>(null);
  const [loading, setLoading] = useState(true);
  const cartCount = useCartStore((s) => selectCount(s.items));

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchShopPage(params.shopId)
      .then((p) => active && setPage(p))
      .catch(() => active && setPage(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.shopId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }
  if (!page) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Shop not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { shop, products } = page;
  const sections = groupBySection(products);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + spacing.md }}>
        <View style={styles.body}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          {/* Shop header */}
          <View style={styles.header}>
            <View style={styles.thumb}>
              <Thumb src={shop.imageUrl} emoji="🏬" tint="#FFF3E0" fontSize={44} />
            </View>
            <View style={styles.meta}>
              <Text style={styles.name}>{shop.name}</Text>
              {shop.description ? <Text style={styles.desc}>{shop.description}</Text> : null}
              <View style={styles.facts}>
                {shop.rating > 0 ? <Text style={styles.rating}>★ {shop.rating.toFixed(1)}</Text> : null}
                {shop.deliveryTime ? <Text style={styles.fact}>⏱ {shop.deliveryTime}</Text> : null}
              </View>
            </View>
          </View>

          {/* Menu grouped by section */}
          {products.length === 0 ? (
            <Text style={styles.none}>No items here yet — check back soon!</Text>
          ) : (
            Object.entries(sections).map(([section, list]) => (
              <View key={section} style={styles.section}>
                <Text style={styles.sectionTitle}>{section}</Text>
                {list.map((p) => (
                  <ItemRow key={p.id} product={p} />
                ))}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 96 + insets.bottom }} />
      </ScrollView>

      {cartCount > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { bottom: insets.bottom + 84 }]}
          activeOpacity={0.9}
          onPress={() => navigation.getParent()?.navigate('Cart' as never)}
        >
          <Text style={styles.cartBarText}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</Text>
          <Text style={styles.cartBarCta}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bg },
  notFound: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  backLink: { color: colors.brand, fontWeight: fontWeights.semibold },

  body: { paddingHorizontal: spacing.lg },
  back: { color: colors.textMuted, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm, marginBottom: spacing.md },

  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  thumb: { width: 92, height: 92, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface },
  meta: { flex: 1 },
  name: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.text },
  desc: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 3 },
  facts: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  rating: { backgroundColor: colors.success, color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  fact: { fontSize: fontSizes.sm, color: colors.textMuted },

  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text, marginBottom: spacing.xs },
  none: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },

  cartBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  cartBarText: { color: '#fff', fontWeight: fontWeights.bold, fontSize: fontSizes.md },
  cartBarCta: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
});
