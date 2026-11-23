import { StyleSheet, Text, View } from 'react-native';

import { useSkyStore } from '@/state/useSkyStore';
import { useViewStore } from '@/state/useViewStore';
import { IconButton } from '@/ui/components';
import { t, useLocale } from '@/ui/i18n';
import { colors, spacing } from '@/ui/theme';

/**
 * Az alsó sáv két szélének gombjai. Telefonos (compact) nézetben a +/− nagyítógombok
 * elmaradnak — ott két ujjal nagyít az ember —, így a sáv jóval alacsonyabb lehet.
 */
export function ViewControls({
  side = 'all',
  compact = false,
}: {
  side?: 'left' | 'right' | 'all';
  compact?: boolean;
  /** Kompatibilitás: a hárompontos gomb megszűnt. */
  moreOpen?: boolean;
  onToggleMore?: () => void;
}) {
  useLocale();
  const showLines = useSkyStore((state) => state.showLines);
  const toggleLines = useSkyStore((state) => state.toggleLines);
  const showLabels = useSkyStore((state) => state.showLabels);
  const toggleLabels = useSkyStore((state) => state.toggleLabels);
  const showGround = useSkyStore((state) => state.showGround);
  const toggleGround = useSkyStore((state) => state.toggleGround);
  const zoom = useViewStore((state) => state.zoom);
  const reset = useViewStore((state) => state.reset);
  const fov = useViewStore((state) => Math.round(state.fov));

  // Telefonon a bal oldali sávba csak két gomb fér, ezért ott a földkapcsoló a jobb oldalra kerül.
  const groundButton = (
    <IconButton
      icon="image-outline"
      label={t('view.ground')}
      active={showGround}
      onPress={toggleGround}
      testID="toggle-ground"
    />
  );

  return (
    <View style={styles.wrap}>
      {side !== 'right' ? (
        <View style={styles.row}>
          <IconButton
            icon="git-network-outline"
            label={t('view.lines')}
            active={showLines}
            onPress={toggleLines}
            testID="toggle-lines"
          />
          <IconButton
            icon="text-outline"
            label={t('view.labels')}
            active={showLabels}
            onPress={toggleLabels}
            testID="toggle-labels"
          />
          {compact ? null : groundButton}
        </View>
      ) : null}
      {side !== 'left' ? (
        <View style={styles.rightGroup}>
          <Text style={styles.fov}>{t('view.fov', { fov })}</Text>
          <View style={styles.row}>
            {compact ? null : (
              <>
                <IconButton
                  icon="remove"
                  label={t('view.zoomOut')}
                  onPress={() => zoom(1.25)}
                  testID="zoom-out"
                />
                <IconButton
                  icon="add"
                  label={t('view.zoomIn')}
                  onPress={() => zoom(0.8)}
                  testID="zoom-in"
                />
              </>
            )}
            {compact ? groundButton : null}
            <IconButton
              icon="compass-outline"
              label={t('view.reset')}
              onPress={reset}
              testID="view-reset"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  rightGroup: { alignItems: 'center', gap: spacing.xs },
  fov: { color: colors.textMuted, fontSize: 10 },
});
