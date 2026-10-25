import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { getStarCatalog } from '@/core/catalog';
import { buildChartModel } from '@/features/games/chartModel';
import {
  buildFinderQuestions,
  FINDER_OPTIONS,
  FINDER_ROUNDS,
  finderPoints,
  type FinderQuestion,
} from '@/features/games/finderLogic';
import { GameHeader, GameSetup, GameSummary } from '@/features/games/GameChrome';
import { getPlayableCultures } from '@/features/games/gamePools';
import type { Difficulty } from '@/features/games/gameOptions';
import { segmentKey } from '@/features/games/pool';
import { createRng } from '@/features/games/random';
import { recordBestScore } from '@/features/games/scoreStorage';
import { SkyChart, type ChartLine } from '@/features/games/SkyChart';
import { useSkyStore } from '@/state/useSkyStore';
import { Button } from '@/ui/Button';
import { Badge, GlassCard } from '@/ui/components';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

type Phase = 'setup' | 'playing' | 'done';

interface Run {
  questions: FinderQuestion[];
  index: number;
  /** A kiválasztott válasz azonosítója; null, amíg a kérdés megválaszolatlan. */
  chosen: string | null;
  score: number;
  streak: number;
  correct: number;
  questionStartedAt: number;
  lastPoints: number;
}

export default function ConstellationFinderScreen() {
  const layout = useBreakpoint();
  const cultures = useMemo(() => getPlayableCultures(), []);
  const skyCultureId = useSkyStore((state) => state.cultureId);

  const [phase, setPhase] = useState<Phase>('setup');
  const [cultureId, setCultureId] = useState(
    () => cultures.find((c) => c.id === skyCultureId)?.id ?? cultures[0]?.id ?? '',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ best: number; isNewBest: boolean } | null>(null);

  const culture = cultures.find((c) => c.id === cultureId);
  const question = run?.questions[run.index];
  const answered = run?.chosen != null;

  const model = useMemo(
    () => (question ? buildChartModel(question.target, getStarCatalog()) : null),
    [question],
  );
  const lines = useMemo<ChartLine[]>(() => {
    if (!question || !(difficulty === 'easy' || answered)) return [];
    return question.target.segments.map(([a, b]) => ({
      key: segmentKey(a, b),
      a,
      b,
      color: culture?.lineColor ?? colors.constellationLine,
      opacity: 0.9,
      thickness: 2,
    }));
  }, [question, difficulty, answered, culture]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/games');
  }

  function start() {
    if (!culture) return;
    const questions = buildFinderQuestions(
      culture.pool,
      FINDER_ROUNDS,
      FINDER_OPTIONS,
      createRng(Date.now()),
    );
    setResult(null);
    setRun({
      questions,
      index: 0,
      chosen: null,
      score: 0,
      streak: 0,
      correct: 0,
      questionStartedAt: Date.now(),
      lastPoints: 0,
    });
    setPhase('playing');
  }

  function answer(optionId: string) {
    if (!run || !question || run.chosen !== null) return;
    const correct = optionId === question.correctId;
    const streak = correct ? run.streak + 1 : 0;
    const points = finderPoints({
      correct,
      elapsedMs: Date.now() - run.questionStartedAt,
      streak,
      difficulty,
    });
    setRun({
      ...run,
      chosen: optionId,
      streak,
      score: run.score + points,
      correct: run.correct + (correct ? 1 : 0),
      lastPoints: points,
    });
  }

  function next() {
    if (!run) return;
    if (run.index + 1 < run.questions.length) {
      setRun({ ...run, index: run.index + 1, chosen: null, questionStartedAt: Date.now(), lastPoints: 0 });
      return;
    }
    setPhase('done');
    recordBestScore('constellation-finder', run.score).then(setResult);
  }

  const difficultyLabel = t(difficulty === 'hard' ? 'games.hard' : 'games.easy');
  const contentStyle: ViewStyle = { paddingLeft: layout.pagePadding, paddingBottom: spacing.xl };

  return (
    <ScreenContainer maxWidth={sizing.contentCompact} contentStyle={contentStyle}>
      <View style={styles.content}>
        <GameHeader title={t('games.identify.title')} onBack={leave}>
          {phase === 'playing' && run ? (
            <>
              <Badge label={`${run.index + 1}/${run.questions.length}`} icon="albums-outline" />
              <Badge label={`${run.score}`} icon="star" tone="gold" />
            </>
          ) : null}
        </GameHeader>

        {phase === 'setup' ? (
          <GameSetup
            intro={t('games.identify.intro')}
            difficultyHints={{ easy: t('games.identify.easy'), hard: t('games.identify.hard') }}
            cultures={cultures}
            cultureId={cultureId}
            onCultureChange={setCultureId}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onStart={start}
          />
        ) : null}

        {phase === 'playing' && run && question && model ? (
          <View style={styles.stack}>
            <SkyChart
              model={model}
              lines={lines}
              accessibilityLabel={t('games.identify.question')}
              testID="finder-chart"
            />
            <Text style={styles.question}>{t('games.identify.question')}</Text>

            <View style={styles.options}>
              {question.options.map((option) => {
                const isCorrect = option.id === question.correctId;
                const isChosen = option.id === run.chosen;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityLabel={option.name}
                    accessibilityState={{ disabled: answered, selected: isChosen }}
                    disabled={answered}
                    onPress={() => answer(option.id)}
                    testID={`finder-option-${option.id}`}
                    style={({ pressed }) => [
                      styles.option,
                      answered && isCorrect && styles.optionCorrect,
                      answered && isChosen && !isCorrect && styles.optionWrong,
                      answered && !isCorrect && !isChosen && styles.optionDim,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.optionText}>{option.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            {answered ? (
              <GlassCard style={styles.feedback} testID="finder-feedback">
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.feedbackTitle,
                    { color: run.chosen === question.correctId ? colors.success : colors.danger },
                  ]}
                >
                  {run.chosen === question.correctId
                    ? `${t('games.identify.correct')} +${run.lastPoints}`
                    : `${t('games.identify.wrong')} ${question.target.name}`}
                </Text>
                {question.target.nativeName ? (
                  <Text style={styles.feedbackSub}>{question.target.nativeName}</Text>
                ) : null}
                <Button
                  title={
                    run.index + 1 < run.questions.length ? t('games.next') : t('games.results')
                  }
                  onPress={next}
                  testID="finder-next"
                />
              </GlassCard>
            ) : null}
          </View>
        ) : null}

        {phase === 'done' && run ? (
          <GameSummary
            score={run.score}
            best={result?.best ?? run.score}
            isNewBest={result?.isNewBest ?? false}
            rows={[
              { label: t('games.identify.correctCount'), value: `${run.correct}/${run.questions.length}` },
              { label: t('games.difficulty'), value: difficultyLabel },
              { label: t('games.culture'), value: culture?.name ?? '' },
            ]}
            onAgain={() => setPhase('setup')}
            onLeaderboard={() =>
              router.navigate({ pathname: '/leaderboard', params: { game: 'constellation-finder' } })
            }
            onExit={leave}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg },
  stack: { gap: spacing.lg },
  question: { ...font.heading, color: colors.text, textAlign: 'center' },
  options: { gap: spacing.sm },
  option: {
    minHeight: sizing.touch + spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  optionCorrect: { borderColor: colors.success, borderWidth: 2 },
  optionWrong: { borderColor: colors.danger, borderWidth: 2 },
  optionDim: { opacity: 0.5 },
  optionText: { ...font.body, color: colors.text, fontWeight: '600' },
  pressed: { transform: [{ scale: sizing.cardPressScale }] },
  feedback: { gap: spacing.md },
  feedbackTitle: { ...font.heading },
  feedbackSub: { ...font.small, color: colors.textMuted },
});
