/*
 * A firebase/auth csomag típusai mindig a webes változatot írják le, pedig
 * Androidon/iOS-en (Metro, react-native feltétel) a getReactNativePersistence is létezik.
 * Ez a deklaráció pótolja a hiányzó típust.
 */
import 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
