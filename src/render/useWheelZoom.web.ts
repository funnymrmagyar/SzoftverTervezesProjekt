import { useEffect, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';

import { useViewStore } from '@/state/useViewStore';

/** Weben egérgörgővel nagyítunk. A react-native-web View ref-je maga a DOM-elem. */
export function useWheelZoom(ref: RefObject<ViewInstance | null>): void {
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      useViewStore.getState().zoom(Math.exp(e.deltaY * 0.001));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);
}
