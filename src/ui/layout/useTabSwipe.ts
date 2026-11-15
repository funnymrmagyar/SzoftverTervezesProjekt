import { createContext, useEffect, useState } from 'react';
import { Animated, PanResponder, Platform } from 'react-native';

const useNativeDriver = Platform.OS !== 'web';

/** Ennyi vízszintes elmozdulás után vesszük át a húzást (addig a gombok kattinthatók). */
const START_DISTANCE = 10;
/** Elengedéskor ennyi ms-mal „előre vetítjük” a mozdulatot: egy gyors pöccintés is lapoz. */
const PROJECTION_MS = 180;
/** A szélső oldalakon túl a húzás ennyire „fékez” (gumiszalag-hatás). */
const EDGE_RESISTANCE = 0.25;

/** A lapozó rugója: gyorsan beáll, és nem leng túl az oldalon. */
const PAGE_SPRING = {
  damping: 30,
  stiffness: 280,
  mass: 1,
  overshootClamping: true,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
} as const;

/**
 * A lapozó pillanatnyi helyzete oldalindexben (pl. 1.4 = a 2. és a 3. oldal között).
 * A telefonos alsó sáv ebből mozgatja az aktív oldalt jelző vonalat, így az is az ujjal együtt halad.
 */
export const TabPagerContext = createContext<Animated.Value | null>(null);

interface PagerConfig<T extends string> {
  routes: readonly T[];
  index: number;
  enabled: boolean;
  width: number;
  reducedMotion: boolean;
  onNavigate: (route: T) => void;
}

/** A lapozó állapota a Reacten kívül él: a húzás közbeni értékek nem okoznak újrarajzolást. */
function createTabPager<T extends string>(initialIndex: number) {
  const position = new Animated.Value(initialIndex);
  let config: PagerConfig<T> = {
    routes: [],
    index: initialIndex,
    enabled: false,
    width: 0,
    reducedMotion: false,
    onNavigate: () => undefined,
  };
  let dragStart = initialIndex;
  /** Az épp húzással elindított lapozás célja (az oldalváltás után ezt nem kell újraindítani). */
  let settlingTo: number | null = null;

  const pageWidth = () => Math.max(1, config.width);

  const moveTo = (target: number, velocity = 0) => {
    if (config.reducedMotion) {
      position.setValue(target);
      return;
    }
    Animated.spring(position, {
      ...PAGE_SPRING,
      toValue: target,
      velocity,
      useNativeDriver,
    }).start();
  };

  /** Húzott helyzet; a két szélen túl fékezve. */
  const dragged = (dx: number) => {
    const last = config.routes.length - 1;
    const raw = dragStart - dx / pageWidth();
    if (raw < 0) return raw * EDGE_RESISTANCE;
    if (raw > last) return last + (raw - last) * EDGE_RESISTANCE;
    return raw;
  };

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) =>
      config.enabled &&
      config.width > 0 &&
      Math.abs(gesture.dx) > START_DISTANCE &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderGrant: () => {
      // Ha egy lapozás még fut, onnan folytatjuk, ahol épp tart (nincs ugrás).
      dragStart = config.index;
      position.stopAnimation((value) => {
        dragStart = value;
      });
    },
    onPanResponderMove: (_event, gesture) => position.setValue(dragged(gesture.dx)),
    onPanResponderRelease: (_event, gesture) => {
      const last = config.routes.length - 1;
      const projected = dragged(gesture.dx) - (gesture.vx * PROJECTION_MS) / pageWidth();
      const from = Math.round(dragStart);
      // Egy húzással legfeljebb egy oldalt lépünk.
      const target = Math.min(
        last,
        Math.max(0, from - 1, Math.min(from + 1, Math.round(projected))),
      );
      // A PanResponder px/ms-ben méri a sebességet, a rugó oldal/másodpercben várja.
      moveTo(target, (-gesture.vx * 1000) / pageWidth());
      if (target !== config.index) {
        settlingTo = target;
        config.onNavigate(config.routes[target]);
      }
    },
    // Ha egy gyerek (pl. görgethető lista) mégis átveszi, visszaállunk az aktuális oldalra.
    onPanResponderTerminate: () => moveTo(config.index),
    onPanResponderTerminationRequest: () => true,
  });

  return {
    position,
    panHandlers: responder.panHandlers,
    configure(next: PagerConfig<T>) {
      config = next;
    },
    /** Oldalváltás után: odalapoz, hacsak a húzás már el nem indította oda a lapozást. */
    showPage(index: number) {
      if (settlingTo === index) {
        settlingTo = null;
        return;
      }
      settlingTo = null;
      moveTo(index);
    },
  };
}

/**
 * Telefonos lapozás az oldalak között. Az oldalak egymás mellett állnak, és húzás közben
 * az ujjal együtt mozognak (a szomszédos oldal is becsúszik), elengedéskor pedig a mozdulat
 * lendületét megtartva, rugalmasan beállnak a legközelebbi oldalra. Koppintásos váltáskor
 * ugyanígy lapoz.
 *
 * Csak a gyerekek által „el nem kért” mozdulatokat veszi át: a görgethető listák és a saját
 * húzást kezelő elemek (pl. görgetősáv, csúszka) elsőbbséget élveznek.
 */
export function useTabSwipe<T extends string>({
  routes,
  current,
  enabled,
  width,
  reducedMotion,
  onNavigate,
}: {
  routes: readonly T[];
  current: string;
  /** Húzással lehet-e váltani (az Égbolton nem, ott a húzás az eget forgatja). */
  enabled: boolean;
  width: number;
  reducedMotion: boolean;
  onNavigate: (route: T) => void;
}) {
  const index = Math.max(0, routes.indexOf(current as T));
  const [pager] = useState(() => createTabPager<T>(index));

  useEffect(() => {
    pager.configure({ routes, index, enabled, width, reducedMotion, onNavigate });
  }, [enabled, index, onNavigate, pager, reducedMotion, routes, width]);

  useEffect(() => {
    pager.showPage(index);
  }, [index, pager]);

  return { panHandlers: pager.panHandlers, position: pager.position };
}
