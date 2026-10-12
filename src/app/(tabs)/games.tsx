import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/ui/theme';

const PLANNED = [
  {
    title: 'Csillagkép-felismerő',
    text: 'Válassz kultúrát, és találd meg az égen a kérdezett csillagképet.',
  },
  { title: 'Csillagról csillagra', text: 'Egy csillagkép csillagait kell egyenként megtalálni.' },
  { title: 'Ranglista', text: 'Online toplista kultúránként és játékmódonként.' },
];

/** Helyőrző: a Seterra-típusú játékok a következő hetekben készülnek. */
export default function GamesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Játékok</Text>
      <Text style={styles.subtitle}>Hamarosan — ezek készülnek:</Text>
      {PLANNED.map((g) => (
        <View key={g.title} style={styles.card}>
          <Text style={styles.cardTitle}>{g.title}</Text>
          <Text style={styles.cardText}>{g.text}</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.md },
  title: { ...font.title, color: colors.text },
  subtitle: { color: colors.textMuted, marginBottom: spacing.sm },
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cardText: { color: colors.textMuted },
});
