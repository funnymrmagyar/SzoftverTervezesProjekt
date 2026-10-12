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
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 20000,
};
