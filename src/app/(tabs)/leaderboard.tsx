import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LeaderboardPlayer } from '@/core/models/PlayerProfile';
import { GAME_OPTIONS, type GameFilter } from '@/features/games/gameOptions';
import {
  MyRankCard,
  PodiumCard,
  RankRow,
  type LeaderboardEntry,
} from '@/features/leaderboard/LeaderboardComponents';
import type { RankedPlayer } from '@/features/leaderboard/ranking';
import { useLeaderboard } from '@/features/leaderboard/useLeaderboard';
import { useAccountName } from '@/features/leaderboard/useAccountName';
import { useAuthStore } from '@/state/useAuthStore';
import { GlassCard, SegmentedControl } from '@/ui/components';
import { PageHeader } from '@/ui/layout/PageHeader';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { formatNumber, t, useLocale } from '@/ui/i18n';
import { colors, font, navigation, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

function isGameFilter(value: string | undefined): value is Exclude<GameFilter, 'all'> {
  return GAME_OPTIONS.some((game) => game.id === value);
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

/** A név alatti statisztika: összesítettnél trófeák és játékok, játékonként az összpontszám. */
function detailFor(player: LeaderboardPlayer, scope: GameFilter): string {
  if (scope !== 'all') {
    return `${t('leaderboard.total')}: ${formatNumber(player.points)} XP`;
  }
  const games = Object.values(player.scores).filter((score) => (score ?? 0) > 0).length;
  return `${player.trophyCount} ${t('leaderboard.trophies', { count: player.trophyCount })} · ${games} ${t('leaderboard.games')}`;
}

function toEntry(
  player: RankedPlayer,
  scope: GameFilter,
  uid: string | undefined,
  nameOverride: string,
): LeaderboardEntry {
  const name = uid && player.uid === uid && nameOverride ? nameOverride : player.displayName;
  return {
    name,
    initials: initialsOf(name),
    points: player.score,
    detail: detailFor(player, scope),
    isMe: player.uid === uid,
  };
}

export default function LeaderboardScreen() {
  useLocale();
  const user = useAuthStore((state) => state.user);
  const myName = useAccountName();
  const { game: routeGame } = useLocalSearchParams<{ game?: string }>();
  const routeGameValue = Array.isArray(routeGame) ? routeGame[0] : routeGame;
  const selectedGame: GameFilter = isGameFilter(routeGameValue) ? routeGameValue : 'all';
  const layout = useBreakpoint();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rootRef = useRef<ViewInstance>(null);
  const columnRef = useRef<ViewInstance>(null);
  const [measuredPin, setMeasuredPin] = useState<{ left: number; width: number } | null>(null);

  /*
   * A saját helyezés kártyája a lista oszlopával egy vonalban legyen. A Screen ugyanígy számolja
   * az oszlopot (bal oldalt széles nézetben a menüsáv helye is); ez az első rajzoláskor kell.
   * Utána a tényleges oszlopot mérjük le, mert pl. egy megjelenő görgetősáv elcsúsztatja.
   */
  const pagePaddingLeft =
    insets.left + (layout.expanded ? spacing.xxl + sizing.navWidth : layout.pagePadding);
  const availableWidth = width - pagePaddingLeft - insets.right - layout.pagePadding;
  const computedPinWidth = Math.max(0, Math.min(sizing.contentWide, availableWidth));
  const pinWidth = measuredPin?.width ?? computedPinWidth;
  const pinLeft =
    measuredPin?.left ?? pagePaddingLeft + Math.max(0, availableWidth - computedPinWidth) / 2;

  function measurePin() {
    const root = rootRef.current;
    const column = columnRef.current;
    if (!root || !column) return;
    root.measureInWindow((rootX) => {
      column.measureInWindow((columnX, _columnY, columnWidth) => {
        const left = Math.round(columnX - rootX);
        const nextWidth = Math.round(columnWidth);
        setMeasuredPin((current) =>
          current?.left === left && current.width === nextWidth
            ? current
            : { left, width: nextWidth },
        );
      });
    });
  }

  const pinBottom = layout.expanded
    ? insets.bottom + spacing.md
    : insets.bottom + navigation.bottomClearance - spacing.sm;

  const leaderboard = useLeaderboard(selectedGame, user?.uid);
  const rankings = useMemo(
    () => leaderboard.players.map((player) => toEntry(player, selectedGame, user?.uid, myName)),
    [leaderboard.players, selectedGame, user?.uid, myName],
  );
  const ranked = leaderboard.players;
  const me = leaderboard.me;

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
    <View ref={rootRef} style={styles.root}>
      <ScreenContainer
        maxWidth={sizing.contentWide}
        contentStyle={{
          paddingBottom: layout.bottomClearance + sizing.touch + spacing.xl,
        }}
      >
        <View ref={columnRef} style={styles.content} onLayout={measurePin}>
          <PageHeader title={t('nav.leaderboard')} subtitle={t('leaderboard.subtitle')} />

          <View style={[styles.filtersTop, width < sizing.contentCompact && styles.filtersNarrow]}>
            <SegmentedControl
              options={gameOptions}
              value={selectedGame}
              onChange={selectGame}
              accessibilityLabel={t('leaderboard.filterGames')}
              // Szűk kijelzőn csak a kiválasztott szűrő felirata látszik, szélesen mindegyiké.
              compactSelection={layout.compact}
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
            width: pinWidth,
            pointerEvents: 'box-none',
          },
        ]}
      >
        <MyRankCard
          initials={initialsOf(myName)}
          title={me?.rank ? `${me.rank}. ${t('leaderboard.place')}` : t('leaderboard.personal')}
          subtitle={
            me?.score
              ? me.rank
                ? myName || t('leaderboard.calculating')
                : t('leaderboard.calculating')
              : t('leaderboard.playToRank')
          }
          score={me?.score ? `${me.score.toLocaleString('hu-HU')} XP` : '— XP'}
          ranked={Boolean(me?.score && me.rank)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, gap: spacing.xl },
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
});