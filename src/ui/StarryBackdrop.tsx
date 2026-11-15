import { Image, StyleSheet, View } from 'react-native';

// Előre elkészített, szándékosan halvány és kissé elmosott csillagkép (2048×2048, ~100 KB).
const STARFIELD = require('@/assets/images/starfield.jpg');

/**
 * Dekoratív csillagos égbolt az oldalak hátterében (az Égbolt fül kivételével, ott az
 * igazi égbolt látszik). Visszafogott, hogy ne vonja el a figyelmet; érintést nem fogad.
 */
export function StarryBackdrop() {
  return (
    <View style={styles.fill} accessible={false} importantForAccessibility="no-hide-descendants">
      <Image source={STARFIELD} resizeMode="cover" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  image: { width: '100%', height: '100%' },
});
