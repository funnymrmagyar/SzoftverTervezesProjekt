// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'data-raw/*', '.expo/*'],
  },
  {
    // A three.js elemek (pl. <points geometry=…>) R3F tulajdonságai nem DOM-attribútumok.
    rules: { 'react/no-unknown-property': 'off' },
  },
  {
    // Naplózni a központi loggerrel kell (src/services/logger), nem közvetlen console.* hívással.
    // Az egyetlen kivétel a logger konzolra író része (consoleTransport.ts, eslint-disable-lel).
    files: ['src/**'],
    rules: { 'no-console': 'error' },
  },
  {
    // A React Three Fiber szándékosan, imperatívan módosítja a three.js objektumokat
    // (kamera, uniformok) — ez a React Compiler „immutability” szabályával ütközik.
    files: ['src/render/**'],
    rules: { 'react-hooks/immutability': 'off' },
  },
]);
