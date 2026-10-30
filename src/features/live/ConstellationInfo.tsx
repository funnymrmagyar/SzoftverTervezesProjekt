import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSkyCultures } from '@/core/catalog';
import { useSkyStore } from '@/state/useSkyStore';
import { IconButton } from '@/ui/components';
import { GlassSurface } from '@/ui/GlassSurface';
import { colors, font, spacing, sizing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

import { parseDescription } from './richText';

const LANGUAGE_NAMES: Record<string, string> = { en: 'angol' };

/** A panel szélessége széles képernyőn. */
const PANEL_WIDTH = 380;

/**
 * A kiválasztott csillagkép adatlapja, mint a Stellariumban: kultúra, név, eredeti név és
 * leírás. Széles képernyőn bal oldalt, a kultúraválasztó alatt; telefonon alul, az idősáv
 * fölött. Az X gombbal, üres égre koppintva vagy kultúraváltáskor bezárul.
 */
export function ConstellationInfo() {
  const cultureId = useSkyStore((s) => s.cultureId);
  const selectedId = useSkyStore((s) => s.selectedConstellationId);
  const select = useSkyStore((s) => s.selectConstellation);
  const layout = useBreakpoint();

  const repo = getSkyCultures();
  const culture = repo.get(cultureId);
  const constellation = selectedId ? repo.getConstellation(cultureId, selectedId) : undefined;
  if (!culture || !constellation) return null;

  const paragraphs = constellation.description ? parseDescription(constellation.description) : [];
  const lang = constellation.descriptionLang;
  const starCount = new Set(constellation.lines.flat()).size;
  const maxHeight = layout.height * (layout.compact ? 0.38 : 0.6);

  return (
    <GlassSurface
      style={[styles.panel, layout.compact ? styles.compact : styles.wide, { maxHeight }]}
      testID="constellation-info"
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.kicker} numberOfLines={1}>
            {culture.name}
          </Text>
          <Text style={styles.title} accessibilityRole="header" testID="constellation-info-name">
            {constellation.name}
          </Text>
          {constellation.nativeName && constellation.nativeName !== constellation.name ? (
            <Text style={styles.native}>{constellation.nativeName}</Text>
          ) : null}
        </View>
        <IconButton
          icon="close"
          label="Bezárás"
          onPress={() => select(null)}
          testID="constellation-info-close"
        />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {paragraphs.length > 0 ? (
          paragraphs.map((spans, i) => (
            <Text key={i} style={styles.paragraph}>
              {spans.map((span, j) => (
                <Text key={j} style={[span.bold && styles.bold, span.italic && styles.italic]}>
                  {span.text}
                </Text>
              ))}
            </Text>
          ))
        ) : (
          <Text style={styles.paragraph}>Ehhez a csillagképhez még nincs leírás.</Text>
        )}
        <Text style={styles.meta}>
          {starCount} csillag
          {lang && lang !== 'hu' ? ` · eredeti, ${LANGUAGE_NAMES[lang] ?? lang} nyelvű leírás` : ''}
        </Text>
      </ScrollView>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.lg, gap: spacing.sm },
  wide: { width: PANEL_WIDTH, marginTop: spacing.md },
  compact: { width: '100%', maxWidth: sizing.contentCompact, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titles: { flex: 1, gap: 2 },
  kicker: {
    ...font.caption,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { ...font.heading, color: colors.text },
  native: { ...font.small, color: colors.textMuted, fontStyle: 'italic' },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  paragraph: { ...font.small, color: colors.textMuted, lineHeight: 21 },
  bold: { fontWeight: '700', color: colors.text },
  italic: { fontStyle: 'italic' },
  meta: { ...font.caption, color: colors.textSubtle, marginTop: spacing.xs },
});
