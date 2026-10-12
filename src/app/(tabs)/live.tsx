import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/ui/theme';

/** Ideiglenes Égbolt-képernyő: a #10 issue cseréli le a valódi 3D nézetre. */
export default function Live() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Égbolt</Text>
      <Text style={styles.text}>Ide kerül a 3D égbolt.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: 24,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  text: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
