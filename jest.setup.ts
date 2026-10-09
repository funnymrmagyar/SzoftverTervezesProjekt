// A natív AsyncStorage modul Jestben nem létezik — a csomag saját mockját használjuk.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
