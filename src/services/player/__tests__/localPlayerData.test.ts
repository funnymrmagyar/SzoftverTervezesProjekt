import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadTrophyIds, removeTrophyIds, saveTrophyIds } from '../localPlayerData';

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
});
