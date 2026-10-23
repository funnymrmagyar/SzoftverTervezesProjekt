import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Avatar, GlassCard } from '@/ui/components';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';

const winnerShadow: ViewStyle =
  Platform.OS === 'web'
    ? { boxShadow: `0 ${spacing.xs}px ${spacing.md}px rgba(242, 184, 75, 0.14)` }
    : {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: spacing.xs },
        shadowOpacity: 0.14,
        shadowRadius: spacing.md,
        elevation: 4,
      };

export interface LeaderboardEntry {
  name: string;
  culture: string;
  initials: string;
  points: number;
  cultureColor: string;
}

export function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const medalColor = place === 1 ? colors.accent : place === 2 ? colors.silver : colors.bronze;
  const winner = place === 1;

  return (
    <GlassCard style={[styles.podiumCard, winner && styles.winnerCard]}>
      {winner ? (
        <Ionicons name="ribbon" size={sizing.icon} color={medalColor} style={styles.crown} />
      ) : null}
      <View style={[styles.avatarRing, { borderColor: medalColor }]}>
        <Avatar initials={entry.initials} size={winner ? sizing.avatarLarge : sizing.avatar} />
      </View>
      <View style={[styles.place, { backgroundColor: `${medalColor}22`, borderColor: medalColor }]}>
        <Text style={[styles.placeText, { color: medalColor }]}>{place}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={styles.podiumScore}>{entry.points.toLocaleString('hu-HU')} XP</Text>
    </GlassCard>
  );
}

export function RankRow({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  return (
    <View style={styles.rankRow}>
      <Text style={styles.rankNumber}>{String(place).padStart(2, '0')}</Text>
      <Avatar initials={entry.initials} size={sizing.touch} />
      <View style={styles.rankCopy}>
        <Text style={styles.rankName} numberOfLines={1}>
          {entry.name}
        </Text>
        <View style={styles.cultureLine}>
          <View style={[styles.cultureDot, { backgroundColor: entry.cultureColor }]} />
          <Text style={styles.rankCulture} numberOfLines={1}>
            {entry.culture}
          </Text>
        </View>
      </View>
      <Text style={styles.rankScore}>{entry.points.toLocaleString('hu-HU')} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  podiumCard: {
    flex: 1,
    minWidth: 0,
    minHeight: sizing.avatarLarge + spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  winnerCard: {
    minHeight: sizing.avatarLarge + spacing.xxxl + spacing.lg,
    borderColor: 'rgba(242, 184, 75, 0.45)',
    ...winnerShadow,
  },
  crown: { position: 'absolute', top: spacing.md },
  avatarRing: {
    padding: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  place: {
    minWidth: sizing.touch - spacing.md,
    minHeight: sizing.touch - spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  placeText: { fontSize: 14, fontWeight: '600' },
  podiumName: { maxWidth: '100%', ...font.small, color: colors.text, fontWeight: '600' },
  podiumScore: { ...font.caption, ...font.mono, color: colors.accent, fontWeight: '600' },
  rankRow: {
    minHeight: sizing.touch + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankNumber: { width: spacing.xl, ...font.mono, ...font.caption, color: colors.textMuted },
  rankCopy: { flex: 1, gap: spacing.xs },
  rankName: { ...font.small, color: colors.text, fontWeight: '600' },
  cultureLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cultureDot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.pill },
  rankCulture: { ...font.caption, color: colors.textMuted },
  rankScore: { ...font.small, ...font.mono, color: colors.text, fontWeight: '600' },
});
