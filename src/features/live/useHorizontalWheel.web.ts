import { useEffect, type RefObject } from 'react';
import type { ScrollViewInstance } from 'react-native';

/**
 * Weben a vízszintes gombsor egérrel is görgethető legyen: a görgő függőleges mozgását
 * vízszintes görgetéssé alakítjuk. Érintőpadon (ami eleve vízszintesen görget) nem avatkozunk be.
 */
export function useHorizontalWheel(ref: RefObject<ScrollViewInstance | null>): void {
  useEffect(() => {
    // Weben a getScrollableNode() maga a DOM-elem (a típus szerint natív azonosító).
    const el = ref.current?.getScrollableNode() as unknown as HTMLElement | null | undefined;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);
}
