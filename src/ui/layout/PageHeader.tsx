import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '../theme';

/**
 * Az oldalak egységes fejléce: cím, alatta egy rövid leírás, jobbra opcionális elem.
 * Minden fő oldal (Játékok, Ranglista, Profil) ezt használja, hogy a címek ugyanott és
 * ugyanakkorák legyenek.
 */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...font.title, color: colors.text },
  subtitle: { ...font.small, color: colors.textMuted },
});
