import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { Product } from '@shared/types';
import { searchProducts } from '../lib/catalog';
import { ItemRow } from '../components/ItemRow';
import { SearchIcon } from '../components/icons';
import type { HomeStackParamList } from '../navigation/types';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme';

const SUGGESTIONS = ['Rice', 'Oil', 'Masala', 'Milk', 'Pen'];

export function SearchScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<HomeStackParamList, 'Search'>>();

  const [term, setTerm] = useState(params?.query ?? '');
  const [submitted, setSubmitted] = useState(params?.query ?? '');
  const [state, setState] = useState<{ query: string; items: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = submitted.trim();
    if (query.length < 2) return;

    let cancelled = false;
    searchProducts(query)
      .then((items) => {
        if (!cancelled) {
          setState({ query: submitted, items });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed');
      });

    return () => {
      cancelled = true;
    };
  }, [submitted]);

  const tooShort = submitted.trim().length < 2;
  const loading = !tooShort && state?.query !== submitted && !error;
  const results = state?.query === submitted ? state.items : [];

  const runSearch = (value: string) => {
    setTerm(value);
    setSubmitted(value);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.search}>
          <SearchIcon size={18} color={colors.brand} />
          <TextInput
            style={styles.searchInput}
            value={term}
            onChangeText={setTerm}
            onSubmitEditing={() => setSubmitted(term)}
            placeholder="Search for food, grocery, medicine…"
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
            autoFocus
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tooShort ? (
          <>
            <Text style={styles.hint}>Type at least 2 letters to search.</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.chip}
                  onPress={() => runSearch(suggestion)}
                >
                  <Text style={styles.chipText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Nothing matched “{submitted}”.</Text>
            <Text style={styles.hint}>Try a shorter word.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </Text>
            {results.map((product) => (
              <ItemRow key={product.id} product={product} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  back: { fontSize: 24, color: colors.text, paddingRight: spacing.xs },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill ?? 999,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontSize: fontSizes.md, color: colors.text, paddingVertical: spacing.sm },

  content: { paddingHorizontal: spacing.lg, paddingBottom: 90 },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  count: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  hint: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.sm },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  error: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: '#fdecea',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill ?? 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: fontSizes.sm, color: colors.text, fontWeight: fontWeights.semibold },
});
