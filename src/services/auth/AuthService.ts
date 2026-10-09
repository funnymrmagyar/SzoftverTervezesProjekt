/** A felhasználó adatai, amire az appnak szüksége van (Firebase-független). */
export interface AuthUser {
  uid: string;
  email: string | null;
}

/**
 * Hitelesítési szolgáltatás interfésze. Az app többi része csak ezt látja,
 * így a tesztekben egyszerűen kicserélhető (pl. InMemoryAuthService).
 */
export interface AuthService {
  signIn(email: string, password: string): Promise<AuthUser>;
  register(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Feliratkozás a bejelentkezési állapot változására; leiratkozó függvényt ad vissza. */
  onAuthChanged(listener: (user: AuthUser | null) => void): () => void;
}

/** Felhasználónak megjeleníthető hiba (magyar üzenettel). */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
