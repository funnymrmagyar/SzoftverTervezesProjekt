import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GameCard } from '@/features/games/GameCard';
import { GAME_OPTIONS } from '@/features/games/gameOptions';
import { useBestScores } from '@/features/games/useBestScores';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { Badge } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';

export default function GamesScreen() {
  const best = useBestScores();

  return (
    <ScreenContainer maxWidth={sizing.contentCompact}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{t('games.title')}</Text>
            <Text style={styles.subtitle}>Fedezd fel az égbolt játékait.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons
              name="game-controller-outline"
              size={sizing.icon + spacing.xs}
              color={colors.accent}
            />
          </View>
        </View>

        <View style={styles.cards}>
          {GAME_OPTIONS.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              title={t(game.titleKey)}
              subtitle={t(game.subtitleKey)}
              best={best[game.id]}
              onPlay={() => router.push(game.route)}
              onLeaderboardPress={() =>
                router.push({ pathname: '/leaderboard', params: { game: game.id } })
              }
            />
          ))}
        </View>

        <View style={styles.note}>
          <Badge label={t('leaderboard.demo')} icon="sparkles-outline" />
          <Text style={styles.noteText}>{t('games.note')}</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headingCopy: { flex: 1, gap: spacing.sm },
  title: { ...font.title, color: colors.text },
  subtitle: { ...font.small, color: colors.textMuted, lineHeight: spacing.xl },
  headerIcon: {
    width: sizing.gameIcon,
    height: sizing.gameIcon,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  cards: { gap: spacing.md },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  noteText: { flex: 1, ...font.caption, color: colors.textMuted },
});
