import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { describeSchedule, nextRunPreview, formatPreview } from '../lib/scheduledOrders';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const COUNTS = [2, 3, 6, 12];

export interface RepeatChoice {
  enabled: boolean;
  dayOfMonth: number;
  occurrences: number;
}

/**
 * Sets up a monthly repeat of the order being placed.
 *
 * The next date is shown as the day changes rather than described in words
 * alone: "the 5th" is ambiguous about whether it means this month or next, and
 * a customer should not have to work out which from the rules.
 */
export function RepeatPicker({
  value,
  onChange,
}: {
  value: RepeatChoice;
  onChange: (next: RepeatChoice) => void;
}) {
  const preview = formatPreview(nextRunPreview(value.dayOfMonth));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>Repeat this order monthly</Text>
          <Text style={styles.sub}>
            We'll ask you to confirm each time — nothing is sent without you.
          </Text>
        </View>
        <Switch
          value={value.enabled}
          onValueChange={(enabled) => onChange({ ...value, enabled })}
          trackColor={{ true: colors.brand, false: colors.borderStrong }}
          thumbColor="#fff"
        />
      </View>

      {value.enabled && (
        <>
          <Text style={styles.label}>Day of the month</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {DAYS.map((day) => (
              <Chip
                key={day}
                label={String(day)}
                active={value.dayOfMonth === day}
                onPress={() => onChange({ ...value, dayOfMonth: day })}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>How many times</Text>
          <View style={styles.chipsWrap}>
            {COUNTS.map((count) => (
              <Chip
                key={count}
                label={`${count}×`}
                active={value.occurrences === count}
                onPress={() => onChange({ ...value, occurrences: count })}
              />
            ))}
          </View>

          <Text style={styles.summary}>
            Every month on {describeSchedule(value.dayOfMonth)}, {value.occurrences} times.
            {'\n'}First repeat: {preview}
          </Text>
        </>
      )}
    </View>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headText: { flex: 1 },
  title: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text },
  sub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },

  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  chipsWrap: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },

  chip: {
    minWidth: 42,
    alignItems: 'center',
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

  summary: {
    fontSize: fontSizes.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    lineHeight: 19,
  },
});
