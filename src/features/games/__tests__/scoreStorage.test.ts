import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadBestScores,
  migrateLegacyBestScores,
  recordBestScore,
  removeBestScores,
} from '../scoreStorage';

describe('helyi rekordok', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('üres tárból üres eredményt ad', async () => {
    expect(await loadBestScores()).toEqual({});
  });

  it('az első eredmény új rekord, a gyengébb már nem írja felül', async () => {
    expect(await recordBestScore('constellation-finder', 300)).toEqual({
      best: 300,
      isNewBest: true,
    });
    expect(await recordBestScore('constellation-finder', 200)).toEqual({
      best: 300,
      isNewBest: false,
    });
    expect(await recordBestScore('constellation-finder', 450)).toEqual({
      best: 450,
      isNewBest: true,
    });
    expect(await loadBestScores()).toEqual({ 'constellation-finder': 450 });
  });

  it('a két játék rekordja külön tárolódik', async () => {
    await recordBestScore('constellation-finder', 100);
    await recordBestScore('star-connection', 250);
    expect(await loadBestScores()).toEqual({
      'constellation-finder': 100,
      'star-connection': 250,
    });
  });

  it('a bejelentkezett játékos rekordjai elkülönülnek egymástól', async () => {
    await recordBestScore('constellation-finder', 300, 'user-1');
    await recordBestScore('constellation-finder', 120, 'user-2');

    expect(await loadBestScores('user-1')).toEqual({ 'constellation-finder': 300 });
    expect(await loadBestScores('user-2')).toEqual({ 'constellation-finder': 120 });
    expect(await loadBestScores()).toEqual({});
  });

  it('csak a kért fiók helyi rekordjait törli', async () => {
    await recordBestScore('constellation-finder', 300, 'user-1');
    await recordBestScore('constellation-finder', 120, 'user-2');
    await removeBestScores('user-1');

    expect(await loadBestScores('user-1')).toEqual({});
    expect(await loadBestScores('user-2')).toEqual({ 'constellation-finder': 120 });
  });

  it('a korábbi készülékszintű rekordokat csak egyszer migrálja', async () => {
    await recordBestScore('star-connection', 250);

    const firstAccount = await migrateLegacyBestScores('user-1');
    const secondAccount = await migrateLegacyBestScores('user-2');

    expect(firstAccount).toEqual({ 'star-connection': 250 });
    expect(secondAccount).toEqual({});
  });

  it('üres első fiók után sem szivárogtat át későbbi vendégrekordot másik fiókba', async () => {
    expect(await migrateLegacyBestScores('user-1')).toEqual({});
    await recordBestScore('star-connection', 90);

    expect(await migrateLegacyBestScores('user-2')).toEqual({});
    expect(await loadBestScores()).toEqual({ 'star-connection': 90 });
  });

  it('a sérült tárolt adat nem dobja el a játékot', async () => {
    await AsyncStorage.setItem('csillagnezo.gameBest.v1', '{nem json');
    expect(await loadBestScores()).toEqual({});
    expect((await recordBestScore('star-connection', 10)).isNewBest).toBe(true);
  });
});
