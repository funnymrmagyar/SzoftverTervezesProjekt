import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { createLogger } from '@/services/logger';

const log = createLogger('i18n');

export const LOCALES = ['hu', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Ha a készülék nyelve egyik támogatott nyelv sem, ezt használjuk (az app eredeti nyelve). */
export const FALLBACK_LOCALE: Locale = 'hu';

/** A számok és dátumok formázásához használt BCP 47 nyelvi címke. */
export const LOCALE_TAGS: Record<Locale, string> = { hu: 'hu-HU', en: 'en-US' };

export const LOCALE_STORAGE_KEY = 'csillagnezo.locale.v1';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * A preferenciasorrendben megadott nyelvi címkék közül az első támogatott nyelvet választja
 * („hu-HU” → hu, „en-GB” → en); ha egyik sem támogatott, a tartalék nyelvet adja.
 */
export function pickLocale(candidates: readonly (string | null | undefined)[]): Locale {
  for (const candidate of candidates) {
    const language = candidate?.toLowerCase().split(/[-_]/)[0];
    if (isLocale(language)) return language;
  }
  return FALLBACK_LOCALE;
}

/** A készülék / böngésző nyelve (a böngésző nyelvlistája, ennek hiányában az Intl beállítása). */
export function detectDeviceLocale(): Locale {
  const candidates: (string | undefined)[] = [];
  try {
    const languages = (globalThis as { navigator?: { languages?: readonly string[] } }).navigator
      ?.languages;
    if (languages) candidates.push(...languages);
    candidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Az Intl nem elérhető: marad a tartalék nyelv.
  }
  return pickLocale(candidates);
}

interface LocaleState {
  locale: Locale;
  /** Igaz, ha a mentett nyelv betöltődött (addig a felület nem jelenik meg, hogy ne villogjon). */
  ready: boolean;
  setLocale(locale: Locale): Promise<void>;
  hydrate(): Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectDeviceLocale(),
  ready: false,

  setLocale: async (locale) => {
    set({ locale, ready: true });
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch (error) {
      log.warn('A nyelvi beállítás mentése nem sikerült', { error });
    }
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) set({ locale: stored });
    } catch (error) {
      log.warn('A mentett nyelvi beállítás nem olvasható; az eszköz nyelvét használjuk', { error });
    } finally {
      set({ ready: true });
    }
  },
}));

export function getLocale(): Locale {
  return useLocaleStore.getState().locale;
}
