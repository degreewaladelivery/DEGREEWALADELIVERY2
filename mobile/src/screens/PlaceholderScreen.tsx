import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, fontWeights, spacing } from '../theme';

/** Simple "coming soon" screen for tabs whose real content isn't built yet. */
export function PlaceholderScreen({ title, emoji }: { title: string; emoji: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emoji: { fontSize: 48 },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.text },
  sub: { fontSize: fontSizes.md, color: colors.textMuted },
});
