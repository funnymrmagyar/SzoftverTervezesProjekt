import { useState } from 'react';
import { PanResponder, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { useViewStore } from '@/state/useViewStore';

function touchDistance(e: GestureResponderEvent): number | null {
  const t = e.nativeEvent.touches;
  if (!t || t.length < 2) return null;
  return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
}

/**
 * Gesztuskezelő a React-renderen kívül: a húzás közbeni állapot (utolsó elmozdulás,
 * csippentés kezdete) sima változókban él, a nézetet a useViewStore-ban állítja.
 */
function createSkyGestures() {
  let viewportHeight = 800;
  let last = { x: 0, y: 0 };
  let pinch: { distance: number; fov: number } | null = null;

  const responder = PanResponder.create({
    // A *Capture változatokkal a gesztust a 3D vászon előtt elkapjuk.
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      last = { x: 0, y: 0 };
      pinch = null;
    },
    onPanResponderMove: (e, g) => {
      const view = useViewStore.getState();
      const distance = touchDistance(e);
      if (distance) {
        // Két ujj: nagyítás a kezdeti távolsághoz képest
        if (!pinch) pinch = { distance, fov: view.fov };
        else view.setFov((pinch.fov * pinch.distance) / distance);
      } else {
        pinch = null;
        view.drag(g.dx - last.x, g.dy - last.y, viewportHeight);
      }
      last = { x: g.dx, y: g.dy };
    },
  });

  return {
    panHandlers: responder.panHandlers,
    onLayout: (e: LayoutChangeEvent) => {
      viewportHeight = e.nativeEvent.layout.height;
    },
  };
}

/** Húzással forgatható, csippentéssel nagyítható égbolt (mobilon és weben is). */
export function useSkyGestures() {
  const [gestures] = useState(createSkyGestures);
  return gestures;
}
