import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadPlayerStats,
  loadTrophyIds,
  removePlayerStats,
  removeTrophyIds,
  savePlayerStats,
  saveTrophyIds,
} from '../localPlayerData';

describe('helyi trófeaadatok', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('elmenti és betölti a trófeákat fiókonként elkülönítve', async () => {
    await saveTrophyIds('user-1', ['first-light', 'explorer', 'first-light']);
    await saveTrophyIds('user-2', ['night-owl']);

    expect(await loadTrophyIds('user-1')).toEqual(['first-light', 'explorer']);
    expect(await loadTrophyIds('user-2')).toEqual(['night-owl']);
  });

  it('csak a kért fiók trófea-cache-ét törli', async () => {
    await saveTrophyIds('user-1', ['first-light']);
    await saveTrophyIds('user-2', ['night-owl']);
    await removeTrophyIds('user-1');

    expect(await loadTrophyIds('user-1')).toEqual([]);
    expect(await loadTrophyIds('user-2')).toEqual(['night-owl']);
  });

  it('a játékstatisztikát fiókonként tárolja, sérült adatnál üresről indul', async () => {
    const stats = { gamesPlayed: 2, plays: { 'belief-guess': 2 }, days: ['2026-11-09'] };
    await savePlayerStats('user-1', stats);

    expect(await loadPlayerStats('user-1')).toEqual(stats);
    expect(await loadPlayerStats('user-2')).toEqual({ gamesPlayed: 0, plays: {}, days: [] });

    await AsyncStorage.setItem('csillagnezo.playerStats.v1.user-2', '{rossz json');
    expect(await loadPlayerStats('user-2')).toEqual({ gamesPlayed: 0, plays: {}, days: [] });

    await removePlayerStats('user-1');
    expect(await loadPlayerStats('user-1')).toEqual({ gamesPlayed: 0, plays: {}, days: [] });
  });
});
