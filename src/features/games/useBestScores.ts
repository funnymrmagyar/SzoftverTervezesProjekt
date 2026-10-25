import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadBestScores, type BestScores } from './scoreStorage';

/** A helyi rekordok; a képernyő minden fókuszálásakor frissül (játék után is). */
export function useBestScores(): BestScores {
  const [scores, setScores] = useState<BestScores>({});
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadBestScores().then((loaded) => {
        if (active) setScores(loaded);
      });
      return () => {
        active = false;
      };
    }, []),
  );
  return scores;
}
