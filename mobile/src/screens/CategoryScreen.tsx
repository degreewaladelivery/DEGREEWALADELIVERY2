import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { loadCached } from '../lib/cachedFetch';
import { fetchCategoryPage, type CategoryPage } from '../lib/catalog';
import type { HomeStackParamList } from '../navigation/types';
import { ItemRow } from '../components/ItemRow';
import { useCartStore, selectCount } from '../store/cartStore';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const BRAND = '#FF6B00';
type Nav = NativeStackNavigationProp<HomeStackParamList, 'Category'>;

export function CategoryScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'Category'>>();
  const insets = useSafeAreaInsets();

  const [page, setPage] = useState<CategoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const cartCount = useCartStore((s) => selectCount(s.items));

  // Draw the version we saw last time straight away, then refresh. A category
  // holds hundreds of items, so waiting on the network to show any of them is
  // the difference between instant and a spinner on every tap.
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadCached(`category:${params.categoryKey}`, () => fetchCategoryPage(params.categoryKey), (value) => {
      if (!active) return;
      setPage(value);
      setLoading(false);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [params.categoryKey]);

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
        <Text style={styles.notFound}>Category not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { category, products } = page;
  const items = activeSub ? products.filter((p) => p.section === activeSub) : products;

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.banner}>
          {category.imageUrl ? (
            <Image source={{ uri: category.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={styles.overlay} />
          <View style={[styles.bannerInner, { paddingTop: insets.top + spacing.md }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={styles.back}>← Home</Text>
            </TouchableOpacity>
            <Text style={styles.emoji}>{category.emoji}</Text>
            <Text style={styles.title}>{category.name}</Text>
            <Text style={styles.count}>
              {products.length} item{products.length === 1 ? '' : 's'} available
            </Text>
          </View>
        </View>

        <View style={styles.body}>

          {category.subCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
              <Pill label="All" active={activeSub === null} onPress={() => setActiveSub(null)} />
              {category.subCategories.map((sub) => (
                <Pill key={sub} label={sub} active={activeSub === sub} onPress={() => setActiveSub(sub)} />
              ))}
            </ScrollView>
          )}

          {items.length === 0 ? (
            <Text style={styles.none}>No items here yet — check back soon!</Text>
          ) : (
            items.map((p) => <ItemRow key={p.id} product={p} />)
          )}
        </View>

        <View style={{ height: 96 + insets.bottom }} />
      </ScrollView>

      {cartCount > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { bottom: insets.bottom + 84 }]}
          activeOpacity={0.9}
          onPress={() =>
            // Name the screen: without it we land wherever the Cart tab was left,
            // which after an order is the previous order's tracking page.
            (navigation.getParent() as unknown as {
              navigate: (name: string, params?: object) => void;
            } | undefined)?.navigate('Cart', { screen: 'CartMain' })
          }
        >
          <Text style={styles.cartBarText}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</Text>
          <Text style={styles.cartBarCta}>View Cart →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bgSoft },
  notFound: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  backLink: { color: colors.brand, fontWeight: fontWeights.semibold },

  banner: { minHeight: 210, backgroundColor: BRAND, justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(230,90,0,0.55)' },
  bannerInner: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  back: { color: 'rgba(255,255,255,0.92)', fontWeight: fontWeights.semibold, fontSize: fontSizes.sm, marginBottom: spacing.md },
  emoji: { fontSize: 40, marginBottom: 2 },
  title: { color: '#fff', fontSize: fontSizes.xl + 6, fontWeight: fontWeights.heading, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 10 },
  count: { color: 'rgba(255,255,255,0.95)', fontSize: fontSizes.sm, marginTop: 4 },

  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  pills: { gap: spacing.sm, paddingBottom: spacing.md },
  pill: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
  },
  pillActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  pillText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },
  pillTextActive: { color: '#fff' },

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
