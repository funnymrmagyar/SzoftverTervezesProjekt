import { create } from 'zustand';

import { getAuthService, toAuthError, type AuthUser } from '@/services/auth';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Folyamatban lévő bejelentkezés/regisztráció (gomb tiltásához). */
  busy: boolean;
  /** Az utolsó művelet hibája, magyarul. */
  error: string | null;

  /** Feliratkozik a Firebase állapotváltozásaira; az app indulásakor egyszer hívjuk. */
  startListening(): () => void;
  signIn(email: string, password: string): Promise<boolean>;
  register(email: string, password: string): Promise<boolean>;
  signOut(): Promise<void>;
  clearError(): void;
}

export const useAuthStore = create<AuthState>((set) => {
  /** Közös hibakezelés a bejelentkezéshez és a regisztrációhoz. */
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    set({ busy: true, error: null });
    try {
      await action();
      return true;
    } catch (error) {
      set({ error: toAuthError(error).message });
      return false;
    } finally {
      set({ busy: false });
    }
  }

  return {
    status: 'loading',
    user: null,
    busy: false,
    error: null,

    startListening: () =>
      getAuthService().onAuthChanged((user) =>
        set({ user, status: user ? 'signedIn' : 'signedOut' }),
      ),

    signIn: (email, password) => run(() => getAuthService().signIn(email, password)),
    register: (email, password) => run(() => getAuthService().register(email, password)),
    signOut: () => getAuthService().signOut(),
    clearError: () => set({ error: null }),
  };
});
