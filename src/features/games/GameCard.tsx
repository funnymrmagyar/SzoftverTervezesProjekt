import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/ui/components';
import { GlassSurface } from '@/ui/GlassSurface';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import type { GAME_OPTIONS } from './gameOptions';

type Game = (typeof GAME_OPTIONS)[number];

export function GameCard({
  game,
  title,
  subtitle,
  soonLabel,
  onLeaderboardPress,
}: {
  game: Game;
  title: string;
  subtitle: string;
  soonLabel: string;
  onLeaderboardPress: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <GlassSurface style={[styles.card, focused && styles.focused]} testID={`game-card-${game.id}`}>
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
        <Badge label={soonLabel} icon="lock-closed-outline" tone="locked" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ranglista`}
        accessibilityHint="Megnyitja ennek a játéknak a ranglistáját"
        onPress={onLeaderboardPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={`game-leaderboard-${game.id}`}
        style={({ pressed }) => [
          styles.trophy,
          pressed && styles.pressed,
          focused && styles.focused,
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
