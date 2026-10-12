import { AuthError, type AuthService, type AuthUser } from './AuthService';
import { authErrorMessage } from './authErrors';
import { MIN_PASSWORD_LENGTH } from './validation';

/**
 * Memóriában működő AuthService — tesztekhez és Firebase nélküli kipróbáláshoz.
 * Ugyanazokat a hibakódokat dobja, mint a Firebase.
 */
export class InMemoryAuthService implements AuthService {
  private readonly accounts = new Map<string, { password: string; user: AuthUser }>();
  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  private current: AuthUser | null = null;
  private nextId = 1;

  async register(email: string, password: string): Promise<AuthUser> {
    const key = email.trim().toLowerCase();
    if (this.accounts.has(key)) throw this.error('auth/email-already-in-use');
    if (password.length < MIN_PASSWORD_LENGTH) throw this.error('auth/weak-password');
    const user = { uid: `user-${this.nextId++}`, email: key };
    this.accounts.set(key, { password, user });
    this.setCurrent(user);
    return user;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const account = this.accounts.get(email.trim().toLowerCase());
    if (!account || account.password !== password) throw this.error('auth/invalid-credential');
    this.setCurrent(account.user);
    return account.user;
  }

  async signOut(): Promise<void> {
    this.setCurrent(null);
  }

  onAuthChanged(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.current); // a Firebase is azonnal visszahív az aktuális állapottal
    return () => this.listeners.delete(listener);
  }

  private setCurrent(user: AuthUser | null) {
    this.current = user;
    this.listeners.forEach((l) => l(user));
  }

  private error(code: string) {
    return new AuthError(authErrorMessage(code), code);
  }
}
