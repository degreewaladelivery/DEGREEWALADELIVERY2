import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOrderAlerts } from '../lib/useOrderAlerts';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const ICONS: Record<string, string> = {
  claimed: '🛵',
  picked_up: '📦',
  delivered: '✅',
  cancelled: '⚠️',
};

export function OrderAlerts() {
  const { alerts, dismiss } = useOrderAlerts();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  if (alerts.length === 0) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      {alerts.map((alert) => (
        <View
          key={alert.orderId}
          style={[styles.alert, alert.status === 'cancelled' && styles.alertBad]}
        >
          <Text style={styles.icon}>{ICONS[alert.status] ?? '🔔'}</Text>
          <View style={styles.body}>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.text}>{alert.body}</Text>
            <TouchableOpacity
              onPress={() => {
                dismiss(alert.orderId);
                navigation.navigate('Cart', { screen: 'Track' });
              }}
            >
              <Text style={styles.link}>Track order</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => dismiss(alert.orderId)} hitSlop={10}>
            <Text style={styles.close}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
    gap: spacing.sm,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: spacing.md,
    ...shadows.lg,
  },
  alertBad: { borderLeftColor: colors.danger },
  icon: { fontSize: 22 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: fontSizes.sm, fontWeight: fontWeights.heading, color: colors.text },
  text: { fontSize: fontSizes.xs, color: colors.textMuted },
  link: {
    marginTop: 6,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.brand,
  },
  close: { fontSize: 22, lineHeight: 24, color: colors.textFaint },
});
