import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';
import hu from '@/locales/hu.json';

import { formatNumber, t, translate } from '../i18n';
import { LOCALE_STORAGE_KEY, pickLocale, useLocaleStore } from '../locale';

describe('fordítási szótárak', () => {
  it('az angol szótár ugyanazokat a kulcsokat tartalmazza, mint a magyar', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(hu).sort());
  });

  it('egyik szöveg sem üres, és a helyőrzők mindkét nyelven egyeznek', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(hu) as (keyof typeof hu)[]) {
      expect(hu[key].trim()).not.toBe('');
      expect(en[key].trim()).not.toBe('');
      if (key.endsWith('.one')) continue;
      expect(placeholders(en[key])).toEqual(placeholders(hu[key]));
    }
  });
});

describe('translate', () => {
  it('behelyettesíti a paramétereket, az ismeretlent érintetlenül hagyja', () => {
    expect(translate('en', 'friends.removeLabel', { name: 'Ann' })).toBe('Remove Ann from friends');
    expect(translate('hu', 'friends.removeLabel', { name: 'Ann' })).toBe(
      'Ann eltávolítása a barátok közül',
    );
    expect(translate('en', 'friends.removeLabel')).toContain('{name}');
  });

  it('egyes számot használ, ha count === 1 és van .one változat', () => {
    expect(translate('en', 'leaderboard.trophies', { count: 1 })).toBe(
      en['leaderboard.trophies.one'],
    );
    expect(translate('en', 'leaderboard.trophies', { count: 3 })).toBe(en['leaderboard.trophies']);
  });

  it('a t() az aktív nyelven fordít, váltáskor azonnal', async () => {
    expect(t('app.title')).toBe(hu['app.title']);
    await useLocaleStore.getState().setLocale('en');
    expect(t('app.title')).toBe(en['app.title']);
  });
});

describe('nyelvválasztás', () => {
  it('az első támogatott nyelvet választja, egyébként magyar a tartalék', () => {
    expect(pickLocale(['en-GB', 'hu-HU'])).toBe('en');
    expect(pickLocale(['de-DE', 'hu'])).toBe('hu');
    expect(pickLocale(['de-DE', 'fr'])).toBe('hu');
    expect(pickLocale([])).toBe('hu');
    expect(pickLocale([undefined, 'EN_us'])).toBe('en');
  });

  it('a beállítást elmenti, és induláskor visszatölti', async () => {
    await useLocaleStore.getState().setLocale('en');
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');

    useLocaleStore.setState({ locale: 'hu', ready: false });
    await useLocaleStore.getState().hydrate();
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(useLocaleStore.getState().ready).toBe(true);
  });

  it('érvénytelen mentett érték esetén megmarad az aktuális nyelv', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'de');
    await useLocaleStore.getState().hydrate();
    expect(useLocaleStore.getState().locale).toBe('hu');
  });
});

describe('számformázás', () => {
  it('a nyelv szerint tagol', async () => {
    expect(formatNumber(12345.5)).toBe(new Intl.NumberFormat('hu-HU').format(12345.5));
    await useLocaleStore.getState().setLocale('en');
    expect(formatNumber(12345.5)).toBe('12,345.5');
  });
});
