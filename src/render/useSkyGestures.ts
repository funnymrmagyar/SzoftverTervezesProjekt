import { useEffect, useState, type RefObject } from 'react';
import {
  PanResponder,
  Platform,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type View,
} from 'react-native';

import { useViewStore } from '@/state/useViewStore';

import type { Viewport } from './labelLayout';

/** Koppintás (kattintás) az égbolton: a pont a nézet bal felső sarkához képest, képpontban. */
export type SkyTapHandler = (x: number, y: number, viewport: Viewport) => void;

/** Ennél kisebb elmozdulás és rövidebb idő koppintásnak számít, nem húzásnak. */
const TAP_SLOP = 8;
const TAP_MAX_MS = 500;

function touchDistance(e: GestureResponderEvent): number | null {
  const t = e.nativeEvent.touches;
  if (!t || t.length < 2) return null;
  return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
}

/**
 * Gesztuskezelő a React-renderen kívül: a húzás közbeni állapot (utolsó elmozdulás,
 * csippentés kezdete) sima változókban él, a nézetet a useViewStore-ban állítja.
 * A rövid, helyben maradó érintést / kattintást koppintásként továbbadja (onTap).
 */
function createSkyGestures() {
  let onTap: SkyTapHandler | undefined;
  let viewportHeight = 800;
  let viewportWidth = 0;
  let touchTap: { x: number; y: number; pageX: number; pageY: number; time: number } | null = null;
  let mouseTap: { x: number; y: number; clientX: number; clientY: number; time: number } | null =
    null;
  let last = { x: 0, y: 0 };
  let pinch: { distance: number; fov: number } | null = null;
  let pinchUsed = false;
  let pendingDrag = { x: 0, y: 0 };
  let pendingFov: number | null = null;
  let animationFrame: number | null = null;
  let flingFrame: number | null = null;
  let velocity = { x: 0, y: 0 };
  let webMouseDragging = false;
  let webLast = { x: 0, y: 0 };
  let webLastTime = 0;
  let webVelocity = { x: 0, y: 0 };

  function finishWebMouseDrag() {
    if (!webMouseDragging) return;
    webMouseDragging = false;
    window.removeEventListener('mousemove', onWebMouseMove);
    window.removeEventListener('mouseup', onWebMouseUp);
    window.removeEventListener('blur', onWebBlur);
    startFling(webVelocity.x, webVelocity.y);
    webVelocity = { x: 0, y: 0 };
  }

  function onWebMouseMove(event: globalThis.MouseEvent) {
    if (!webMouseDragging) return;
    event.preventDefault();
    const dx = event.clientX - webLast.x;
    const dy = event.clientY - webLast.y;
    queueDrag(dx, dy);
    const now = performance.now();
    const elapsed = Math.max(1, now - webLastTime);
    webVelocity = { x: dx / elapsed, y: dy / elapsed };
    webLast = { x: event.clientX, y: event.clientY };
    webLastTime = now;
  }

  function emitTap(x: number, y: number) {
    onTap?.(x, y, { width: viewportWidth, height: viewportHeight });
  }

  function onWebMouseUp(event: globalThis.MouseEvent) {
    const start = mouseTap;
    mouseTap = null;
    finishWebMouseDrag();
    if (
      start &&
      Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) <= TAP_SLOP &&
      performance.now() - start.time <= TAP_MAX_MS
    ) {
      emitTap(start.x, start.y);
    }
  }

  /** Érintés kezdete: csak az egyujjas érintésből lehet koppintás (két ujj = csippentés). */
  function onTouchStart(e: GestureResponderEvent) {
    const { touches, locationX, locationY, pageX, pageY } = e.nativeEvent;
    touchTap =
      touches?.length === 1 ? { x: locationX, y: locationY, pageX, pageY, time: Date.now() } : null;
  }

  function onTouchEnd(e: GestureResponderEvent) {
    const start = touchTap;
    touchTap = null;
    if (!start || (e.nativeEvent.touches?.length ?? 0) > 0) return;
    const moved = Math.hypot(e.nativeEvent.pageX - start.pageX, e.nativeEvent.pageY - start.pageY);
    if (moved <= TAP_SLOP && Date.now() - start.time <= TAP_MAX_MS) emitTap(start.x, start.y);
  }

  function onWebBlur() {
    finishWebMouseDrag();
  }

  function cancelFling() {
    if (flingFrame !== null) cancelAnimationFrame(flingFrame);
    flingFrame = null;
    velocity = { x: 0, y: 0 };
  }

  function applyPendingDrag() {
    animationFrame = null;
    const { x, y } = pendingDrag;
    pendingDrag = { x: 0, y: 0 };
    if (x || y) useViewStore.getState().drag(x, y, viewportHeight);
    if (pendingFov !== null) useViewStore.getState().setFov(pendingFov);
    pendingFov = null;
  }

  function queueDrag(dx: number, dy: number) {
    pendingDrag.x += dx;
    pendingDrag.y += dy;
    if (animationFrame === null) animationFrame = requestAnimationFrame(applyPendingDrag);
  }

  function queueFov(fov: number) {
    pendingFov = fov;
    if (animationFrame === null) animationFrame = requestAnimationFrame(applyPendingDrag);
  }

  function startFling(vx: number, vy: number) {
    cancelFling();
    velocity = { x: vx * 16, y: vy * 16 };
    const animate = () => {
      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed < 0.18) {
        flingFrame = null;
        return;
      }
      useViewStore.getState().drag(velocity.x, velocity.y, viewportHeight);
      velocity = { x: velocity.x * 0.9, y: velocity.y * 0.9 };
      flingFrame = requestAnimationFrame(animate);
    };
    flingFrame = requestAnimationFrame(animate);
  }

  function onWebMouseDown(event: globalThis.MouseEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    cancelFling();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    mouseTap = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      clientX: event.clientX,
      clientY: event.clientY,
      time: performance.now(),
    };
    webMouseDragging = true;
    webLast = { x: event.clientX, y: event.clientY };
    webLastTime = performance.now();
    webVelocity = { x: 0, y: 0 };
    window.addEventListener('mousemove', onWebMouseMove, { passive: false });
    window.addEventListener('mouseup', onWebMouseUp);
    window.addEventListener('blur', onWebBlur);
  }

  const responder = PanResponder.create({
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: (e, g) =>
      (e.nativeEvent.touches?.length ?? 0) >= 2 || Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_e, g) => {
      cancelFling();
      last = { x: g.dx, y: g.dy };
      pinch = null;
      pinchUsed = false;
    },
    onPanResponderMove: (e, g) => {
      const view = useViewStore.getState();
      const distance = touchDistance(e);
      if (distance !== null) {
        cancelFling();
        pinchUsed = true;
        last = { x: g.dx, y: g.dy };
        if (!pinch) pinch = { distance, fov: view.fov };
        else queueFov((pinch.fov * pinch.distance) / distance);
      } else {
        if (pinch) last = { x: g.dx, y: g.dy };
        pinch = null;
        queueDrag(g.dx - last.x, g.dy - last.y);
      }
      last = { x: g.dx, y: g.dy };
    },
    onPanResponderRelease: (_e, g) => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        applyPendingDrag();
      }
      if (!pinchUsed) startFling(g.vx, g.vy);
      pinch = null;
      pinchUsed = false;
    },
    onPanResponderTerminate: () => {
      cancelFling();
      pinch = null;
      pinchUsed = false;
      pendingDrag = { x: 0, y: 0 };
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    },
  });

  return {
    panHandlers: { ...responder.panHandlers, onTouchStart, onTouchEnd },
    onWebMouseDown,
    setOnTap: (handler: SkyTapHandler | undefined) => {
      onTap = handler;
    },
    dispose: () => {
      cancelFling();
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      pendingDrag = { x: 0, y: 0 };
      pendingFov = null;
      pinch = null;
      pinchUsed = false;
      if (webMouseDragging) {
        finishWebMouseDrag();
        cancelFling();
      }
      webVelocity = { x: 0, y: 0 };
    },
    onLayout: (e: LayoutChangeEvent) => {
      viewportHeight = e.nativeEvent.layout.height;
      viewportWidth = e.nativeEvent.layout.width;
    },
  };
}

/**
 * Húzással forgatható, csippentéssel nagyítható égbolt (mobilon és weben is).
 * A koppintásokat (rövid, helyben maradó érintés vagy kattintás) az onTap kapja meg.
 */
export function useSkyGestures(ref: RefObject<View | null>, onTap?: SkyTapHandler) {
  const [gestures] = useState(createSkyGestures);
  useEffect(() => gestures.setOnTap(onTap), [gestures, onTap]);
  useEffect(() => () => gestures.dispose(), [gestures]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = ref.current;
    if (!element || typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) return;
    element.addEventListener('mousedown', gestures.onWebMouseDown, true);
    return () => element.removeEventListener('mousedown', gestures.onWebMouseDown, true);
  }, [gestures, ref]);
  return {
    ...gestures,
  };
}
