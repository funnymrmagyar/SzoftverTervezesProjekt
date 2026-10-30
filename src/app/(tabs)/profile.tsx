import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type PointerEvent,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/state/useAuthStore';
import { authMode } from '@/services/firebase/config';
import { Button } from '@/ui/Button';
import { GlassSurface } from '@/ui/GlassSurface';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { Avatar, SettingsRow, TrophyBadge } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { useBreakpoint } from '@/ui/useBreakpoint';

const TROPHIES = [
  {
    icon: 'star-outline',
    title: 'Első fény',
    description: 'Nézd meg első alkalommal az égboltot.',
    difficulty: 'Kezdő',
    color: colors.success,
  },
  {
    icon: 'telescope-outline',
    title: 'Felfedező',
    description: 'Fedezz fel öt különböző csillagképet.',
    difficulty: 'Kezdő',
    color: colors.success,
  },
  {
    icon: 'moon-outline',
    title: 'Holdjáró',
    description: 'Látogasd meg az égboltot három különböző éjszakán.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    icon: 'compass-outline',
    title: 'Iránytű',
    description: 'Fedezd fel az égbolt mind a négy égtáját.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    icon: 'flame-outline',
    title: 'Sorozat',
    description: 'Térj vissza hét egymást követő napon.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    icon: 'ribbon-outline',
    title: 'Csillagnéző',
    description: 'Teljesíts tíz csillagászati kihívást.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    icon: 'planet-outline',
    title: 'Világjáró',
    description: 'Próbálj ki öt különböző égikultúrát.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    icon: 'eye-outline',
    title: 'Éjjeli bagoly',
    description: 'Fedezd fel az eget éjfél után.',
    difficulty: 'Kezdő',
    color: colors.success,
  },
  {
    icon: 'sparkles-outline',
    title: 'Tejút',
    description: 'Ismerj fel húsz csillagképet.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    icon: 'calendar-outline',
    title: 'Állandó vendég',
    description: 'Gyűjts össze harminc megfigyelési alkalmat.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    icon: 'planet-outline',
    title: 'Kultúrák őre',
    description: 'Ismerj meg minden elérhető égikultúrát.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    icon: 'trophy-outline',
    title: 'Mestermegfigyelő',
    description: 'Érj el kiemelkedő eredményt egy játékban.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
] as const;

const AUTH_LABELS = {
  local: 'Helyi mód',
  emulator: 'Emulátor',
  firebase: 'Firebase',
} as const;

function TrophyCarousel() {
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const sliderRef = useRef<ViewInstance>(null);
  const sliderLeft = useRef<number | null>(null);
  const { width } = useWindowDimensions();
  const layout = useBreakpoint();
  const insets = useSafeAreaInsets();
  const contentWidth =
    TROPHIES.length * (sizing.gameIcon + spacing.xxxl + spacing.sm) - spacing.sm + spacing.md;
  const viewportWidth = Math.max(
    0,
    Math.min(
      layout.contentMaxWidth,
      width -
        insets.left -
        insets.right -
        layout.pagePadding * 2 -
        (layout.expanded ? sizing.navWidth + spacing.xxl - layout.pagePadding : 0),
    ),
  );
  const trackWidth = viewportWidth;
  const maxOffset = Math.max(0, contentWidth - viewportWidth);
  const scrollProgress = maxOffset ? Math.min(1, scrollOffset / maxOffset) : 0;
  const thumbWidth =
    contentWidth && trackWidth
      ? Math.min(trackWidth, Math.max(sizing.touch, (viewportWidth / contentWidth) * trackWidth))
      : sizing.touch;
  const thumbRange = Math.max(0, trackWidth - thumbWidth);

  function setProgressFromTrack(locationX: number) {
    if (!maxOffset || !thumbRange) return;
    const progress = Math.max(0, Math.min(1, (locationX - thumbWidth / 2) / thumbRange));
    scrollRef.current?.scrollTo({ x: progress * maxOffset, animated: false });
    setScrollOffset(progress * maxOffset);
  }

  function onPointerDown(event: PointerEvent) {
    const clientX = event.nativeEvent.clientX;
    sliderRef.current?.measureInWindow((left) => {
      sliderLeft.current = left;
      setProgressFromTrack(clientX - left);
    });
  }

  function onPointerMove(event: PointerEvent) {
    if (event.nativeEvent.buttons > 0 && sliderLeft.current !== null) {
      setProgressFromTrack(event.nativeEvent.clientX - sliderLeft.current);
    }
  }

  function onPointerUp() {
    sliderLeft.current = null;
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  }

  function onAccessibilityAction(actionName: string) {
    const change = maxOffset / 10;
    const nextOffset =
      actionName === 'increment'
        ? Math.min(maxOffset, scrollOffset + change)
        : Math.max(0, scrollOffset - change);
    scrollRef.current?.scrollTo({ x: nextOffset, animated: true });
    setScrollOffset(nextOffset);
  }

  return (
    <View style={styles.trophyCarousel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trophyList}
        accessibilityLabel="Trófeák, oldalra görgethető lista"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {TROPHIES.map((trophy) => (
          <TrophyBadge
            key={trophy.title}
            icon={trophy.icon}
            title={trophy.title}
            description={trophy.description}
            difficulty={trophy.difficulty}
            difficultyColor={trophy.color}
            locked
          />
        ))}
      </ScrollView>
      {maxOffset > 0 ? (
        <Pressable
          ref={sliderRef}
          accessibilityRole="adjustable"
          accessibilityLabel="Trófeák görgetősávja"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(scrollProgress * 100),
          }}
          accessibilityActions={[
            { name: 'increment', label: 'További trófeák' },
            { name: 'decrement', label: 'Előző trófeák' },
          ]}
          onAccessibilityAction={(event) => onAccessibilityAction(event.nativeEvent.actionName)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPress={(event: GestureResponderEvent) =>
            setProgressFromTrack(event.nativeEvent.locationX)
          }
          style={styles.sliderTrack}
        >
          <View style={[styles.sliderRail, { pointerEvents: 'none' }]} />
          <View
            style={[
              styles.sliderThumb,
              { width: thumbWidth, left: scrollProgress * thumbRange, pointerEvents: 'none' },
            ]}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const initials = user?.email?.slice(0, 1) ?? '?';

  return (
    <ScreenContainer maxWidth={sizing.contentWide}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('nav.profile')}</Text>

        <GlassSurface style={styles.profileCard}>
          <Avatar initials={initials} highlighted size={sizing.avatarLarge} />
          <View style={styles.accountCopy}>
            <Text style={styles.accountLabel}>{t('profile.account')}</Text>
            <Text
              style={styles.email}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID="profile-email"
            >
              {user?.email ?? t('profile.connected')}
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('profile.connected')}
            style={styles.statusDot}
          />
        </GlassSurface>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beállítások</Text>
          <GlassSurface style={styles.settingsGroup}>
            <SettingsRow icon="language-outline" title="Nyelv" value="Magyar" />
          </GlassSurface>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{t('profile.trophies')}</Text>
            <Ionicons name="trophy-outline" size={sizing.icon} color={colors.accent} />
          </View>
          <TrophyCarousel />
        </View>

        <Button
          title={t('profile.signOut')}
          variant="secondary"
          icon="log-out-outline"
          onPress={signOut}
          testID="profile-signout"
        />
        <Text style={styles.meta}>
          {t('profile.appVersion')} {Constants.expoConfig?.version} · {AUTH_LABELS[authMode]}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.xl },
  title: { ...font.title, color: colors.text },
  profileCard: {
    minHeight: sizing.avatarLarge + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  accountCopy: { flex: 1, gap: spacing.sm },
  accountLabel: { ...font.caption, color: colors.textMuted },
  email: { ...font.body, color: colors.text, fontWeight: '600' },
  statusDot: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    borderWidth: 1,
    borderColor: colors.bg,
  },
  section: { gap: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...font.heading, color: colors.text },
  settingsGroup: { padding: spacing.xs },
  trophyList: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.md },
  trophyCarousel: { width: '100%' },
  sliderTrack: {
    minHeight: sizing.touch,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  sliderRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  sliderThumb: {
    position: 'absolute',
    height: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  meta: {
    ...font.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
});
