import { sharedAccountName } from '@/core/accountName';
import { useAuthStore } from '@/state/useAuthStore';

import { useLeaderboard } from './useLeaderboard';

/**
 * A profilon és a ranglista alján megjelenő név. Ugyanabból az állapotból számol,
 * ezért a két hely nem csúszhat szét, és a felhasználónév megadása azonnal látszik.
 */
export function useAccountName(): string {
  const user = useAuthStore((state) => state.user);
  const displayName = useAuthStore((state) => state.displayName);
  const nameResolved = useAuthStore((state) => state.nameResolved);
  const leaderboard = useLeaderboard('all', user?.uid);
  const boardReady = leaderboard.status === 'ready' || leaderboard.status === 'error';

  return sharedAccountName({
    signedIn: Boolean(user),
    username: displayName,
    leaderboardName: leaderboard.me?.player?.displayName,
    email: user?.email,
    nameResolved: nameResolved || boardReady,
  });
}