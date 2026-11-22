import en from '@/locales/en.json';
import hu from '@/locales/hu.json';

import { LOCALE_TAGS, getLocale, useLocaleStore, type Locale } from './locale';

export { LOCALES, type Locale } from './locale';

/** A fordítási kulcsok a magyar szótárból származnak; az angol szótárnak mindet tartalmaznia kell. */
export type TranslationKey = keyof typeof hu;

export type TranslationParams = Record<string, string | number>;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { hu, en };

/** Behelyettesíti a `{név}` helyőrzőket; az ismeretlen helyőrző változatlanul marad. */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

/** Ha a `count` paraméter 1, és van `<kulcs>.one` változat, azt használja (pl. „1 trophy”). */
function pluralKey(locale: Locale, key: TranslationKey, params?: TranslationParams): TranslationKey {
  if (params?.count !== 1) return key;
  const one = `${key}.one`;
  return one in dictionaries[locale] ? (one as TranslationKey) : key;
}

/** Fordítás adott nyelven; hiányzó angol szöveg esetén a magyar a tartalék. */
export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const resolved = pluralKey(locale, key, params);
  return interpolate(dictionaries[locale][resolved] ?? hu[resolved], params);
}

/** Fordítás az aktuális nyelven. Komponensben hívd mellé a `useLocale()`-t, hogy váltáskor frissüljön. */
export function t(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLocale(), key, params);
}

/** Feliratkozik a nyelvre: a komponens nyelvváltáskor újrarenderelődik (az állapota megmarad). */
export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale);
}

export function localeTag(): string {
  return LOCALE_TAGS[getLocale()];
}

/** Szám az aktuális nyelv szerint (hu: „1 234”, en: „1,234”). */
export function formatNumber(value: number): string {
  return value.toLocaleString(localeTag());
}
