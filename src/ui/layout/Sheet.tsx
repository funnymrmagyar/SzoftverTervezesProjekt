import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';

import { colors, radius, sizing, spacing } from '../theme';
import { useBreakpoint } from '../useBreakpoint';
import { useReducedMotion } from '../useReducedMotion';
import { getSheetSnapHeights, nearestSheetSnap, type SheetSnap } from './geometry';

interface Position {
  x: number;
  y: number;
}

const sheetSessions: Record<string, { position: Position | null; snap: SheetSnap }> = {
  default: { position: null, snap: 'half' },
  'time-travel': { position: null, snap: 'half' },
  'constellation-info': { position: null, snap: 'half' },
};

function saveSessionPosition(session: { position: Position | null }, position: Position) {
  session.position = position;
}

type IconName = ComponentProps<typeof Ionicons>['name'];

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
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { compact } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const mobile = Platform.OS !== 'web' && compact;
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
  const [floatingDrag] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

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
          damping: 28,
          stiffness: 260,
        }).start();
      }
      if (boundedSnap === 'closed') onClose();
    },
    [maxMobileSnap, mobile, onClose, reducedMotion, session, sheetHeight, viewport.height],
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
      animateToSnap(snaps[nextIndex]);
    },
    [activeSnap, animateToSnap, maxMobileSnap, mobile],
  );

  const mobilePan = useMemo(() => {
    const heightForDrag = (deltaY: number) =>
      Math.min(
        viewport.height,
        Math.max(
          48,
          Math.min(
            getSheetSnapHeights(viewport.height)[maxMobileSnap],
            getSheetSnapHeights(viewport.height)[activeSnap] - deltaY,
          ),
        ),
      );
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 3,
      onPanResponderMove: (_event, gesture) => {
        sheetHeight.setValue(heightForDrag(gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        animateToSnap(nearestSheetSnap(heightForDrag(gesture.dy), viewport.height, maxMobileSnap));
      },
      onPanResponderTerminate: (_event, gesture) => {
        animateToSnap(nearestSheetSnap(heightForDrag(gesture.dy), viewport.height, maxMobileSnap));
      },
    });
  }, [activeSnap, animateToSnap, maxMobileSnap, sheetHeight, viewport.height]);

  const floatingPan = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderMove: (_event, gesture) => {
        floatingDrag.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_event, gesture) => {
        const next = boundedPosition(position.x + gesture.dx, position.y + gesture.dy);
        saveSessionPosition(session, next);
        setPosition(next);
        floatingDrag.setValue({ x: 0, y: 0 });
      },
      onPanResponderTerminate: (_event, gesture) => {
        const next = boundedPosition(position.x + gesture.dx, position.y + gesture.dy);
        saveSessionPosition(session, next);
        setPosition(next);
        floatingDrag.setValue({ x: 0, y: 0 });
      },
    });
  }, [boundedPosition, floatingDrag, position, session]);

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
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [activeSnap, visible, onClose]);

  function onPanelLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
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
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={onViewportLayout}>
      {mobile && scrim && activeSnap !== 'closed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bezárás"
          onPress={() => animateToSnap('closed')}
          style={styles.backdrop}
        />
      ) : null}
      <Animated.View
        onLayout={onPanelLayout}
        style={[
          styles.panel,
          mobile
            ? [styles.mobilePanel, { height: sheetHeight }]
            : [
                styles.floatingPanel,
                {
                  width: floatingWidth,
                  maxHeight: Math.max(0, viewport.height - spacing.xxl),
                  left: position.x,
                  top: position.y,
                  transform: floatingDrag.getTranslateTransform(),
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
            <Header
              title={title}
              titleTestID={titleTestID}
              onClose={() => animateToSnap('closed')}
            />
          </View>
        ) : (
          <View
            {...floatingPan.panHandlers}
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
            <Header
              title={title}
              titleTestID={titleTestID}
              onClose={onClose}
              onMove={moveFloatingBy}
            />
          </View>
        )}
        <View style={[styles.body, { padding: bodyPadding }]}>{children}</View>
      </Animated.View>
    </View>
  );
}

function Header({
  title,
  titleTestID,
  onClose,
  onMove,
}: {
  title: string;
  titleTestID?: string;
  onClose: () => void;
  onMove?: (dx: number, dy: number) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1} testID={titleTestID}>
        {title}
      </Text>
      {onMove ? (
        <View style={styles.moveButtons}>
          <MoveButton icon="arrow-back" label="Mozgatás balra" onPress={() => onMove(-24, 0)} />
          <MoveButton icon="arrow-forward" label="Mozgatás jobbra" onPress={() => onMove(24, 0)} />
          <MoveButton icon="arrow-up" label="Mozgatás fel" onPress={() => onMove(0, -24)} />
          <MoveButton icon="arrow-down" label="Mozgatás le" onPress={() => onMove(0, 24)} />
        </View>
      ) : null}
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

function MoveButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.moveButton}
    >
      <Ionicons name={icon} size={sizing.iconSmall} color={colors.textMuted} />
    </Pressable>
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
  moveButtons: { flexDirection: 'row', alignItems: 'center' },
  moveButton: {
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: sizing.touch,
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minHeight: 0, padding: spacing.lg },
});
