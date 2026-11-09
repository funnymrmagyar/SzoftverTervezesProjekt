import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStarCatalog } from '@/core/catalog';
import {
  BELIEF_OPTIONS,
  BELIEF_ROUNDS,
  beliefPoints,
  buildBeliefQuestions,
  visibleClue,
  type BeliefQuestion,
} from '@/features/games/beliefLogic';
import { buildChartModel } from '@/features/games/chartModel';
import { GameSetup, GameSummary } from '@/features/games/GameChrome';
import { GameChartStage, GameFrame } from '@/features/games/GameFrame';
import { getBeliefCultures } from '@/features/games/gamePools';
import type { Difficulty } from '@/features/games/gameOptions';
import { segmentKey } from '@/features/games/pool';
import { createRng } from '@/features/games/random';
import { recordGameResult, type RecordedGameResult } from '@/features/games/results';
import { SkyChart, type ChartLine } from '@/features/games/SkyChart';
import { useSkyStore } from '@/state/useSkyStore';
import { Button } from '@/ui/Button';
import { Badge, GlassCard } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';
import { useReducedMotion } from '@/ui/useReducedMotion';

type Phase = 'setup' | 'playing' | 'done';

interface Run {
  questions: BeliefQuestion[];
  index: number;
  /** A kiválasztott minta azonosítója; null, amíg a kérdés megválaszolatlan. */
  chosen: string | null;
  score: number;
  streak: number;
  correct: number;
  questionStartedAt: number;
  lastPoints: number;
}

/** Ennél keskenyebb fekvő kijelzőn a leírás a térképek fölé kerül, nem melléjük. */
const SIDE_BY_SIDE_MIN_WIDTH = 640;
/** A leírás legfeljebb a képernyő ekkora részét foglalhatja el álló helyzetben. */
const CLUE_HEIGHT_SHARE = 0.42;
/** Ennél alacsonyabb kijelzőn kisebb betűvel szedjük a leírást. */
const SMALL_TEXT_HEIGHT = 700;

export default function BeliefGuessScreen() {
  const reducedMotion = useReducedMotion();
  const layout = useBreakpoint();
  const cultures = useMemo(() => getBeliefCultures(), []);
  const skyCultureId = useSkyStore((state) => state.cultureId);

  const [phase, setPhase] = useState<Phase>('setup');
  const [cultureId, setCultureId] = useState(
    () => cultures.find((c) => c.id === skyCultureId)?.id ?? cultures[0]?.id ?? '',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<RecordedGameResult | null>(null);
  const [feedbackMotion] = useState(() => new Animated.Value(0));

  const culture = cultures.find((c) => c.id === cultureId);
  const question = run?.questions[run.index];
  const answered = run?.chosen != null;
  const lineColor = culture?.lineColor ?? colors.constellationLine;
  const sideBySide = layout.landscape && layout.width >= SIDE_BY_SIDE_MIN_WIDTH;

  useEffect(() => {
    if (!answered) return;
    feedbackMotion.setValue(reducedMotion ? 1 : 0);
    if (!reducedMotion) {
      Animated.spring(feedbackMotion, {
        toValue: 1,
        useNativeDriver: true,
        damping: 24,
        stiffness: 260,
      }).start();
    }
  }, [answered, feedbackMotion, reducedMotion]);

  /** A négy lehetőség kis térképe vonalakkal; a kérdésváltáskor számolódik újra. */
  const charts = useMemo(
    () =>
      question
        ? question.options.map((option) => ({
            option,
            model: buildChartModel(option, getStarCatalog(), {
              fieldMagLimit: 5,
              maxFieldStars: 25,
            }),
            lines: option.segments.map(
              ([a, b]): ChartLine => ({
                key: segmentKey(a, b),
                a,
                b,
                color: lineColor,
                opacity: 0.9,
                thickness: 1.5,
              }),
            ),
          }))
        : [],
    [question, lineColor],
  );

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/games');
  }

  function start() {
    if (!culture) return;
    const questions = buildBeliefQuestions(
      culture.beliefs,
      culture.pool,
      BELIEF_ROUNDS,
      BELIEF_OPTIONS,
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

  function answer(optionId: string, answeredAt: number) {
    if (!run || !question || run.chosen !== null) return;
    const correct = optionId === question.correctId;
    const streak = correct ? run.streak + 1 : 0;
    const points = beliefPoints({
      correct,
      elapsedMs: answeredAt - run.questionStartedAt,
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
      setRun({
        ...run,
        index: run.index + 1,
        chosen: null,
        questionStartedAt: Date.now(),
        lastPoints: 0,
      });
      return;
    }
    setPhase('done');
    void recordGameResult('belief-guess', run.score, {
      difficulty,
      correctCount: run.correct,
      rounds: run.questions.length,
    }).then((saved) => {
      setResult(saved);
    });
  }

  function renderOption(entry: (typeof charts)[number], index: number) {
    if (!run || !question) return null;
    const { option, model, lines } = entry;
    const isCorrect = option.id === question.correctId;
    const isChosen = option.id === run.chosen;
    return (
      <Pressable
        key={option.id}
        accessibilityRole="button"
        accessibilityLabel={answered ? option.name : `${t('games.belief.pattern')} ${index + 1}`}
        accessibilityState={{ disabled: answered, selected: isChosen }}
        disabled={answered}
        onPress={() => answer(option.id, Date.now())}
        testID={`belief-option-${option.id}`}
        style={({ pressed }) => [
          styles.option,
          answered && isCorrect && styles.optionCorrect,
          answered && isChosen && !isCorrect && styles.optionWrong,
          answered && !isCorrect && !isChosen && styles.optionDim,
          pressed && styles.pressed,
        ]}
      >
        <GameChartStage>
          <SkyChart
            model={model}
            lines={lines}
            accessibilityLabel={`${t('games.belief.pattern')} ${index + 1}`}
          />
        </GameChartStage>
        {answered ? (
          <Text style={styles.optionName} numberOfLines={1}>
            {option.name}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  const difficultyLabel = t(difficulty === 'hard' ? 'games.hard' : 'games.easy');
  const correctAnswer = run?.chosen != null && run.chosen === question?.correctId;

  return (
    <GameFrame
      title={t('games.belief.title')}
      onBack={leave}
      testID="game-frame-belief"
      headerRight={
        phase === 'playing' && run ? (
          <>
            <Badge label={`${run.index + 1}/${run.questions.length}`} icon="albums-outline" />
            <Badge label={`${run.score}`} icon="star" tone="gold" />
          </>
        ) : null
      }
      footer={
        phase === 'playing' && answered && run && question ? (
          <Animated.View
            style={{
              opacity: reducedMotion ? 1 : feedbackMotion,
              transform: [
                {
                  translateY: reducedMotion
                    ? 0
                    : feedbackMotion.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                },
              ],
            }}
          >
            <GlassCard style={styles.feedback} testID="belief-feedback">
              <View style={styles.feedbackCopy}>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.feedbackTitle,
                    { color: correctAnswer ? colors.success : colors.danger },
                  ]}
                >
                  {correctAnswer
                    ? `${t('games.identify.correct')} +${run.lastPoints}`
                    : t('games.belief.wrong')}
                </Text>
                <Text style={styles.feedbackSub} numberOfLines={2}>
                  {t('games.belief.answerIs')} {question.target.name}
                  {question.target.nativeName ? ` (${question.target.nativeName})` : ''}
                </Text>
              </View>
              <Button
                title={run.index + 1 < run.questions.length ? t('games.next') : t('games.results')}
                onPress={next}
                testID="belief-next"
                style={styles.next}
              />
            </GlassCard>
          </Animated.View>
        ) : null
      }
    >
      {phase === 'setup' ? (
        <View style={styles.setupStage}>
          <GameSetup
            intro={t('games.belief.intro')}
            difficultyHints={{ easy: t('games.belief.easy'), hard: t('games.belief.hard') }}
            cultures={cultures}
            cultureId={cultureId}
            onCultureChange={setCultureId}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onStart={start}
          />
        </View>
      ) : null}

      {phase === 'playing' && run && question ? (
        <View style={[styles.playing, sideBySide && styles.playingSideBySide]}>
          <GlassCard
            style={[
              styles.clue,
              sideBySide ? styles.clueSide : { maxHeight: layout.height * CLUE_HEIGHT_SHARE },
            ]}
            testID="belief-clue"
          >
            {question.target.clueLang !== 'hu' ? (
              <Badge label={t('games.belief.english')} icon="language-outline" />
            ) : null}
            <ScrollView style={styles.clueScroll}>
              <Text
                style={layout.height < SMALL_TEXT_HEIGHT ? styles.clueTextSmall : styles.clueText}
              >
                {visibleClue(question.target.clue, difficulty).join(' ')}
              </Text>
            </ScrollView>
          </GlassCard>

          <View style={[styles.grid, sideBySide && styles.gridSide]} testID="belief-grid">
            <View style={styles.gridRow}>
              {charts.slice(0, 2).map((entry, i) => renderOption(entry, i))}
            </View>
            <View style={styles.gridRow}>
              {charts.slice(2, 4).map((entry, i) => renderOption(entry, i + 2))}
            </View>
          </View>
        </View>
      ) : null}

      {phase === 'done' && run ? (
        <View style={styles.summaryStage}>
          <GameSummary
            compact={layout.height < 440}
            score={run.score}
            best={result?.best ?? run.score}
            isNewBest={result?.isNewBest ?? false}
            newTrophies={result?.newTrophies}
            rows={[
              {
                label: t('games.identify.correctCount'),
                value: `${run.correct}/${run.questions.length}`,
              },
              { label: t('games.difficulty'), value: difficultyLabel },
              { label: t('games.culture'), value: culture?.name ?? '' },
            ]}
            onAgain={() => setPhase('setup')}
            onLeaderboard={() =>
              router.navigate({ pathname: '/leaderboard', params: { game: 'belief-guess' } })
            }
            onExit={leave}
          />
        </View>
      ) : null}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  setupStage: { flex: 1, justifyContent: 'center' },
  summaryStage: { flex: 1, minHeight: 0, justifyContent: 'center' },
  playing: { flex: 1, minHeight: 0, gap: spacing.sm },
  playingSideBySide: { flexDirection: 'row' },
  clue: { flexShrink: 0, gap: spacing.sm, alignItems: 'flex-start' },
  clueSide: { flex: 1, flexShrink: 1, minWidth: 0, alignSelf: 'stretch' },
  clueScroll: { alignSelf: 'stretch' },
  clueText: { ...font.body, color: colors.text, lineHeight: spacing.xl },
  clueTextSmall: { ...font.small, color: colors.text, lineHeight: 20 },
  grid: { flex: 1, minHeight: 0, gap: spacing.sm },
  gridSide: { flex: 1.4, minWidth: 0 },
  gridRow: { flex: 1, minHeight: 0, flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  optionCorrect: { borderColor: colors.success },
  optionWrong: { borderColor: colors.danger },
  optionDim: { opacity: 0.5 },
  optionName: { ...font.caption, color: colors.text, fontWeight: '600', textAlign: 'center' },
  pressed: { transform: [{ scale: sizing.cardPressScale }] },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feedbackCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  feedbackTitle: { ...font.heading },
  feedbackSub: { ...font.small, color: colors.textMuted },
  next: { flexShrink: 0, minWidth: 128 },
});
