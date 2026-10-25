import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { getStarCatalog } from '@/core/catalog';
import { buildChartModel, type PlacedStar } from '@/features/games/chartModel';
import {
  CONNECT_ROUNDS,
  connectProgress,
  connectRoundPoints,
  initConnect,
  requestHint,
  tapStar,
  type ConnectState,
} from '@/features/games/connectLogic';
import { GameHeader, GameSetup, GameSummary } from '@/features/games/GameChrome';
import { getPlayableCultures } from '@/features/games/gamePools';
import type { Difficulty } from '@/features/games/gameOptions';
import { MAX_CONNECT_SEGMENTS, segmentKey, type GameConstellation } from '@/features/games/pool';
import { createRng, sample } from '@/features/games/random';
import { recordBestScore } from '@/features/games/scoreStorage';
import { SkyChart, type ChartLine } from '@/features/games/SkyChart';
import { useSkyStore } from '@/state/useSkyStore';
import { Button } from '@/ui/Button';
import { Badge, GlassCard } from '@/ui/components';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { t } from '@/ui/i18n';
import { colors, font, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

type Phase = 'setup' | 'playing' | 'done';

/** Ennél fényesebb háttércsillagra is lehet koppintani (az téves választás). */
const TAPPABLE_FIELD_MAG = 5;
/** A halvány segédvonal (nyom) láthatósága könnyű módban. */
const GHOST_OPACITY = 0.22;

interface Run {
  rounds: GameConstellation[];
  index: number;
  conn: ConnectState;
  /** A már lezárt körök pontjainak összege. */
  banked: number;
}

function statusMessage(conn: ConnectState): { text: string; tone: 'muted' | 'good' | 'bad' } {
  if (conn.hint) return { text: t('games.connect.hintShown'), tone: 'muted' };
  switch (conn.event) {
    case 'selected':
      return { text: t('games.connect.pickSecond'), tone: 'muted' };
    case 'connected':
      return { text: t('games.connect.good'), tone: 'good' };
    case 'complete':
      return { text: t('games.connect.roundDone'), tone: 'good' };
    case 'duplicate':
      return { text: t('games.connect.duplicate'), tone: 'muted' };
    case 'wrong-line':
      return { text: t('games.connect.wrongLine'), tone: 'bad' };
    case 'wrong-star':
      return { text: t('games.connect.wrongStar'), tone: 'bad' };
    default:
      return { text: t('games.connect.pickFirst'), tone: 'muted' };
  }
}

export default function StarConnectionScreen() {
  const layout = useBreakpoint();
  const cultures = useMemo(() => getPlayableCultures(MAX_CONNECT_SEGMENTS), []);
  const skyCultureId = useSkyStore((state) => state.cultureId);

  const [phase, setPhase] = useState<Phase>('setup');
  const [cultureId, setCultureId] = useState(
    () => cultures.find((c) => c.id === skyCultureId)?.id ?? cultures[0]?.id ?? '',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ best: number; isNewBest: boolean } | null>(null);

  const culture = cultures.find((c) => c.id === cultureId);
  const conn = run?.conn;
  const finished = conn?.finishedAt != null;
  const roundPoints = conn ? connectRoundPoints(conn) : 0;

  const target = run?.rounds[run.index];
  const model = useMemo(
    () => (target ? buildChartModel(target, getStarCatalog()) : null),
    [target],
  );

  const lines = useMemo<ChartLine[]>(() => {
    if (!conn) return [];
    const color = culture?.lineColor ?? colors.constellationLine;
    const showGhost = difficulty === 'easy' || conn.finishedAt !== null;
    const out: ChartLine[] = [];
    for (const [a, b] of conn.target.segments) {
      const key = segmentKey(a, b);
      if (conn.drawn.has(key)) {
        out.push({ key, a, b, color, thickness: 3 });
      } else if (showGhost) {
        out.push({ key, a, b, color, opacity: GHOST_OPACITY, thickness: 2 });
      }
    }
    return out;
  }, [conn, difficulty, culture]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/games');
  }

  function start() {
    if (!culture) return;
    const rounds = sample(culture.pool, Math.min(CONNECT_ROUNDS, culture.pool.length), createRng(Date.now()));
    setResult(null);
    setRun({ rounds, index: 0, conn: initConnect(rounds[0], difficulty, Date.now()), banked: 0 });
    setPhase('playing');
  }

  function onStarPress(star: PlacedStar) {
    setRun((prev) =>
      prev ? { ...prev, conn: tapStar(prev.conn, star.hip, star.figure, Date.now()) } : prev,
    );
  }

  function hint() {
    setRun((prev) => (prev ? { ...prev, conn: requestHint(prev.conn) } : prev));
  }

  function next() {
    if (!run || run.conn.finishedAt === null) return;
    const banked = run.banked + connectRoundPoints(run.conn);
    if (run.index + 1 < run.rounds.length) {
      const index = run.index + 1;
      setRun({ ...run, index, banked, conn: initConnect(run.rounds[index], difficulty, Date.now()) });
      return;
    }
    setRun({ ...run, banked });
    setPhase('done');
    recordBestScore('star-connection', banked).then(setResult);
  }

  const difficultyLabel = t(difficulty === 'hard' ? 'games.hard' : 'games.easy');
  const contentStyle: ViewStyle = { paddingLeft: layout.pagePadding, paddingBottom: spacing.xl };
  const status = conn ? statusMessage(conn) : null;
  const progress = conn ? connectProgress(conn) : null;

  return (
    <ScreenContainer maxWidth={sizing.contentCompact} contentStyle={contentStyle}>
      <View style={styles.content}>
        <GameHeader title={t('games.connect.title')} onBack={leave}>
          {phase === 'playing' && run ? (
            <>
              <Badge label={`${run.index + 1}/${run.rounds.length}`} icon="albums-outline" />
              <Badge label={`${run.banked + roundPoints}`} icon="star" tone="gold" />
            </>
          ) : null}
        </GameHeader>

        {phase === 'setup' ? (
          <GameSetup
            intro={t('games.connect.intro')}
            difficultyHints={{ easy: t('games.connect.easy'), hard: t('games.connect.hard') }}
            cultures={cultures}
            cultureId={cultureId}
            onCultureChange={setCultureId}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onStart={start}
          />
        ) : null}

        {phase === 'playing' && run && conn && model && status && progress ? (
          <View style={styles.stack}>
            <View style={styles.target}>
              <Text style={styles.targetLabel}>{t('games.connect.prompt')}</Text>
              <Text style={styles.targetName} testID="connect-target">
                {conn.target.name}
              </Text>
              {conn.target.nativeName ? (
                <Text style={styles.targetNative}>{conn.target.nativeName}</Text>
              ) : null}
            </View>

            <SkyChart
              model={model}
              lines={lines}
              selected={conn.selected}
              hinted={conn.hint ?? []}
              isTappable={(star) => star.figure || star.mag <= TAPPABLE_FIELD_MAG}
              onStarPress={finished ? undefined : onStarPress}
              accessibilityLabel={`${t('games.connect.prompt')} ${conn.target.name}`}
              testID="connect-chart"
            />

            <View style={styles.statusRow}>
              <Badge
                label={`${progress.drawn}/${progress.total} ${t('games.connect.lines')}`}
                icon="git-commit-outline"
              />
              <Badge label={`${t('games.connect.mistakes')}: ${conn.mistakes}`} icon="close-circle-outline" />
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.status,
                status.tone === 'good' && { color: colors.success },
                status.tone === 'bad' && { color: colors.danger },
              ]}
            >
              {status.text}
            </Text>

            {finished ? (
              <GlassCard style={styles.stack} testID="connect-round-done">
                <Text style={styles.points}>+{roundPoints}</Text>
                <Button
                  title={run.index + 1 < run.rounds.length ? t('games.next') : t('games.results')}
                  onPress={next}
                  testID="connect-next"
                />
              </GlassCard>
            ) : (
              <Button
                title={t('games.connect.hintButton')}
                variant="secondary"
                icon="bulb-outline"
                onPress={hint}
                testID="connect-hint"
              />
            )}
          </View>
        ) : null}

        {phase === 'done' && run ? (
          <GameSummary
            score={run.banked}
            best={result?.best ?? run.banked}
            isNewBest={result?.isNewBest ?? false}
            rows={[
              { label: t('games.round'), value: `${run.rounds.length}` },
              { label: t('games.difficulty'), value: difficultyLabel },
              { label: t('games.culture'), value: culture?.name ?? '' },
            ]}
            onAgain={() => setPhase('setup')}
            onLeaderboard={() =>
              router.navigate({ pathname: '/leaderboard', params: { game: 'star-connection' } })
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
  target: { alignItems: 'center', gap: spacing.xs },
  targetLabel: { ...font.small, color: colors.textMuted },
  targetName: { ...font.title, color: colors.text, textAlign: 'center' },
  targetNative: { ...font.small, color: colors.textSubtle },
  statusRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  status: { ...font.small, color: colors.textMuted, textAlign: 'center', minHeight: spacing.xl },
  points: { ...font.title, color: colors.accent, textAlign: 'center', ...font.mono },
});
