import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadBestScores, recordBestScore } from '../scoreStorage';

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

  it('a sérült tárolt adat nem dobja el a játékot', async () => {
    await AsyncStorage.setItem('csillagnezo.gameBest.v1', '{nem json');
    expect(await loadBestScores()).toEqual({});
    expect((await recordBestScore('star-connection', 10)).isNewBest).toBe(true);
  });
});
