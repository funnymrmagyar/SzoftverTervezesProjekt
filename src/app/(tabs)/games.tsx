import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/features/games/GameCard';
import { GAME_OPTIONS } from '@/features/games/gameOptions';
import { useBestScores } from '@/features/games/useBestScores';
import { PageHeader } from '@/ui/layout/PageHeader';
import { Screen } from '@/ui/layout/Screen';
import { Badge } from '@/ui/components';
import { t, useLocale } from '@/ui/i18n';
import { colors, font, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

export default function GamesScreen() {
  useLocale();
  const best = useBestScores();
  const layout = useBreakpoint();
  const compactLandscape = layout.landscape && layout.height < 500;

  return (
    <Screen
      maxWidth={sizing.contentCompact}
      scroll={false}
      contentStyle={compactLandscape ? styles.screenContentLandscape : undefined}
    >
      <View style={[styles.content, compactLandscape && styles.contentLandscape]}>
        <PageHeader title={t('games.title')} subtitle={t('games.subtitle')} />

        <View style={[styles.cards, compactLandscape && styles.cardsLandscape]}>
          {GAME_OPTIONS.map((game) => (
            <View key={game.id} style={compactLandscape && styles.gameSlot}>
              <GameCard
                game={game}
                title={t(game.titleKey)}
                subtitle={t(game.subtitleKey)}
                best={best[game.id]}
                onPlay={() => router.push(game.route)}
                onLeaderboardPress={() =>
                  router.push({ pathname: '/leaderboard', params: { game: game.id } })
                }
              />
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Badge label={t('nav.leaderboard')} icon="trophy-outline" />
          <Text style={styles.noteText}>{t('games.note')}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Alacsony, fekvő telefonon kevesebb függőleges térköz, hogy minden kiférjen.
  screenContentLandscape: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  // A tartalom felülről indul, mint a többi oldalon (korábban függőlegesen középen volt).
  content: { flex: 1, gap: spacing.xl },
  contentLandscape: { justifyContent: 'center', gap: spacing.md },
  cards: { gap: spacing.md },
  cardsLandscape: { flexDirection: 'row', alignItems: 'stretch' },
  gameSlot: { flex: 1, minWidth: 0 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  noteText: { flex: 1, ...font.caption, color: colors.textMuted },
});
