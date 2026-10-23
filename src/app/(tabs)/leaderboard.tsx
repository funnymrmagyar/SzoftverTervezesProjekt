import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GAME_OPTIONS, type GameFilter } from '@/features/games/gameOptions';
import {
  PodiumCard,
  RankRow,
  type LeaderboardEntry,
} from '@/features/leaderboard/LeaderboardComponents';
import { useAuthStore } from '@/state/useAuthStore';
import { Avatar, Badge, GlassCard, SegmentedControl } from '@/ui/components';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { t } from '@/ui/i18n';
import { colors, font, navigation, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

type Period = 'weekly' | 'allTime';
type DemoCulture = 'hungarian' | 'western' | 'hawaiian';
type GameScores = Record<Exclude<GameFilter, 'all'>, number>;
type DemoScores = Record<Period, GameScores>;
type DemoRanking = {
  name: string;
  culture: DemoCulture;
  initials: string;
  scores: DemoScores;
};

const DEMO_RANKINGS: DemoRanking[] = [
  {
    name: 'SarkiFény',
    culture: 'hungarian',
    initials: 'S',
    scores: {
      weekly: { 'constellation-finder': 340, 'star-connection': 500 },
      allTime: { 'constellation-finder': 1140, 'star-connection': 1700 },
    },
  },
  {
    name: 'OrionVándor',
    culture: 'western',
    initials: 'O',
    scores: {
      weekly: { 'constellation-finder': 610, 'star-connection': 300 },
      allTime: { 'constellation-finder': 1680, 'star-connection': 830 },
    },
  },
  {
    name: 'Holdjáró',
    culture: 'hawaiian',
    initials: 'H',
    scores: {
      weekly: { 'constellation-finder': 270, 'star-connection': 420 },
      allTime: { 'constellation-finder': 860, 'star-connection': 1330 },
    },
  },
  {
    name: 'Esthajnal',
    culture: 'hungarian',
    initials: 'E',
    scores: {
      weekly: { 'constellation-finder': 390, 'star-connection': 230 },
      allTime: { 'constellation-finder': 1230, 'star-connection': 710 },
    },
  },
  {
    name: 'Altair',
    culture: 'western',
    initials: 'A',
    scores: {
      weekly: { 'constellation-finder': 210, 'star-connection': 360 },
      allTime: { 'constellation-finder': 650, 'star-connection': 1070 },
    },
  },
  {
    name: 'TejútTérképész',
    culture: 'hawaiian',
    initials: 'T',
    scores: {
      weekly: { 'constellation-finder': 180, 'star-connection': 330 },
      allTime: { 'constellation-finder': 560, 'star-connection': 1020 },
    },
  },
];

const CULTURE_LABELS: Record<DemoCulture, string> = {
  hungarian: 'Magyar',
  western: 'Nyugati',
  hawaiian: 'Hawaii',
};

function isGameFilter(value: string | undefined): value is Exclude<GameFilter, 'all'> {
  return GAME_OPTIONS.some((game) => game.id === value);
}

function cultureColor(culture: DemoCulture): string {
  return culture === 'hungarian'
    ? colors.accent
    : culture === 'western'
      ? colors.silver
      : colors.constellationLine;
}

function pointsFor(scores: DemoScores, period: Period, game: GameFilter): number {
  const periodScores = scores[period];
  return game === 'all'
    ? Object.values(periodScores).reduce((total, points) => total + points, 0)
    : periodScores[game];
}

export default function LeaderboardScreen() {
  const user = useAuthStore((state) => state.user);
  const { game: routeGame } = useLocalSearchParams<{ game?: string }>();
  const routeGameValue = Array.isArray(routeGame) ? routeGame[0] : routeGame;
  const selectedGame: GameFilter = isGameFilter(routeGameValue) ? routeGameValue : 'all';
  const [period, setPeriod] = useState<Period>('weekly');
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

  const rankings = useMemo(
    () =>
      DEMO_RANKINGS.map((entry): LeaderboardEntry => ({
        name: entry.name,
        culture: CULTURE_LABELS[entry.culture],
        cultureColor: cultureColor(entry.culture),
        initials: entry.initials,
        points: pointsFor(entry.scores, period, selectedGame),
      })).sort((left, right) => right.points - left.points),
    [period, selectedGame],
  );

  const gameOptions = [
    {
      value: 'all' as const,
      label: t('leaderboard.allGames'),
      icon: 'apps-outline' as const,
    },
    ...GAME_OPTIONS.map((game) => ({
      value: game.id,
      label: t(game.id === 'constellation-finder' ? 'leaderboard.identify' : 'leaderboard.connect'),
      icon: game.icon,
    })),
  ];
  const podiumOrder: { entry: LeaderboardEntry | undefined; place: 2 | 1 | 3 }[] = [
    { entry: rankings[1], place: 2 },
    { entry: rankings[0], place: 1 },
    { entry: rankings[2], place: 3 },
  ];
  const additionalRankings = rankings.slice(3);

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
            <Badge label={t('leaderboard.demo')} icon="sparkles-outline" tone="gold" />
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
            <SegmentedControl
              options={[
                { value: 'weekly', label: t('leaderboard.week') },
                { value: 'allTime', label: t('leaderboard.allTime') },
              ]}
              value={period}
              onChange={setPeriod}
              accessibilityLabel="Időszak szűrése"
            />
          </View>

          {rankings.length ? (
            <View style={styles.podium}>
              {podiumOrder.map(({ entry, place }) => {
                if (!entry)
                  return <View key={`empty-place-${place}`} style={styles.podiumPlaceholder} />;
                return <PodiumCard key={entry.name} entry={entry} place={place} />;
              })}
            </View>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Ionicons
                name="trophy-outline"
                size={sizing.icon + spacing.md}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>{t('leaderboard.noResults')}</Text>
            </GlassCard>
          )}

          <GlassCard style={styles.rankList}>
            {additionalRankings.length ? (
              additionalRankings.map((entry, index) => (
                <RankRow key={entry.name} entry={entry} place={index + 4} />
              ))
            ) : (
              <Text style={styles.emptyText}>{t('leaderboard.noResults')}</Text>
            )}
          </GlassCard>
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
        <GlassCard style={styles.pinnedRow}>
          <Avatar initials={user?.email?.slice(0, 1) ?? '?'} highlighted size={sizing.touch} />
          <View style={styles.pinnedCopy}>
            <Text style={styles.pinnedTitle}>{t('leaderboard.personal')}</Text>
            <Text style={styles.pinnedSubtitle} numberOfLines={1}>
              {user?.email ?? t('leaderboard.noScore')}
            </Text>
          </View>
          <Text style={styles.pinnedScore}>— XP</Text>
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
});
