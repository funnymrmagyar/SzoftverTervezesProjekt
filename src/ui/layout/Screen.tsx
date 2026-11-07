import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, sizing, spacing } from '../theme';
import { useBreakpoint } from '../useBreakpoint';

export function Screen({
  children,
  maxWidth,
  scroll = false,
  contentStyle,
  testID,
}: {
  children: ReactNode;
  maxWidth?: number;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  testID?: string;
}) {
  const layout = useBreakpoint();
  const content = (
    <View
      testID={testID}
      style={[
        styles.content,
        {
          paddingHorizontal: layout.pagePadding,
          paddingBottom: layout.bottomClearance + spacing.lg,
        },
        layout.expanded && styles.contentExpanded,
        contentStyle,
      ]}
    >
      <View style={[styles.column, { maxWidth: maxWidth ?? layout.contentMaxWidth }]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  contentExpanded: { paddingLeft: spacing.xxl + sizing.navWidth },
  column: { width: '100%', flexGrow: 1 },
});
