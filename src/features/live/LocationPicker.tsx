import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { getDeviceLocation } from '@/services/location/deviceLocation';
import { useSkyStore } from '@/state/useSkyStore';
import { colors, radius, spacing } from '@/ui/theme';

import { formatLocation, PRESET_LOCATIONS } from '@/core/locations';

/** A megfigyelési hely kijelzője; koppintásra GPS vagy város választható. */
export function LocationPicker() {
  const location = useSkyStore((s) => s.location);
  const source = useSkyStore((s) => s.locationSource);
  const setLocation = useSkyStore((s) => s.setLocation);
  const [open, setOpen] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  async function requestGps() {
    setGpsMessage('Hely lekérése…');
    const loc = await getDeviceLocation();
    if (loc) {
      setLocation(loc, 'gps');
      setGpsMessage(null);
      setOpen(false);
    } else {
      setGpsMessage('A helymeghatározás nem engedélyezett vagy nem elérhető.');
    }
  }

  return (
    <>
      <Pressable style={styles.chip} onPress={() => setOpen(true)} testID="location-chip">
        <Ionicons
          name={source === 'gps' ? 'navigate' : 'location-outline'}
          size={14}
          color={colors.text}
        />
        <Text style={styles.chipText}>{formatLocation(location)}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.title}>Megfigyelési hely</Text>
            <ScrollView style={styles.list}>
              <Pressable style={styles.item} onPress={requestGps}>
                <Ionicons name="navigate" size={16} color={colors.accent} />
                <Text style={styles.itemText}>Saját hely (GPS)</Text>
              </Pressable>
              {gpsMessage ? <Text style={styles.message}>{gpsMessage}</Text> : null}
              {PRESET_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc.label}
                  style={styles.item}
                  onPress={() => {
                    setLocation(loc, 'manual');
                    setOpen(false);
                  }}
                >
                  <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.itemText}>{loc.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: spacing.md },
  list: { flexGrow: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: { color: colors.text, fontSize: 16 },
  message: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.sm },
});
