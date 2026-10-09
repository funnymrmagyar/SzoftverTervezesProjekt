import { StyleSheet, Text, View } from 'react-native';

/** Ideiglenes kezdőképernyő: a #7 issue cseréli le a valódi belépési ponttal. */
export default function Index() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Csillagnéző</Text>
      <Text style={styles.text}>A projektváz működik. Hamarosan: bejelentkezés és égbolt.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1026',
    padding: 24,
  },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  text: { color: '#a8b3d6', fontSize: 16, textAlign: 'center' },
});
