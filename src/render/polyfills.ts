// A three.js CommonJS-buildje betöltéskor process.emitWarning-ot hív, ami React Native-ben
// nem létezik („undefined is not a function”). Üres függvénnyel pótoljuk.
if (typeof process !== 'undefined' && typeof process.emitWarning !== 'function') {
  process.emitWarning = () => {};
}
