import { useEffect, type RefObject } from 'react';
import type { ScrollView } from 'react-native';

/**
 * Weben a vízszintes gombsor egérrel is görgethető legyen: a görgő függőleges mozgását
 * vízszintes görgetéssé alakítjuk. Érintőpadon (ami eleve vízszintesen görget) nem avatkozunk be.
 */
export function useHorizontalWheel(ref: RefObject<ScrollView | null>): void {
  useEffect(() => {
    const el = ref.current?.getScrollableNode() as HTMLElement | null | undefined;
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
