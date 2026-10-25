import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Badge, Chip, GlassCard, IconButton, SegmentedControl } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, spacing } from '@/ui/theme';

import type { Difficulty } from './gameOptions';

/** Felső sáv: vissza gomb, a játék címe és jobbra pár állapotjelző. */
export function GameHeader({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <IconButton icon="arrow-back" label={t('games.back')} onPress={onBack} testID="game-back" />
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{children}</View>
    </View>
  );
}

export interface SetupCulture {
  id: string;
  name: string;
}

/** Indítás előtti beállítás: égi kultúra és nehézség. */
export function GameSetup({
  intro,
  difficultyHints,
  cultures,
  cultureId,
  onCultureChange,
  difficulty,
  onDifficultyChange,
  onStart,
}: {
  intro: string;
  difficultyHints: Record<Difficulty, string>;
  cultures: readonly SetupCulture[];
  cultureId: string;
  onCultureChange: (id: string) => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStart: () => void;
}) {
  return (
    <View style={styles.stack}>
      <GlassCard style={styles.stack}>
        <Text style={styles.body}>{intro}</Text>
      </GlassCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('games.culture')}</Text>
        <View style={styles.chips}>
          {cultures.map((culture) => (
            <Chip
              key={culture.id}
              label={culture.name}
              selected={culture.id === cultureId}
              onPress={() => onCultureChange(culture.id)}
              testID={`game-culture-${culture.id}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('games.difficulty')}</Text>
        <SegmentedControl
          options={[
            { value: 'easy', label: t('games.easy') },
            { value: 'hard', label: t('games.hard') },
          ]}
          value={difficulty}
          onChange={onDifficultyChange}
          accessibilityLabel={t('games.difficulty')}
          testID="game-difficulty"
        />
        <Text style={styles.hint}>{difficultyHints[difficulty]}</Text>
      </View>

      <Button title={t('games.start')} icon="play" onPress={onStart} testID="game-start" />
    </View>
  );
}

/** A játék végi összegzés. */
export function GameSummary({
  score,
  best,
  isNewBest,
  rows,
  onAgain,
  onLeaderboard,
  onExit,
}: {
  score: number;
  best: number;
  isNewBest: boolean;
  rows: readonly { label: string; value: string }[];
  onAgain: () => void;
  onLeaderboard: () => void;
  onExit: () => void;
}) {
  return (
    <View style={styles.stack}>
      <GlassCard style={styles.summary} testID="game-summary">
        <Text style={styles.sectionTitle}>{t('games.finished')}</Text>
        <Text style={styles.bigScore}>{score.toLocaleString('hu-HU')}</Text>
        <Text style={styles.hint}>{t('games.finalScore')}</Text>
        {isNewBest ? (
          <Badge label={t('games.newBest')} icon="trophy" tone="gold" />
        ) : (
          <Badge label={`${t('games.best')}: ${best.toLocaleString('hu-HU')}`} icon="trophy-outline" />
        )}
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
      <Button title={t('games.again')} icon="refresh" onPress={onAgain} testID="game-again" />
      <Button
        title={t('games.toLeaderboard')}
        variant="secondary"
        icon="trophy-outline"
        onPress={onLeaderboard}
      />
      <Button title={t('games.exit')} variant="ghost" onPress={onExit} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { flex: 1, ...font.heading, color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { ...font.body, color: colors.textMuted, lineHeight: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: { ...font.heading, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { ...font.small, color: colors.textMuted },
  summary: { alignItems: 'center', gap: spacing.md },
  bigScore: { fontSize: 48, fontWeight: '600', color: colors.accent, ...font.mono },
  rows: { alignSelf: 'stretch', gap: spacing.sm, paddingTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { ...font.small, color: colors.textMuted },
  rowValue: { ...font.small, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
