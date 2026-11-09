import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';
import { GAME_OPTIONS, type GameFilter } from '@/features/games/gameOptions';
import {
  PodiumCard,
  RankRow,
  type LeaderboardEntry,
} from '@/features/leaderboard/LeaderboardComponents';
import type { RankedPlayer } from '@/features/leaderboard/ranking';
import { useLeaderboard } from '@/features/leaderboard/useLeaderboard';
import { authMode } from '@/services/firebase/config';
import { useAuthStore } from '@/state/useAuthStore';
import { Avatar, Badge, GlassCard, SegmentedControl } from '@/ui/components';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { t } from '@/ui/i18n';
import { colors, font, navigation, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

const MODE_BADGE =
  authMode === 'local'
    ? { label: t('leaderboard.device'), icon: 'phone-portrait-outline' as const }
    : { label: t('leaderboard.live'), icon: 'pulse-outline' as const };

function isGameFilter(value: string | undefined): value is Exclude<GameFilter, 'all'> {
  return GAME_OPTIONS.some((game) => game.id === value);
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

/** A név alatti statisztika: összesítettnél trófeák és játékok, játékonként az összpontszám. */
function detailFor(player: LeaderboardPlayer, scope: GameFilter): string {
  if (scope !== 'all') {
    return `${t('leaderboard.total')}: ${player.points.toLocaleString('hu-HU')} XP`;
  }
  const games = Object.values(player.scores).filter((score) => (score ?? 0) > 0).length;
  return `${player.trophyCount} ${t('leaderboard.trophies')} · ${games} ${t('leaderboard.games')}`;
}

function toEntry(
  player: RankedPlayer,
  scope: GameFilter,
  uid: string | undefined,
): LeaderboardEntry {
  return {
    name: player.displayName,
    initials: initialsOf(player.displayName),
    points: player.score,
    detail: detailFor(player, scope),
    isMe: player.uid === uid,
  };
}

export default function LeaderboardScreen() {
  const user = useAuthStore((state) => state.user);
  const { game: routeGame } = useLocalSearchParams<{ game?: string }>();
  const routeGameValue = Array.isArray(routeGame) ? routeGame[0] : routeGame;
  const selectedGame: GameFilter = isGameFilter(routeGameValue) ? routeGameValue : 'all';
  const layout = useBreakpoint();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pinWidth = Math.min(
    sizing.contentWide,
    width - layout.pagePadding * 2 - (layout.expanded ? sizing.navWidth : 0),
  );
  const pinLeft = layout.expanded
    ? insets.left + sizing.navWidth + layout.pagePadding
    : (width - pinWidth) / 2;
  const pinBottom = layout.expanded
    ? insets.bottom + spacing.md
    : insets.bottom + navigation.bottomClearance - spacing.sm;

  const leaderboard = useLeaderboard(selectedGame, user?.uid);
  const rankings = useMemo(
    () => leaderboard.players.map((player) => toEntry(player, selectedGame, user?.uid)),
    [leaderboard.players, selectedGame, user?.uid],
  );
  const ranked = leaderboard.players;
  const me = leaderboard.me;
  const myName = me?.player?.displayName ?? user?.email?.split('@')[0] ?? '';

  const gameOptions = [
    {
      value: 'all' as const,
      label: t('leaderboard.allGames'),
      icon: 'apps-outline' as const,
    },
    ...GAME_OPTIONS.map((game) => ({
      value: game.id,
      label: t(game.leaderboardKey),
      icon: game.icon,
    })),
  ];
  // A dobogón a megjelenítési sorrend 2–1–3; a kiírt helyezés holtversenyben azonos lehet.
  const podiumOrder = [1, 0, 2].map((index) => ({
    index,
    entry: rankings[index] as LeaderboardEntry | undefined,
    place: (ranked[index]?.rank ?? index + 1) as 1 | 2 | 3,
  }));
  const additionalRankings = rankings.slice(3).map((entry, offset) => ({
    entry,
    key: ranked[offset + 3].uid,
    place: ranked[offset + 3].rank,
  }));

  function selectGame(game: GameFilter) {
    router.setParams({ game: game === 'all' ? undefined : game });
  }

  return (
    <View style={styles.root}>
      <ScreenContainer
        maxWidth={sizing.contentWide}
        contentStyle={{
          paddingBottom: layout.bottomClearance + sizing.touch + spacing.xl,
        }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('nav.leaderboard')}</Text>
            <Badge label={MODE_BADGE.label} icon={MODE_BADGE.icon} tone="gold" />
          </View>

          <View style={[styles.filtersTop, width < sizing.contentCompact && styles.filtersNarrow]}>
            <SegmentedControl
              options={gameOptions}
              value={selectedGame}
              onChange={selectGame}
              accessibilityLabel="Játék szűrése"
              compactSelection
              testID="leaderboard-game-filter"
            />
          </View>

          {leaderboard.status === 'loading' ? (
            <GlassCard style={styles.emptyCard} testID="leaderboard-loading">
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.emptyText}>{t('leaderboard.loading')}</Text>
            </GlassCard>
          ) : leaderboard.status === 'error' ? (
            <GlassCard style={styles.emptyCard} testID="leaderboard-error">
              <Ionicons
                name="cloud-offline-outline"
                size={sizing.icon + spacing.md}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>{t('leaderboard.error')}</Text>
            </GlassCard>
          ) : rankings.length ? (
            <>
              <View style={styles.podium}>
                {podiumOrder.map(({ index, entry, place }) =>
                  entry ? (
                    <PodiumCard key={ranked[index].uid} entry={entry} place={place} />
                  ) : (
                    <View key={`empty-place-${index}`} style={styles.podiumPlaceholder} />
                  ),
                )}
              </View>
              {additionalRankings.length ? (
                <GlassCard style={styles.rankList}>
                  {additionalRankings.map(({ entry, key, place }) => (
                    <RankRow key={key} entry={entry} place={place} />
                  ))}
                </GlassCard>
              ) : null}
            </>
          ) : (
            <GlassCard style={styles.emptyCard} testID="leaderboard-empty">
              <Ionicons
                name="trophy-outline"
                size={sizing.icon + spacing.md}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>{t('leaderboard.noResults')}</Text>
            </GlassCard>
          )}
        </View>
      </ScreenContainer>

      <View
        style={[
          styles.pinnedPosition,
          {
            left: pinLeft,
            bottom: pinBottom,
            width: Math.max(0, pinWidth),
            pointerEvents: 'box-none',
          },
        ]}
      >
        <GlassCard style={styles.pinnedRow} testID="leaderboard-me">
          <Avatar initials={initialsOf(myName)} highlighted size={sizing.touch} />
          <View style={styles.pinnedCopy}>
            <Text style={styles.pinnedTitle}>
              {me?.rank ? `${me.rank}. ${t('leaderboard.place')}` : t('leaderboard.personal')}
            </Text>
            <Text style={styles.pinnedSubtitle} numberOfLines={1}>
              {me?.score
                ? me.rank
                  ? myName
                  : t('leaderboard.calculating')
                : t('leaderboard.playToRank')}
            </Text>
          </View>
          <Text style={[styles.pinnedScore, Boolean(me?.score) && styles.pinnedScoreActive]}>
            {me?.score ? `${me.score.toLocaleString('hu-HU')} XP` : '— XP'}
          </Text>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { ...font.title, color: colors.text },
  filtersTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  filtersNarrow: { flexWrap: 'wrap' },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    minHeight: sizing.avatarLarge + sizing.avatarLarge,
  },
  podiumPlaceholder: { flex: 1, minWidth: 0 },
  rankList: { padding: spacing.md, gap: spacing.xs },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: sizing.avatarLarge * 2,
  },
  emptyText: { ...font.small, color: colors.textMuted, textAlign: 'center' },
  pinnedPosition: { position: 'absolute', zIndex: 10 },
  pinnedRow: {
    minHeight: sizing.touch + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  pinnedCopy: { flex: 1, gap: spacing.xs },
  pinnedTitle: { ...font.small, color: colors.text, fontWeight: '600' },
  pinnedSubtitle: { ...font.caption, color: colors.textMuted },
  pinnedScore: { ...font.small, ...font.mono, color: colors.textMuted, fontWeight: '600' },
  pinnedScoreActive: { color: colors.accent },
});
