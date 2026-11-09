import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  createPlayerProfile,
  mergePlayerProfiles,
  parsePlayerProfile,
} from '@/core/models/PlayerProfile';
import { t } from '@/ui/i18n';

import { GAME_IDS, GAME_OPTIONS, isGameId } from '../gameOptions';
import { loadBestScores, migrateLegacyBestScores, recordBestScore } from '../scoreStorage';

describe('játékok listája', () => {
  it('az azonosítók egyediek, az útvonal pedig az azonosítóból következik', () => {
    expect(new Set(GAME_IDS).size).toBe(GAME_OPTIONS.length);
    for (const game of GAME_OPTIONS) expect(game.route).toBe(`/play/${game.id}`);
  });

  it('a hiedelem-találó szerepel a listában', () => {
    expect(GAME_IDS).toContain('belief-guess');
    expect(isGameId('belief-guess')).toBe(true);
  });

  it('az isGameId csak ismert játékazonosítót fogad el', () => {
    expect(isGameId('star-connection')).toBe(true);
    expect(isGameId('ismeretlen-jatek')).toBe(false);
    expect(isGameId(undefined)).toBe(false);
    expect(isGameId(7)).toBe(false);
  });

  it('minden játék címe, alcíme és ranglista-címkéje le van fordítva', () => {
    for (const game of GAME_OPTIONS) {
      for (const key of [game.titleKey, game.subtitleKey, game.leaderboardKey]) {
        expect(t(key)).toBeTruthy();
        expect(t(key)).not.toBe(key);
      }
    }
  });
});

describe('Firestore-szabályok', () => {
  const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

  it('minden játékot felsorolnak, különben a pontja csendben nem mentődne el online', () => {
    const hasOnly = rules.match(/scores\.keys\(\)\.hasOnly\(\[([^\]]*)\]\)/);
    expect(hasOnly).not.toBeNull();
    const allowed = [...(hasOnly?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect([...allowed].sort()).toEqual([...GAME_IDS].sort());
    for (const id of GAME_IDS) {
      expect(rules).toContain(`validScore(scores['${id}'])`);
    }
  });
});

describe('helyi rekordok a harmadik játékkal', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('a hiedelem-találó rekordját elmenti és vissza is olvassa', async () => {
    expect(await recordBestScore('belief-guess', 410)).toEqual({ best: 410, isNewBest: true });
    expect(await recordBestScore('belief-guess', 300)).toEqual({ best: 410, isNewBest: false });
    expect(await loadBestScores()).toEqual({ 'belief-guess': 410 });
  });

  it('az ismeretlen játék rekordját eldobja', async () => {
    await AsyncStorage.setItem(
      'csillagnezo.gameBest.v1',
      JSON.stringify({ 'belief-guess': 120, 'ismeretlen-jatek': 999 }),
    );
    expect(await loadBestScores()).toEqual({ 'belief-guess': 120 });
  });

  it('az első fiók a vendégként elért hiedelem-találó rekordot is átveszi', async () => {
    await recordBestScore('belief-guess', 250);
    await recordBestScore('star-connection', 90);
    expect(await migrateLegacyBestScores('user-1')).toEqual({
      'belief-guess': 250,
      'star-connection': 90,
    });
  });
});

describe('játékosprofil a harmadik játékkal', () => {
  it('a profil beolvasása megtartja a hiedelem-találó pontját, a hibás értéket eldobja', () => {
    const profile = parsePlayerProfile(
      { displayName: 'Mari', scores: { 'belief-guess': 330, 'star-connection': -4 } },
      'uid-1',
    );
    expect(profile.scores).toEqual({ 'belief-guess': 330 });
  });

  it('az egyesítés játékonként a nagyobbik pontot tartja meg', () => {
    const local = createPlayerProfile('uid-1', 'Mari', { 'belief-guess': 100 });
    const remote = createPlayerProfile('uid-1', 'Mari', {
      'belief-guess': 240,
      'constellation-finder': 50,
    });
    expect(mergePlayerProfiles(local, remote).scores).toEqual({
      'belief-guess': 240,
      'constellation-finder': 50,
    });
  });
});
