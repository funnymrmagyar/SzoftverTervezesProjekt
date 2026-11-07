import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { getSkyCultures } from '@/core/catalog';
import { useSkyStore } from '@/state/useSkyStore';
import { Sheet } from '@/ui/layout/Sheet';
import { StyledScrollbar } from '@/ui/layout/StyledScrollbar';
import { colors, font, spacing } from '@/ui/theme';

import { parseDescription } from './richText';

const LANGUAGE_NAMES: Record<string, string> = { en: 'angol' };

export function ConstellationInfo() {
  const cultureId = useSkyStore((state) => state.cultureId);
  const selectedId = useSkyStore((state) => state.selectedConstellationId);
  const select = useSkyStore((state) => state.selectConstellation);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const repo = getSkyCultures();
  const culture = repo.get(cultureId);
  const constellation = selectedId ? repo.getConstellation(cultureId, selectedId) : undefined;
  if (!culture || !constellation) return null;

  const paragraphs = constellation.description ? parseDescription(constellation.description) : [];
  const lang = constellation.descriptionLang;
  const starCount = new Set(constellation.lines.flat()).size;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  }

  return (
    <Sheet
      title={constellation.name}
      titleTestID="constellation-info-name"
      visible
      onClose={() => select(null)}
      scrim={false}
      sessionKey="constellation-info"
    >
      <View style={styles.content} testID="constellation-info">
        <Text style={styles.kicker} numberOfLines={1}>
          {culture.name}
        </Text>
        {constellation.nativeName && constellation.nativeName !== constellation.name ? (
          <Text style={styles.native}>{constellation.nativeName}</Text>
        ) : null}
        <View style={styles.scrollRegion}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            onContentSizeChange={(_width, height) => setContentHeight(height)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            testID="constellation-info-scroll"
          >
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
              {lang && lang !== 'hu'
                ? ` · eredeti, ${LANGUAGE_NAMES[lang] ?? lang} nyelvű leírás`
                : ''}
            </Text>
          </ScrollView>
          {contentHeight > viewportHeight ? (
            <StyledScrollbar
              orientation="vertical"
              contentSize={contentHeight}
              viewportSize={viewportHeight}
              offset={scrollOffset}
              accessibilityLabel="Csillagkép leírásának görgetősávja"
              onScrollTo={(offset) => {
                const next = Math.max(0, Math.min(contentHeight - viewportHeight, offset));
                scrollRef.current?.scrollTo({ y: next, animated: false });
                setScrollOffset(next);
              }}
            />
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0, gap: spacing.sm },
  kicker: { ...font.caption, color: colors.textSubtle, textTransform: 'uppercase' },
  native: { ...font.small, color: colors.textMuted, fontStyle: 'italic' },
  scrollRegion: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'stretch' },
  scroll: { flex: 1, minWidth: 0 },
  scrollContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  paragraph: { ...font.small, color: colors.textMuted, lineHeight: 21 },
  bold: { fontWeight: '700', color: colors.text },
  italic: { fontStyle: 'italic' },
  meta: { ...font.caption, color: colors.textSubtle, marginTop: spacing.xs },
});
