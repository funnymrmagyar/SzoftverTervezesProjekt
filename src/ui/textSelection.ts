import { Platform } from 'react-native';

let previousUserSelect: string | null = null;

function setSuppressed(suppressed: boolean) {
  const style = document.body.style;
  if (suppressed) {
    if (previousUserSelect === null) previousUserSelect = style.userSelect;
    style.userSelect = 'none';
    style.webkitUserSelect = 'none';
    window.getSelection()?.removeAllRanges();
  } else if (previousUserSelect !== null) {
    style.userSelect = previousUserSelect;
    style.webkitUserSelect = previousUserSelect;
    previousUserSelect = null;
  }
}

/**
 * Lenyomástól az elengedésig tiltja a szövegkijelölést az egész oldalon (csak böngészőben).
 * Húzás (csúszka, ablakmozgatás) közben különben kijelölődik a szöveg az egér alatt, és a
 * react-native-web a kijelölés miatt megszakítja a húzást — ettől „akadt el” az ablak.
 * A lenyomás kezdetén kell hívni; natív platformon nem csinál semmit.
 */
export function suppressTextSelectionUntilRelease(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  setSuppressed(true);
  const restore = () => {
    window.removeEventListener('pointerup', restore, true);
    window.removeEventListener('pointercancel', restore, true);
    setSuppressed(false);
  };
  window.addEventListener('pointerup', restore, true);
  window.addEventListener('pointercancel', restore, true);
}
