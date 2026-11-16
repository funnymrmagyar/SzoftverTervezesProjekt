import { useAuthStore } from '@/state/useAuthStore';

import { setAuthService } from '..';
import { useLocaleStore } from '@/ui/locale';

import { authErrorMessage, toAuthError, unknownErrorMessage } from '../authErrors';
import { InMemoryAuthService } from '../InMemoryAuthService';
import { hasErrors, validateLogin, validateRegistration } from '../validation';

describe('űrlap-ellenőrzés', () => {
  it('helyes regisztrációs adatokra nincs hiba', () => {
    expect(hasErrors(validateRegistration('anna@example.com', 'titok123', 'titok123'))).toBe(false);
  });

  it('jelzi a hibás e-mailt, a rövid jelszót és az eltérő megerősítést', () => {
    const errors = validateRegistration('anna@', '123', '1234');
    expect(errors.email).toBeDefined();
    expect(errors.password).toMatch(/6 karakter/);
    expect(errors.passwordConfirm).toBeDefined();
  });

  it('bejelentkezésnél csak a kitöltöttséget nézi', () => {
    expect(validateLogin('', '')).toEqual({
      email: 'Add meg az e-mail-címed.',
      password: 'Add meg a jelszavad.',
    });
    expect(hasErrors(validateLogin('a@b.hu', '1'))).toBe(false);
  });
});

describe('Firebase-hibák magyarítása', () => {
  it('ismert kódra magyar üzenetet ad', () => {
    expect(authErrorMessage('auth/email-already-in-use')).toMatch(/már regisztráltak/);
  });

  it('ismeretlen hibára általános üzenetet ad', () => {
    expect(authErrorMessage('valami/mas')).toBe(unknownErrorMessage());
    expect(toAuthError(new Error('x')).message).toBe(unknownErrorMessage());
  });

  it('a Firebase-szerű hibaobjektum kódját megőrzi', () => {
    const err = toAuthError({ code: 'auth/invalid-credential' });
    expect(err.code).toBe('auth/invalid-credential');
    expect(err.message).toBe('Hibás e-mail-cím vagy jelszó.');
  });
});

describe('angol nyelvű üzenetek', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' });
  });

  it('az űrlap-ellenőrzés az aktív nyelven ad üzenetet', () => {
    expect(validateLogin('', '')).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
    expect(validateRegistration('anna@example.com', '123', '1234')).toEqual({
      password: 'The password must be at least 6 characters long.',
      passwordConfirm: "The two passwords don't match.",
    });
  });

  it('a hibakódokból angol üzenet lesz, az ismeretlenből általános', () => {
    expect(authErrorMessage('auth/email-already-in-use')).toBe(
      'This email address is already registered.',
    );
    expect(toAuthError({ code: 'auth/wrong-password' }).message).toBe(
      'Wrong email address or password.',
    );
    expect(authErrorMessage('valami/mas')).toBe('An unexpected error occurred. Please try again.');
  });
});

describe('useAuthStore (memóriabeli szolgáltatással)', () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    setAuthService(new InMemoryAuthService());
    useAuthStore.setState({ status: 'loading', user: null, busy: false, error: null });
    unsubscribe = useAuthStore.getState().startListening();
  });

  afterEach(() => unsubscribe());

  it('indulás után kijelentkezett állapotba kerül', () => {
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('regisztráció → bejelentkezett állapot, kijelentkezés → vissza', async () => {
    const ok = await useAuthStore.getState().register('anna@example.com', 'titok123');
    expect(ok).toBe(true);
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(useAuthStore.getState().user?.email).toBe('anna@example.com');

    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('hibás jelszónál magyar hibaüzenetet tárol', async () => {
    await useAuthStore.getState().register('bela@example.com', 'titok123');
    await useAuthStore.getState().signOut();

    const ok = await useAuthStore.getState().signIn('bela@example.com', 'rossz-jelszo');
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toBe('Hibás e-mail-cím vagy jelszó.');
    expect(useAuthStore.getState().busy).toBe(false);
  });

  it('foglalt e-mail-címre nem enged regisztrálni', async () => {
    await useAuthStore.getState().register('cili@example.com', 'titok123');
    const ok = await useAuthStore.getState().register('cili@example.com', 'masik123');
    expect(ok).toBe(false);
    expect(useAuthStore.getState().error).toMatch(/már regisztráltak/);
  });
});
