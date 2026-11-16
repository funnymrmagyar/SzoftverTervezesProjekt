import { useLocaleStore } from '@/ui/locale';

// A tesztek magyar felülettel futnak, függetlenül a tesztgép nyelvétől és az előző teszt állapotától.
beforeEach(() => {
  useLocaleStore.setState({ locale: 'hu', ready: true });
});
