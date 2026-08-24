import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  fetchSchedules,
  cancelSchedule,
  confirmRun,
  describeSchedule,
  formatRunDate,
  type ScheduledOrder,
  type AwaitingRun,
} from '../lib/scheduledOrders';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

/**
 * Repeat orders: what is waiting to be confirmed, and what is still scheduled.
 *
 * Anything awaiting confirmation is put first and styled as an action, because
 * it expires at the end of the day — an unconfirmed run is skipped, so a card
 * that reads as information rather than a decision costs the customer a
 * delivery.
 */
export function ScheduledSection({
  token,
  onConfirmed,
}: {
  token: string;
  onConfirmed: () => void;
}) {
  const [schedules, setSchedules] = useState<ScheduledOrder[]>([]);
  const [awaiting, setAwaiting] = useState<AwaitingRun[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSchedules(token)
      .then((data) => {
        if (cancelled) return;
        setSchedules(data.schedules);
        setAwaiting(data.awaiting);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const refresh = async () => {
    try {
      const data = await fetchSchedules(token);
      setSchedules(data.schedules);
      setAwaiting(data.awaiting);
    } catch {
      // Leave what is on screen: a failed refresh is not worth blanking the list.
    }
  };

  const onConfirm = async (run: AwaitingRun) => {
    setBusyId(run.id);
    setError(null);
    try {
      await confirmRun(token, run.id);
      await refresh();
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm that delivery.');
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = (schedule: ScheduledOrder) => {
    Alert.alert(
      'Cancel this repeat?',
      `No more monthly deliveries will be scheduled. ${
        schedule.occurrences_total - schedule.occurrences_done
      } remaining will be cancelled.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel repeat',
          style: 'destructive',
          onPress: async () => {
            setBusyId(schedule.id);
            try {
              const data = await cancelSchedule(token, schedule.id);
              setSchedules(data.schedules);
              setAwaiting(data.awaiting);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not cancel that repeat.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const active = schedules.filter((s) => s.status === 'active');
  if (!loaded || (active.length === 0 && awaiting.length === 0)) return null;

  const scheduleFor = (run: AwaitingRun) =>
    schedules.find((s) => s.id === run.scheduled_order_id);

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Repeat Deliveries</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {awaiting.map((run) => {
        const schedule = scheduleFor(run);
        return (
          <View key={run.id} style={styles.dueCard}>
            <Text style={styles.dueTitle}>Due today</Text>
            <Text style={styles.dueBody}>
              {schedule
                ? schedule.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')
                : 'Your repeat order'}
            </Text>
            <Text style={styles.dueNote}>
              Confirm before the day ends, or this month is skipped. Priced when you confirm.
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, busyId === run.id && styles.disabled]}
              activeOpacity={0.9}
              disabled={busyId === run.id}
              onPress={() => onConfirm(run)}
            >
              <Text style={styles.confirmText}>
                {busyId === run.id ? 'Confirming…' : 'Confirm delivery'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {active.map((schedule) => (
        <View key={schedule.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {schedule.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
          </Text>
          <Text style={styles.cardMeta}>
            Every month on {describeSchedule(schedule.day_of_month)}
          </Text>
          <Text style={styles.cardMeta}>
            {schedule.occurrences_done} of {schedule.occurrences_total} delivered
            {schedule.next_run_on ? ` · next ${formatRunDate(schedule.next_run_on)}` : ''}
          </Text>
          <TouchableOpacity
            onPress={() => onCancel(schedule)}
            disabled={busyId === schedule.id}
            activeOpacity={0.8}
          >
            <Text style={styles.cancel}>
              {busyId === schedule.id ? 'Cancelling…' : 'Cancel repeat'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.lg },
  heading: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },

  error: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },

  dueCard: {
    backgroundColor: colors.brandTint,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
  },
  dueTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.heading, color: colors.brand },
  dueBody: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  dueNote: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  confirmBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
  disabled: { opacity: 0.6 },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  cardTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  cardMeta: { fontSize: fontSizes.sm, color: colors.textMuted },
  cancel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
