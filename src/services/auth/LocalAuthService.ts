import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthError, type AuthService, type AuthUser } from './AuthService';
import { authErrorMessage } from './authErrors';
import { MIN_PASSWORD_LENGTH } from './validation';

/** Minimális tárolófelület (az AsyncStorage és a tesztbeli mock is megfelel neki). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}

export const LOCAL_AUTH_KEY = 'csillagnezo.local-auth.v1';

interface Stored {
  accounts: Record<string, { uid: string; password: string }>;
  currentEmail: string | null;
  nextId: number;
}

/**
 * Helyi AuthService: nincs hálózat és nincs Firebase, a fiókok a készüléken maradnak
 * (telefonon AsyncStorage, weben localStorage), így az app újraindítás után is emlékszik rájuk.
 *
 * CSAK FEJLESZTÉSHEZ ÉS BEMUTATÓHOZ: a jelszavakat nem védi, és a fiókok nem közösek az
 * eszközök között. Éles használathoz a FirebaseAuthService való (lásd services/bootstrap.ts).
 */
export class LocalAuthService implements AuthService {
  private data: Stored = { accounts: {}, currentEmail: null, nextId: 1 };
  private readonly ready: Promise<void>;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();

  constructor(private readonly storage: KeyValueStorage = AsyncStorage) {
    this.ready = this.load();
  }

  async register(email: string, password: string): Promise<AuthUser> {
    await this.ready;
    const key = email.trim().toLowerCase();
    if (this.data.accounts[key]) throw this.error('auth/email-already-in-use');
    if (password.length < MIN_PASSWORD_LENGTH) throw this.error('auth/weak-password');
    this.data.accounts[key] = { uid: `local-${this.data.nextId++}`, password };
    this.data.currentEmail = key;
    await this.commit();
    return this.currentUser()!;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    await this.ready;
    const key = email.trim().toLowerCase();
    const account = this.data.accounts[key];
    if (!account || account.password !== password) throw this.error('auth/invalid-credential');
    this.data.currentEmail = key;
    await this.commit();
    return this.currentUser()!;
  }

  async signOut(): Promise<void> {
    await this.ready;
    this.data.currentEmail = null;
    await this.commit();
  }

  onAuthChanged(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    // A Firebase-hez hasonlóan az első értéket akkor adjuk, amikor a tárolt állapot betöltődött.
    void this.ready.then(() => {
      if (this.listeners.has(listener)) listener(this.currentUser());
    });
    return () => this.listeners.delete(listener);
  }

  private currentUser(): AuthUser | null {
    const email = this.data.currentEmail;
    const account = email ? this.data.accounts[email] : undefined;
    return email && account ? { uid: account.uid, email } : null;
  }

  private async load(): Promise<void> {
    try {
      const raw = await this.storage.getItem(LOCAL_AUTH_KEY);
      if (raw) this.data = { ...this.data, ...(JSON.parse(raw) as Partial<Stored>) };
    } catch {
      // Sérült vagy elérhetetlen tároló: üres állapottal indulunk.
    }
  }

  /** Elmenti az állapotot, majd értesíti a feliratkozókat. */
  private async commit(): Promise<void> {
    try {
      await this.storage.setItem(LOCAL_AUTH_KEY, JSON.stringify(this.data));
    } catch {
      // Ha nem sikerül menteni, az app a munkamenet végéig még működik.
    }
    const user = this.currentUser();
    this.listeners.forEach((l) => l(user));
  }

  private error(code: string) {
    return new AuthError(authErrorMessage(code), code);
  }
}
