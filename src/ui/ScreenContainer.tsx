import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

import { Screen } from './layout/Screen';

export function ScreenContainer({
  children,
  maxWidth,
  contentStyle,
  scrollable = true,
  testID,
}: {
  children: ReactNode;
  maxWidth?: number;
  contentStyle?: ViewStyle;
  scrollable?: boolean;
  testID?: string;
}) {
  return (
    <Screen maxWidth={maxWidth} contentStyle={contentStyle} scroll={scrollable} testID={testID}>
      {children}
    </Screen>
  );
}
