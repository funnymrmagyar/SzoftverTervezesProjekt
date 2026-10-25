import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Badge } from '@/ui/components';
import { GlassSurface } from '@/ui/GlassSurface';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import type { GAME_OPTIONS } from './gameOptions';

type Game = (typeof GAME_OPTIONS)[number];

const cursorStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : undefined;

export function GameCard({
  game,
  title,
  subtitle,
  best,
  onPlay,
  onLeaderboardPress,
}: {
  game: Game;
  title: string;
  subtitle: string;
  /** A helyi rekord; undefined, ha még nem játszott. */
  best?: number;
  onPlay: () => void;
  onLeaderboardPress: () => void;
}) {
  const [playFocused, setPlayFocused] = useState(false);
  const [trophyFocused, setTrophyFocused] = useState(false);

  return (
    <GlassSurface style={styles.card} testID={`game-card-${game.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${t('games.play')}`}
        accessibilityHint={subtitle}
        onPress={onPlay}
        onFocus={() => setPlayFocused(true)}
        onBlur={() => setPlayFocused(false)}
        testID={`game-play-${game.id}`}
        style={({ pressed }) => [
          styles.play,
          pressed && styles.pressed,
          playFocused && styles.focused,
          cursorStyle,
        ]}
      >
        <View style={styles.iconTile}>
          <Ionicons name={game.icon} size={sizing.icon + spacing.sm} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {best ? (
            <Badge
              label={`${t('games.best')}: ${best.toLocaleString('hu-HU')}`}
              icon="trophy"
              tone="gold"
            />
          ) : (
            <Badge label={t('games.play')} icon="play-outline" />
          )}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ranglista`}
        accessibilityHint="Megnyitja ennek a játéknak a ranglistáját"
        onPress={onLeaderboardPress}
        onFocus={() => setTrophyFocused(true)}
        onBlur={() => setTrophyFocused(false)}
        testID={`game-leaderboard-${game.id}`}
        style={({ pressed }) => [
          styles.trophy,
          pressed && styles.pressed,
          trophyFocused && styles.focused,
          cursorStyle,
        ]}
      >
        <Ionicons name="trophy-outline" size={sizing.icon} color={colors.accent} />
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizing.gameIcon + spacing.xl,
    padding: spacing.lg,
  },
  play: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  iconTile: {
    width: sizing.gameIcon,
    height: sizing.gameIcon,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.cardHighlight,
  },
  copy: { flex: 1, alignItems: 'flex-start', gap: spacing.sm },
  title: { ...font.body, color: colors.text, fontWeight: '600' },
  subtitle: { ...font.small, color: colors.textMuted },
  trophy: {
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  pressed: { transform: [{ scale: sizing.cardPressScale }] },
  focused: { borderWidth: 2, borderColor: colors.accent },
});
