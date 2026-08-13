import { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LocationPicker } from './LocationPicker';
import { useLocationStore } from '../store/locationStore';
import { MAPBOX_TOKEN } from '../lib/mapbox';
import { reverseGeocode } from '@shared/deliveryLocation';
import { colors, spacing, radius, fontSizes, fontWeights } from '../theme';

export function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const saved = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const markPrompted = useLocationStore((s) => s.markPrompted);

  const [latitude, setLatitude] = useState<number | null>(saved?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(saved?.longitude ?? null);
  const [resolved, setResolved] = useState<{ label: string; address: string } | null>(
    saved ? { label: saved.label, address: saved.address } : null
  );

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    let cancelled = false;
    reverseGeocode(MAPBOX_TOKEN, latitude, longitude).then((place) => {
      if (!cancelled) setResolved(place);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const dismiss = () => {
    markPrompted();
    onClose();
  };

  const onSave = () => {
    if (latitude == null || longitude == null || !resolved) return;
    setLocation({ latitude, longitude, label: resolved.label, address: resolved.address });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Where are we delivering?</Text>
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Text style={styles.close}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.lead}>
              We use this to work out your delivery fee and guide the agent to your door.
            </Text>

            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />

            {resolved && latitude != null && (
              <View style={styles.resolved}>
                <Text style={styles.resolvedLabel}>{resolved.label}</Text>
                <Text style={styles.resolvedAddress}>{resolved.address}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.ghostBtn} onPress={dismiss} activeOpacity={0.85}>
              <Text style={styles.ghostText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (latitude == null || !resolved) && styles.saveBtnDisabled]}
              onPress={onSave}
              disabled={latitude == null || !resolved}
              activeOpacity={0.9}
            >
              <Text style={styles.saveText}>Save location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text, flex: 1 },
  close: { fontSize: 28, lineHeight: 30, color: colors.textFaint, paddingHorizontal: spacing.xs },
  lead: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  resolved: {
    marginTop: spacing.md,
    backgroundColor: colors.brandTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resolvedLabel: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  resolvedAddress: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  ghostBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ghostText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: '#fff' },
});
