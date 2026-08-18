import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchCategories, fetchShops, fetchCategoryItemCounts } from '../lib/catalog';
import { loadCached } from '../lib/cachedFetch';
import type { HomeStackParamList } from '../navigation/types';
import type { Category, Shop } from '@shared/types';
import { categoryPalette } from '@shared/tokens';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';
import { getBrandImage, getCategoryImage, getShopImage } from '../lib/images';
import { Thumb } from '../components/Thumb';
import { LocationSheet } from '../components/LocationSheet';
import { useLocationStore } from '../store/locationStore';
import { MapPinIcon, SearchIcon, MicIcon, SlidersIcon, ZapIcon, BookmarkIcon, PercentCircleIcon } from '../components/icons';

const { width: SCREEN_W } = Dimensions.get('window');

const OFFERS = [
  '₹75 OFF above ₹199',
  '40% OFF up to ₹120',
  '₹150 OFF above ₹499',
  '50% OFF on select items',
  'FREE DELIVERY',
  '30% OFF up to ₹80',
  '₹100 OFF above ₹349',
  'Buy 1 Get 1',
];
const VOTES = ['By 8.3K+', 'By 2.1K+', 'By 950+', 'By 1.4K+'];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'HomeMain'>>();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const heroArt = getBrandImage('hero');
  const insets = useSafeAreaInsets();
  const location = useLocationStore((s) => s.location);
  const prompted = useLocationStore((s) => s.prompted);
  const hydrated = useLocationStore((s) => s.hydrated);
  const [locationOpen, setLocationOpen] = useState(false);

  // First launch: ask before they browse, so every fee they see is their real fee.
  const showLocation = locationOpen || (hydrated && !location && !prompted);

  const scrollRef = useRef<ScrollView>(null);
  const featuredY = useRef(0);

  // Draw the last known catalogue immediately, then correct it from the
  // network. Opening to a blank screen while Supabase answers — or forever,
  // with no signal — is the single biggest thing that made this feel slow.
  useEffect(() => {
    loadCached('categories', fetchCategories, setCategories);
    loadCached('shops', fetchShops, setShops);
    loadCached('itemCounts', fetchCategoryItemCounts, setItemCounts);
  }, []);

  useEffect(() => {
    if (params?.scrollTo === 'featured') {
      scrollRef.current?.scrollTo({ y: featuredY.current, animated: true });
    }
  }, [params?.scrollTo]);

  const featuredShops = shops.filter((s) => s.isFeatured);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.top}>
          <TouchableOpacity
            style={styles.loc}
            activeOpacity={0.7}
            onPress={() => setLocationOpen(true)}
          >
            <MapPinIcon size={20} color={colors.brand} />
            <View style={styles.locText}>
              <Text style={styles.locTitle}>
                {location ? `${location.label} ▾` : 'Set your location ▾'}
              </Text>
              <Text style={styles.locSub} numberOfLines={1}>
                {location ? location.address : 'Tap to tell us where to deliver'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>

        <View style={styles.searchBarWrap}>
          <View style={styles.search}>
            <SearchIcon size={18} color={colors.brand} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => {
                if (query.trim().length >= 2) {
                  navigation.navigate('Search', { query: query.trim() });
                }
              }}
              placeholder="Search for food, grocery, medicine…"
              placeholderTextColor={colors.textFaint}
              returnKeyType="search"
            />
            <MicIcon size={17} color={colors.brand} />
          </View>
        </View>

        {heroArt && (
          <View style={styles.banner}>
            <Image source={heroArt} style={styles.bannerImg} resizeMode="cover" />
            <TouchableOpacity style={styles.bannerCta} activeOpacity={0.85}>
              <Text style={styles.bannerCtaText}>ORDER NOW ›</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity style={styles.pill} activeOpacity={0.7}>
            <SlidersIcon size={14} color={colors.text} />
            <Text style={styles.pillText}>Filters ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} activeOpacity={0.7}>
            <ZapIcon size={13} color={colors.success} />
            <Text style={styles.pillText}>Near &amp; Fast</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} activeOpacity={0.7}>
            <Text style={styles.pillText}>No packaging charges</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.section}>
          <Text style={styles.heading}>Recommended for you</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recoRail}
          >
            {categories.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={styles.recoCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Category', { categoryKey: c.key })}
              >
                <View style={styles.recoImgWrap}>
                  <Thumb
                    src={c.imageUrl ?? getCategoryImage(c.key)}
                    emoji={c.emoji}
                    tint={c.tint}
                    fontSize={40}
                    style={styles.recoImg}
                  />
                  {c.key === 'food' && (
                    <View style={styles.offerRibbon}>
                      <Text style={styles.offerRibbonText}>{OFFERS[i % OFFERS.length]}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.recoName}>{c.name}</Text>
                <View style={styles.fastRow}>
                  <ZapIcon size={12} color={colors.success} />
                  <Text style={styles.fastText}>
                    {itemCounts[c.id] ?? 0} item{(itemCounts[c.id] ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View
          style={[styles.section, styles.feedSection]}
          onLayout={(e) => {
            featuredY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.heading}>{shops.length} shops delivering to you</Text>
          <Text style={styles.subheading}>Featured</Text>

          {featuredShops.map((s, i) => {
            const pal = categoryPalette[s.categoryKey];
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.featCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Shop', { shopId: s.id })}
              >
                <View style={styles.featImgWrap}>
                  <Thumb
                    src={s.imageUrl ?? getShopImage(s.id)}
                    emoji={pal.emoji}
                    tint={pal.tint}
                    fontSize={64}
                    style={styles.featImg}
                  />
                  <View style={styles.featBookmark}>
                    <BookmarkIcon size={20} color="#fff" />
                  </View>
                </View>
                <View style={styles.featBody}>
                  <View style={styles.featRow}>
                    <Text style={styles.featName}>{s.name}</Text>
                    <View style={styles.featRatingCol}>
                      <View style={styles.featRatingPill}>
                        <Text style={styles.featRatingText}>★ {s.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.featVotes}>{VOTES[i % VOTES.length]}</Text>
                    </View>
                  </View>
                  <View style={styles.fastRow}>
                    <ZapIcon size={12} color={colors.success} />
                    <Text style={styles.fastText}>Near &amp; Fast</Text>
                  </View>
                  <View style={styles.dashedDivider} />
                  <View style={styles.featOfferRow}>
                    <PercentCircleIcon size={17} color="#2563EB" />
                    <Text style={styles.featOfferText}>{OFFERS[(i + 3) % OFFERS.length]}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 78 + insets.bottom }} />
      </ScrollView>

      <LocationSheet visible={showLocation} onClose={() => setLocationOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  screen: { flex: 1, backgroundColor: colors.bgSoft },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.bg,
  },
  loc: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flexShrink: 1 },
  locText: { flexShrink: 1 },
  locTitle: { fontSize: fontSizes.lg - 1, fontWeight: fontWeights.heading, color: colors.text },
  locSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  searchBarWrap: { backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg - 2,
    ...shadows.sm,
  },
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, padding: 0 },

  banner: {
    marginTop: spacing.xs,
    width: SCREEN_W,
    height: SCREEN_W * 0.9,
    overflow: 'hidden',
  },
  bannerImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_W,
  },
  bannerCta: {
    position: 'absolute',
    left: '50%',
    bottom: 16,
    transform: [{ translateX: -70 }],
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.pill,
    ...shadows.lg,
  },
  bannerCtaText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.sm, letterSpacing: 1 },

  filters: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 1,
    paddingVertical: spacing.sm + 1,
  },
  pillText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.text },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  feedSection: { paddingTop: spacing.lg },
  heading: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  subheading: { fontSize: fontSizes.md, color: colors.textFaint, marginTop: 4, marginBottom: spacing.sm },

  recoRail: { gap: spacing.md, paddingVertical: spacing.md },
  recoCard: { width: 168 },
  recoImgWrap: { width: '100%', height: 150, borderRadius: radius.xl - 2, overflow: 'hidden' },
  recoImg: { borderRadius: 0 },
  offerRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxWidth: '92%',
    backgroundColor: '#8E0000',
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 5,
    borderBottomRightRadius: radius.lg,
  },
  offerRibbonText: { color: '#fff', fontSize: 10, fontWeight: fontWeights.heading },
  recoName: {
    fontSize: fontSizes.md + 0.5,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  fastRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  fastText: { fontSize: fontSizes.xs + 0.5, fontWeight: fontWeights.bold, color: colors.success },

  featCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  featImgWrap: { width: '100%', height: 200 },
  featImg: { borderRadius: 0 },
  featBookmark: { position: 'absolute', top: spacing.md, right: spacing.md },
  featBody: { padding: spacing.md + 2 },
  featRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  featName: { fontSize: fontSizes.xl - 3, fontWeight: fontWeights.heading, color: colors.text, flexShrink: 1 },
  featRatingCol: { alignItems: 'flex-end', gap: 2 },
  featRatingPill: { backgroundColor: colors.success, borderRadius: 9, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  featRatingText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: fontWeights.heading },
  featVotes: { fontSize: 11, color: colors.textMuted },
  dashedDivider: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, marginVertical: 11 },
  featOfferRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featOfferText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: '#334155' },
});
