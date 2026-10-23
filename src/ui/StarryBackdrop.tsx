import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

/** Determinisztikus álvéletlen generátor, hogy a háttér minden rendernél ugyanaz legyen. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dekoratív, statikus csillagos háttér a nyitó- és bejelentkező képernyőkhöz. */
export function StarryBackdrop({ count = 90 }: { count?: number }) {
  const stars = useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: count }, () => {
      const size = rand() < 0.08 ? 3 : rand() < 0.3 ? 2 : 1;
      return {
        left: `${rand() * 100}%` as const,
        top: `${rand() * 100}%` as const,
        size,
        opacity: 0.25 + rand() * 0.6,
      };
    });
  }, [count]);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: '#ffffff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}
