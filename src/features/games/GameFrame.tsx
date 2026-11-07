import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { IconButton } from '@/ui/components';
import { Screen } from '@/ui/layout/Screen';
import { ThreeZoneBar } from '@/ui/layout/ThreeZoneBar';
import { colors, font, sizing, spacing } from '@/ui/theme';

export function GameFrame({
  title,
  onBack,
  headerRight,
  children,
  footer,
  overlay,
  testID,
}: {
  title: string;
  onBack: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  overlay?: ReactNode;
  testID?: string;
}) {
  return (
    <Screen
      maxWidth={sizing.contentWide}
      scroll={false}
      contentStyle={styles.screenContent}
      testID={testID}
    >
      <View style={styles.frame}>
        <ThreeZoneBar
          sideSize={sizing.touch * 2 + spacing.sm}
          style={styles.header}
          left={<IconButton icon="arrow-back" label="Vissza" onPress={onBack} testID="game-back" />}
          center={
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          }
          right={<View style={styles.headerRight}>{headerRight}</View>}
        />
        <View style={styles.space} testID="game-space">
          {children}
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
      </View>
    </Screen>
  );
}

export function GameChartStage({ children, testID }: { children: ReactNode; testID?: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const width = Math.min(size.width, size.height * (4 / 3));
  const height = width * (3 / 4);

  function onLayout(event: LayoutChangeEvent) {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === nextWidth && current.height === nextHeight
        ? current
        : { width: nextWidth, height: nextHeight },
    );
  }

  return (
    <View onLayout={onLayout} style={styles.chartStage} testID={testID}>
      {width > 0 && height > 0 ? <View style={{ width, height }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  frame: { flex: 1, minHeight: 0, gap: spacing.sm },
  header: { flexShrink: 0, minHeight: sizing.touch },
  title: { ...font.heading, color: colors.text, textAlign: 'center' },
  headerRight: {
    minWidth: sizing.touch * 2 + spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
  },
  space: { flex: 1, minHeight: 0, gap: spacing.sm },
  footer: { flexShrink: 0, gap: spacing.sm },
  overlay: { position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 10 },
  chartStage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
});
