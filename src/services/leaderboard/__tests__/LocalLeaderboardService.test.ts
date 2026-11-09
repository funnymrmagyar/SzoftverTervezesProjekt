import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPlayerProfile, type LeaderboardPlayer } from '@/core/models/PlayerProfile';
import {
  deleteLocalPlayerProfile,
  loadLocalLeaderboard,
  syncLocalPlayerProfile,
} from '@/services/player/localPlayerProfiles';

import { LocalLeaderboardService } from '../LocalLeaderboardService';

/** Megvárja, hogy az aszinkron betöltések lefussanak. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('helyi játékosprofilok (helyi mód)', () => {
  it('a szinkron összefésül: a jobb pontszám és a trófeák uniója marad', async () => {
    await syncLocalPlayerProfile(
      createPlayerProfile('u1', 'anna', { 'star-connection': 300 }, ['first']),
    );
    const merged = await syncLocalPlayerProfile(
      createPlayerProfile('u1', 'anna', { 'star-connection': 100, 'belief-guess': 50 }, ['moon']),
    );
    expect(merged.scores).toEqual({ 'star-connection': 300, 'belief-guess': 50 });
    expect(merged.trophyIds.sort()).toEqual(['first', 'moon']);
  });

  it('kijelentkezés után (üres helyi pontokkal) is visszakapja a játékos a pontjait', async () => {
    await syncLocalPlayerProfile(createPlayerProfile('u1', 'anna', { 'star-connection': 300 }));
    const afterSignIn = await syncLocalPlayerProfile(createPlayerProfile('u1', 'anna', {}));
    expect(afterSignIn.scores).toEqual({ 'star-connection': 300 });
  });

  it('a ranglista-bejegyzésben az összpont és a trófeák száma is benne van; törölhető', async () => {
    await syncLocalPlayerProfile(
      createPlayerProfile('u1', 'anna', { 'star-connection': 300, 'belief-guess': 20 }, ['a', 'b']),
    );
    expect(await loadLocalLeaderboard()).toEqual([
      {
        uid: 'u1',
        displayName: 'anna',
        scores: { 'star-connection': 300, 'belief-guess': 20 },
        points: 320,
        trophyCount: 2,
      },
    ]);
    await deleteLocalPlayerProfile('u1');
    expect(await loadLocalLeaderboard()).toEqual([]);
  });
});

describe('helyi ranglista', () => {
  const service = new LocalLeaderboardService();

  beforeEach(async () => {
    await syncLocalPlayerProfile(createPlayerProfile('a', 'Anna', { 'star-connection': 300 }));
    await syncLocalPlayerProfile(createPlayerProfile('b', 'Béla', { 'star-connection': 500 }));
    await syncLocalPlayerProfile(createPlayerProfile('c', 'Cili', { 'belief-guess': 100 }));
    await syncLocalPlayerProfile(createPlayerProfile('d', 'Dani', {}));
  });

  it('a toplista pontszám szerint rendezett, szűrhető és korlátozható', async () => {
    const lists: LeaderboardPlayer[][] = [];
    const stop = service.watchTop('all', 2, (players) => lists.push(players), fail);
    await settle();
    expect(lists.at(-1)?.map((p) => p.uid)).toEqual(['b', 'a']);
    stop();

    const byGame: LeaderboardPlayer[][] = [];
    service.watchTop('belief-guess', 10, (players) => byGame.push(players), fail)();
    await settle();
    expect(byGame.at(-1)?.map((p) => p.uid)).toEqual(['c']);
  });

  it('élő: ha valaki új pontot szerez, a feliratkozók frissített listát kapnak', async () => {
    const lists: LeaderboardPlayer[][] = [];
    const stop = service.watchTop('all', 10, (players) => lists.push(players), fail);
    await settle();
    expect(lists.at(-1)?.map((p) => p.uid)).toEqual(['b', 'a', 'c']);

    await syncLocalPlayerProfile(createPlayerProfile('c', 'Cili', { 'belief-guess': 900 }));
    await settle();
    expect(lists.at(-1)?.map((p) => p.uid)).toEqual(['c', 'b', 'a']);

    stop();
    const count = lists.length;
    await syncLocalPlayerProfile(createPlayerProfile('a', 'Anna', { 'belief-guess': 2000 }));
    await settle();
    expect(lists).toHaveLength(count); // leiratkozás után már nem jön frissítés
  });

  it('a saját bejegyzés és az előttünk lévők száma', async () => {
    const mine: (LeaderboardPlayer | null)[] = [];
    const stop = service.watchPlayer('a', (player) => mine.push(player), fail);
    await settle();
    expect(mine.at(-1)?.points).toBe(300);
    expect(await service.countPlayersAhead('all', 300)).toBe(1);
    expect(await service.countPlayersAhead('star-connection', 500)).toBe(0);
    stop();
  });
});

function fail(error: unknown): never {
  throw error;
}
