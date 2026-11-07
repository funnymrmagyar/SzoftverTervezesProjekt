import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuthStore } from '@/state/useAuthStore';
import { loadMergedBestScores } from './results';
import type { BestScores } from './scoreStorage';

/** A felhasználó rekordjai; a képernyő fókuszálásakor és adatszinkron után frissülnek. */
export function useBestScores(): BestScores {
  const [snapshot, setSnapshot] = useState<{ uid?: string; scores: BestScores }>({
    scores: {},
  });
  const uid = useAuthStore((state) => state.user?.uid);
  const profileRevision = useAuthStore((state) => state.profileRevision);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const requestedRevision = profileRevision;
      if (!uid) {
        setSnapshot({ scores: {} });
        return () => {
          active = false;
        };
      }
      loadMergedBestScores(uid).then((loaded) => {
        if (active && requestedRevision === useAuthStore.getState().profileRevision) {
          setSnapshot({ uid, scores: loaded });
        }
      });
      return () => {
        active = false;
      };
    }, [uid, profileRevision]),
  );
  return snapshot.uid === uid ? snapshot.scores : {};
}
