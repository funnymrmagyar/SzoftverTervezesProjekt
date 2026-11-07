import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/ui/Button';
import { Badge, GlassCard, IconButton, SegmentedControl } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, spacing } from '@/ui/theme';
import { Select } from '@/ui/Select';

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
  const { height } = useWindowDimensions();
  const compact = height < 440;

  return (
    <View style={[styles.stack, compact && styles.compactStack]}>
      <GlassCard style={compact ? styles.compactIntro : undefined}>
        <Text
          style={[styles.body, compact && styles.compactBody]}
          numberOfLines={compact ? 2 : undefined}
        >
          {intro}
        </Text>
      </GlassCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('games.culture')}</Text>
        <Select
          value={cultureId}
          options={cultures.map((culture) => ({ value: culture.id, label: culture.name }))}
          onChange={onCultureChange}
          label={t('games.culture')}
          triggerIcon="globe-outline"
          searchable
          testID="game-culture-select"
        />
      </View>

      <View style={[styles.section, compact && styles.compactSection]}>
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
        <Text style={styles.hint} numberOfLines={compact ? 1 : undefined}>
          {difficultyHints[difficulty]}
        </Text>
      </View>

      <Button
        title={t('games.start')}
        icon="play"
        onPress={onStart}
        testID="game-start"
        style={compact ? styles.compactStart : undefined}
      />
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
  compact = false,
}: {
  score: number;
  best: number;
  isNewBest: boolean;
  rows: readonly { label: string; value: string }[];
  onAgain: () => void;
  onLeaderboard: () => void;
  onExit: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.stack, compact && styles.compactStack]}>
      <GlassCard style={[styles.summary, compact && styles.compactSummary]} testID="game-summary">
        <Text style={styles.sectionTitle}>{t('games.finished')}</Text>
        <Text style={[styles.bigScore, compact && styles.compactScore]}>
          {score.toLocaleString('hu-HU')}
        </Text>
        {!compact ? <Text style={styles.hint}>{t('games.finalScore')}</Text> : null}
        {isNewBest ? (
          <Badge label={t('games.newBest')} icon="trophy" tone="gold" />
        ) : (
          <Badge
            label={`${t('games.best')}: ${best.toLocaleString('hu-HU')}`}
            icon="trophy-outline"
          />
        )}
        <View style={[styles.rows, compact && styles.compactRows]}>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
      <View style={compact && styles.compactActions}>
        <Button
          title={t('games.again')}
          icon="refresh"
          onPress={onAgain}
          testID="game-again"
          style={compact ? styles.actionButton : undefined}
        />
        <Button
          title={t('games.toLeaderboard')}
          variant="secondary"
          icon="trophy-outline"
          onPress={onLeaderboard}
          style={compact ? styles.actionButton : undefined}
        />
      </View>
      <Button
        title={t('games.exit')}
        variant="ghost"
        onPress={onExit}
        style={compact ? styles.compactExit : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  compactStack: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { flex: 1, ...font.heading, color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { ...font.body, color: colors.textMuted, lineHeight: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: { ...font.heading, color: colors.text },
  compactIntro: { padding: spacing.sm },
  compactBody: { fontSize: 13, lineHeight: 18 },
  compactSection: { gap: spacing.xs },
  compactStart: { minHeight: 40 },
  hint: { ...font.small, color: colors.textMuted },
  summary: { alignItems: 'center', gap: spacing.md },
  compactSummary: { gap: spacing.xs, padding: spacing.xs },
  bigScore: { fontSize: 48, fontWeight: '600', color: colors.accent, ...font.mono },
  compactScore: { fontSize: 32 },
  rows: { alignSelf: 'stretch', gap: spacing.sm, paddingTop: spacing.sm },
  compactRows: { gap: spacing.xs, paddingTop: spacing.xs },
  compactActions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1, minHeight: 40, paddingHorizontal: spacing.sm },
  compactExit: { minHeight: 36 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { ...font.small, color: colors.textMuted },
  rowValue: {
    ...font.small,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
});
