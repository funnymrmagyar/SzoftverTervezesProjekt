/**
 * Az emulátoros integrációs tesztek (npm run test:auth).
 * Szándékosan NEM a jest-expo presetet használja: tiszta Node-környezetben fut,
 * a Firebase Node-os csomagjával és a Node beépített fetch-ével.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: [require.resolve('expo/internal/babel-preset')] }],
  },
  // Az Expo Babel-presetje a process.env.EXPO_PUBLIC_… hivatkozásokat (src/config/env.ts)
  // az expo/virtual/env modulra írja át, ami ES modul: ezt az egyet le kell fordítani.
  transformIgnorePatterns: ['/node_modules/(?!expo/virtual/)'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 20000,
};
