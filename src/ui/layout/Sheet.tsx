import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { suppressTextSelectionUntilRelease } from '../textSelection';
import { colors, radius, sizing, spacing } from '../theme';
import { useBreakpoint } from '../useBreakpoint';
import { useReducedMotion } from '../useReducedMotion';
import { getSheetSnapHeights, type SheetSnap } from './geometry';

interface Position {
  x: number;
  y: number;
}

/** Az asztali (lebegő) ablak húzása: honnan indult a mutató, és hol állt akkor az ablak. */
interface FloatingDrag {
  pageX: number;
  pageY: number;
  origin: Position;
}

/** Ennyi elmozdulás után számít húzásnak a lenyomás (addig a fejléc gombjai kattinthatók). */
const DRAG_THRESHOLD = 3;
/** Telefonon ennyi lefelé húzás után kezd el mozogni a lap (a véletlen remegést figyelmen kívül hagyjuk). */
const DISMISS_DRAG_START = 8;
/** Ha a lapot a magassága ennyi részénél lejjebb húzzák, elengedéskor bezárul. */
const DISMISS_DISTANCE = 0.25;
/** Ennél gyorsabb lefelé pöccintés (px/ms) a távolságtól függetlenül bezárja a lapot. */
const DISMISS_VELOCITY = 0.5;

const sheetSessions: Record<string, { position: Position | null; snap: SheetSnap }> = {
  default: { position: null, snap: 'half' },
  'time-travel': { position: null, snap: 'half' },
  'constellation-info': { position: null, snap: 'half' },
};

function saveSessionPosition(session: { position: Position | null }, position: Position) {
  session.position = position;
}

export function Sheet({
  title,
  titleTestID,
  children,
  visible = true,
  onClose,
  scrim = true,
  maxMobileSnap = 'full',
  bodyPadding = spacing.lg,
  sessionKey = 'default',
  fitContent = false,
}: {
  title: string;
  titleTestID?: string;
  children: ReactNode;
  visible?: boolean;
  onClose: () => void;
  scrim?: boolean;
  maxMobileSnap?: SheetSnap;
  bodyPadding?: number;
  sessionKey?: string;
  /**
   * Telefonon a lap pontosan akkora, amekkora a tartalma (nem fél/teljes képernyő).
   * Kis, tömör vezérlőpultokhoz (pl. időutazás), hogy ne takarja feleslegesen az eget.
   */
  fitContent?: boolean;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { compact } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const mobile = Platform.OS !== 'web' && compact;
  // Telefonon a lap az alsó menüsáv fölött ér véget, különben a sáv eltakarná az alját.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const bottomClearance = mobile ? tabBarHeight : 0;
  const session = sheetSessions[sessionKey] ?? sheetSessions.default;
  const [viewport, setViewport] = useState({ width: windowWidth, height: windowHeight });
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState<Position>(() => {
    const panelWidth = Math.min(420, windowWidth - spacing.xxl);
    return (
      session.position ?? {
        x: Math.max(0, (windowWidth - panelWidth) / 2),
        y: Math.max(0, (windowHeight - 480) / 2),
      }
    );
  });
  const pressStart = useRef<{ pageX: number; pageY: number } | null>(null);
  const floatingDrag = useRef<FloatingDrag | null>(null);

  const initialSnap =
    mobile && maxMobileSnap === 'half' && session.snap === 'full'
      ? 'half'
      : session.snap === 'closed'
        ? 'half'
        : session.snap;
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);
  const activeSnap = snap;
  const [sheetHeight] = useState(
    () => new Animated.Value(getSheetSnapHeights(windowHeight)[activeSnap]),
  );
  /** Telefonon a lap függőleges eltolása: lefelé húzáskor követi az ujjat, nyitáskor alulról csúszik be. */
  const [dismissY] = useState(() => new Animated.Value(0));

  const boundedPosition = useCallback(
    (x: number, y: number, bounds = viewport, size = panelSize): Position => {
      const visible = 48;
      const minX = size.width <= bounds.width ? 0 : visible - size.width;
      const maxX = size.width <= bounds.width ? bounds.width - size.width : bounds.width - visible;
      const minY = size.height <= bounds.height ? 0 : visible - size.height;
      const maxY =
        size.height <= bounds.height ? bounds.height - size.height : bounds.height - visible;
      return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    },
    [panelSize, viewport],
  );

  const commitPosition = useCallback(
    (x: number, y: number) => {
      const next = boundedPosition(x, y);
      saveSessionPosition(session, next);
      setPosition(next);
    },
    [boundedPosition, session],
  );

  const animateToSnap = useCallback(
    (nextSnap: SheetSnap) => {
      const snapOrder: SheetSnap[] = ['closed', 'half', 'full'];
      const boundedSnap =
        mobile && snapOrder.indexOf(nextSnap) > snapOrder.indexOf(maxMobileSnap)
          ? maxMobileSnap
          : nextSnap;
      if (boundedSnap !== 'closed') session.snap = boundedSnap;
      setSnap(boundedSnap);
      const target = getSheetSnapHeights(viewport.height)[boundedSnap];
      if (reducedMotion) {
        sheetHeight.setValue(target);
      } else {
        Animated.spring(sheetHeight, {
          toValue: target,
          useNativeDriver: false,
          damping: 24,
          stiffness: 200,
          mass: 0.9,
        }).start();
      }
      if (boundedSnap === 'closed') onClose();
    },
    [maxMobileSnap, mobile, onClose, reducedMotion, session, sheetHeight, viewport.height],
  );

  /**
   * Telefonon a lap bezárása: lecsúszik a képernyő aljára (a menüsáv mögé), és csak utána
   * tűnik el. Böngészőben / nagy kijelzőn azonnal bezár.
   */
  const dismiss = useCallback(
    (velocity = 0) => {
      if (!mobile || reducedMotion) {
        onClose();
        return;
      }
      const height =
        fitContent && panelSize.height > 0
          ? panelSize.height
          : getSheetSnapHeights(viewport.height)[activeSnap];
      Animated.timing(dismissY, {
        toValue: height + spacing.xl,
        // Gyors pöccintésnél rövidebb, hogy a lap ne lassuljon le a mozdulathoz képest.
        duration: velocity > 1 ? 160 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) onClose();
      });
    },
    [
      activeSnap,
      dismissY,
      fitContent,
      mobile,
      onClose,
      panelSize.height,
      reducedMotion,
      viewport.height,
    ],
  );

  const adjustSnap = useCallback(
    (direction: -1 | 1) => {
      const snaps: SheetSnap[] = mobile
        ? (['closed', 'half', 'full'] as const).slice(
            0,
            ['closed', 'half', 'full'].indexOf(maxMobileSnap) + 1,
          )
        : ['closed', 'half', 'full'];
      const currentIndex = snaps.indexOf(activeSnap);
      const nextIndex = Math.max(0, Math.min(snaps.length - 1, currentIndex + direction));
      if (snaps[nextIndex] === 'closed') dismiss();
      else animateToSnap(snaps[nextIndex]);
    },
    [activeSnap, animateToSnap, dismiss, maxMobileSnap, mobile],
  );

  /*
   * Telefonon a lap a helyén marad: csak lefelé lehet húzni, és ha elég messzire vagy elég
   * gyorsan húzták, bezárul; különben visszaugrik. Felfelé és oldalra húzásra nem reagál.
   */
  const mobilePan = useMemo(() => {
    const springBack = () =>
      Animated.spring(dismissY, {
        toValue: 0,
        damping: 26,
        stiffness: 300,
        mass: 0.8,
        useNativeDriver: false,
      }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > DISMISS_DRAG_START && gesture.dy > Math.abs(gesture.dx) * 1.2,
      onPanResponderGrant: () => dismissY.stopAnimation(),
      onPanResponderMove: (_event, gesture) => {
        dismissY.setValue(Math.max(0, gesture.dy - DISMISS_DRAG_START));
      },
      onPanResponderRelease: (_event, gesture) => {
        const height =
          fitContent && panelSize.height > 0
            ? panelSize.height
            : getSheetSnapHeights(viewport.height)[activeSnap];
        if (gesture.dy > height * DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          dismiss(gesture.vy);
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
      onPanResponderTerminationRequest: () => false,
    });
  }, [activeSnap, dismiss, dismissY, fitContent, panelSize.height, viewport.height]);

  // Telefonon megnyitáskor a lap alulról csúszik be.
  useEffect(() => {
    if (!visible || !mobile) return;
    if (reducedMotion) {
      dismissY.setValue(0);
      return;
    }
    dismissY.setValue(windowHeight);
    Animated.spring(dismissY, {
      toValue: 0,
      damping: 28,
      stiffness: 260,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [dismissY, mobile, reducedMotion, visible, windowHeight]);

  useEffect(() => {
    if (!mobile || viewport.height <= 0) return;
    sheetHeight.setValue(getSheetSnapHeights(viewport.height)[activeSnap]);
  }, [activeSnap, mobile, viewport.height, sheetHeight]);

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeSnap === 'closed') return false;
      dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [activeSnap, dismiss, visible, onClose]);

  function onPanelLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width === panelSize.width && height === panelSize.height) return;
    const nextSize = { width, height };
    setPanelSize(nextSize);
    if (!mobile) {
      setPosition((current) => boundedPosition(current.x, current.y, viewport, nextSize));
    }
  }

  function onViewportLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    const nextViewport = { width, height };
    setViewport(nextViewport);
    if (!mobile) {
      setPosition((current) => boundedPosition(current.x, current.y, nextViewport));
    }
  }

  /*
   * A lebegő ablak húzása a fejlécnél. Közvetlenül a mutató helyéből számolunk (1:1 követés),
   * és a lenyomástól az elengedésig tiltjuk a szövegkijelölést: a böngésző kijelölése
   * korábban megszakította a húzást, ezért „akadt el” az ablak.
   */
  function rememberPressStart(event: GestureResponderEvent) {
    pressStart.current = { pageX: event.nativeEvent.pageX, pageY: event.nativeEvent.pageY };
    suppressTextSelectionUntilRelease();
    return false;
  }

  function shouldStartFloatingDrag(event: GestureResponderEvent) {
    const start = pressStart.current;
    if (!start) return false;
    return (
      Math.abs(event.nativeEvent.pageX - start.pageX) > DRAG_THRESHOLD ||
      Math.abs(event.nativeEvent.pageY - start.pageY) > DRAG_THRESHOLD
    );
  }

  function draggedPosition(drag: FloatingDrag, event: GestureResponderEvent) {
    return boundedPosition(
      drag.origin.x + event.nativeEvent.pageX - drag.pageX,
      drag.origin.y + event.nativeEvent.pageY - drag.pageY,
    );
  }

  function startFloatingDrag(event: GestureResponderEvent) {
    const start = pressStart.current ?? {
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    };
    floatingDrag.current = { ...start, origin: position };
  }

  function moveFloatingDrag(event: GestureResponderEvent) {
    const drag = floatingDrag.current;
    if (drag) setPosition(draggedPosition(drag, event));
  }

  function endFloatingDrag(event: GestureResponderEvent) {
    const drag = floatingDrag.current;
    floatingDrag.current = null;
    pressStart.current = null;
    if (!drag) return;
    const next = draggedPosition(drag, event);
    saveSessionPosition(session, next);
    setPosition(next);
  }

  function moveFloatingBy(dx: number, dy: number) {
    commitPosition(position.x + dx, position.y + dy);
  }

  function onRepositionAccessibilityAction(actionName: string) {
    const step = spacing.xl;
    if (actionName === 'left') moveFloatingBy(-step, 0);
    if (actionName === 'right') moveFloatingBy(step, 0);
    if (actionName === 'up') moveFloatingBy(0, -step);
    if (actionName === 'down') moveFloatingBy(0, step);
  }

  if (!visible) return null;

  const floatingWidth = Math.max(0, Math.min(420, viewport.width - spacing.xxl));
  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { bottom: bottomClearance }]}
      onLayout={onViewportLayout}
    >
      {mobile && scrim && activeSnap !== 'closed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bezárás"
          onPress={() => dismiss()}
          style={styles.backdrop}
        />
      ) : null}
      <Animated.View
        onLayout={onPanelLayout}
        style={[
          styles.panel,
          mobile
            ? [
                styles.mobilePanel,
                fitContent
                  ? { maxHeight: viewport.height, transform: [{ translateY: dismissY }] }
                  : { height: sheetHeight, transform: [{ translateY: dismissY }] },
              ]
            : [
                styles.floatingPanel,
                {
                  width: floatingWidth,
                  maxHeight: Math.max(0, viewport.height - spacing.xxl),
                  left: position.x,
                  top: position.y,
                },
              ],
        ]}
      >
        {mobile ? (
          <View
            {...mobilePan.panHandlers}
            style={styles.mobileHeader}
            accessible
            accessibilityRole="adjustable"
            accessibilityActions={[
              { name: 'increment', label: 'Kinyitás' },
              { name: 'decrement', label: 'Lehúzás' },
            ]}
            onAccessibilityAction={(event) =>
              adjustSnap(event.nativeEvent.actionName === 'increment' ? 1 : -1)
            }
          >
            <View style={styles.handle} />
            <Header title={title} titleTestID={titleTestID} onClose={() => dismiss()} />
          </View>
        ) : (
          <View
            onStartShouldSetResponderCapture={rememberPressStart}
            onMoveShouldSetResponder={shouldStartFloatingDrag}
            onResponderGrant={startFloatingDrag}
            onResponderMove={moveFloatingDrag}
            onResponderRelease={endFloatingDrag}
            onResponderTerminate={endFloatingDrag}
            onResponderTerminationRequest={() => false}
            style={styles.floatingHeader}
            accessible
            accessibilityRole="adjustable"
            accessibilityActions={[
              { name: 'left', label: 'Mozgatás balra' },
              { name: 'right', label: 'Mozgatás jobbra' },
              { name: 'up', label: 'Mozgatás fel' },
              { name: 'down', label: 'Mozgatás le' },
            ]}
            onAccessibilityAction={(event) =>
              onRepositionAccessibilityAction(event.nativeEvent.actionName)
            }
          >
            <Header title={title} titleTestID={titleTestID} onClose={onClose} />
          </View>
        )}
        <View
          style={[styles.body, mobile && fitContent && styles.bodyFit, { padding: bodyPadding }]}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function Header({
  title,
  titleTestID,
  onClose,
}: {
  title: string;
  titleTestID?: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1} testID={titleTestID}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bezárás"
        onPress={onClose}
        hitSlop={spacing.xs}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={sizing.icon} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdrop },
  panel: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.glassStrong,
  },
  mobilePanel: {
    right: 0,
    bottom: 0,
    left: 0,
    // Telefonon a lap teljesen fedő: az alatta lévő vezérlősáv ne derengjen át rajta.
    backgroundColor: colors.surface,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  floatingPanel: { borderRadius: radius.md },
  mobileHeader: { paddingTop: spacing.sm },
  handle: {
    width: spacing.xxxl,
    height: spacing.xs,
    alignSelf: 'center',
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
  },
  floatingHeader: {},
  header: {
    minHeight: sizing.touch + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  closeButton: {
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minHeight: 0, padding: spacing.lg },
  // Tartalomhoz igazodó lapnál a törzs nem nyúlik, csak akkora, amekkora kell.
  bodyFit: { flex: 0, flexShrink: 1 },
});
