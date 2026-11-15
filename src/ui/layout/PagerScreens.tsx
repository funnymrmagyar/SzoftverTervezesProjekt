import { forwardRef, type ReactNode } from 'react';
import { Animated, Platform, type ViewInstance, type ViewProps } from 'react-native';
import { InnerScreen, ScreenContext } from 'react-native-screens';

type ScreenComponentProps = React.ComponentProps<typeof InnerScreen>;

/**
 * A telefonos lapozóhoz: a tab-navigátor a nem aktív oldalakat alapból elrejti (display: none),
 * így húzáskor nem látszana a szomszédos oldal. Itt a „lecsatolás nélküli” képernyőket
 * (enabled = false) rejtés nélkül rajzoljuk ki; a lapozó úgyis a képernyőn kívülre tolja őket.
 * A react-native-screens erre a célra adja a ScreenContext-et (saját Screen-megvalósítás).
 */
const AlwaysVisibleScreen = forwardRef<
  React.ComponentRef<typeof InnerScreen>,
  ScreenComponentProps
>(function AlwaysVisibleScreen(props, ref) {
  if (props.enabled !== false) return <InnerScreen ref={ref} {...props} />;
  // A rejtéshez használt mezőket elhagyjuk, a többit (stílus, gyerekek) változatlanul továbbadjuk.
  const { active, activityState, enabled, freezeOnBlur, ...rest } = props;
  return <Animated.View ref={ref as React.Ref<ViewInstance>} {...(rest as ViewProps)} />;
});

/** Telefonon (natívan) a lapozó alatti képernyők mindig láthatók maradnak; böngészőben ez eleve így van. */
export function PagerScreens({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled || Platform.OS === 'web') return children;
  return <ScreenContext.Provider value={AlwaysVisibleScreen}>{children}</ScreenContext.Provider>;
}
