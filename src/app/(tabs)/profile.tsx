import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { useAuthStore } from '@/state/useAuthStore';
import { authMode } from '@/services/firebase/config';
import { Button } from '@/ui/Button';
import { GlassSurface } from '@/ui/GlassSurface';
import { ScreenContainer } from '@/ui/ScreenContainer';
import { Avatar, SettingsRow, TrophyBadge } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';
import { StyledScrollbar } from '@/ui/layout/StyledScrollbar';

const TROPHIES = [
  {
    id: 'first-light',
    icon: 'star-outline',
    title: 'Első fény',
    description: 'Nézd meg első alkalommal az égboltot.',
    difficulty: 'Kezdő',
    color: colors.success,
  },
  {
    id: 'explorer',
    icon: 'telescope-outline',
    title: 'Felfedező',
    description: 'Fedezz fel öt különböző csillagképet.',
    difficulty: 'Kezdő',
    color: colors.success,
  },
  {
    id: 'moon-walker',
    icon: 'moon-outline',
    title: 'Holdjáró',
    description: 'Látogasd meg az égboltot három különböző éjszakán.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    id: 'compass',
    icon: 'compass-outline',
    title: 'Iránytű',
    description: 'Fedezd fel az égbolt mind a négy égtáját.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    id: 'streak',
    icon: 'flame-outline',
    title: 'Sorozat',
    description: 'Térj vissza hét egymást követő napon.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    id: 'stargazer',
    icon: 'ribbon-outline',
    title: 'Csillagnéző',
    description: 'Teljesíts tíz csillagászati kihívást.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    id: 'world-traveler',
    icon: 'planet-outline',
    title: 'Világjáró',
    description: 'Próbálj ki öt különböző égikultúrát.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    id: 'night-owl',
    icon: 'eye-outline',
    title: 'Éjjeli bagoly',
    description: 'Fedezd fel az eget éjfél után.',
    difficulty: 'Kezdő',
    color: colors.success,
  },
  {
    id: 'milky-way',
    icon: 'sparkles-outline',
    title: 'Tejút',
    description: 'Ismerj fel húsz csillagképet.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    id: 'regular',
    icon: 'calendar-outline',
    title: 'Állandó vendég',
    description: 'Gyűjts össze harminc megfigyelési alkalmat.',
    difficulty: 'Nehéz',
    color: colors.bronze,
  },
  {
    id: 'culture-keeper',
    icon: 'planet-outline',
    title: 'Kultúrák őre',
    description: 'Ismerj meg minden elérhető égikultúrát.',
    difficulty: 'Haladó',
    color: colors.info,
  },
  {
    id: 'master-observer',
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

function TrophyCarousel({ unlockedIds }: { unlockedIds: string[] }) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollOffset(event.nativeEvent.contentOffset.x);
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
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        scrollEventThrottle={16}
      >
        {TROPHIES.map((trophy) => (
          <TrophyBadge
            key={trophy.id}
            icon={trophy.icon}
            title={trophy.title}
            description={trophy.description}
            difficulty={trophy.difficulty}
            difficultyColor={trophy.color}
            locked={!unlockedIds.includes(trophy.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.scrollbar}>
        <StyledScrollbar
          orientation="horizontal"
          contentSize={contentWidth}
          viewportSize={viewportWidth}
          offset={scrollOffset}
          accessibilityLabel="Trófeák görgetősávja"
          onScrollTo={(offset) => {
            scrollRef.current?.scrollTo({ x: offset, animated: false });
            setScrollOffset(offset);
          }}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const syncError = useAuthStore((state) => state.syncError);
  const trophyIds = useAuthStore((state) => state.trophyIds);
  const signOut = useAuthStore((state) => state.signOut);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const authBusy = useAuthStore((state) => state.busy);
  const authError = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const initials = user?.email?.slice(0, 1) ?? '?';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  function closeDeleteDialog() {
    setDeleteOpen(false);
    setDeletePassword('');
    clearAuthError();
  }

  async function confirmDeleteAccount() {
    if (await deleteAccount(deletePassword)) closeDeleteDialog();
  }

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adataim törlése"
              onPress={() => {
                clearAuthError();
                setDeleteOpen(true);
              }}
              testID="profile-delete-data"
              style={styles.deleteRow}
            >
              <Ionicons name="trash-outline" size={sizing.icon} color={colors.danger} />
              <Text style={styles.deleteRowText}>Adataim törlése</Text>
            </Pressable>
          </GlassSurface>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>{t('profile.trophies')}</Text>
            <Ionicons name="trophy-outline" size={sizing.icon} color={colors.accent} />
          </View>
          <TrophyCarousel unlockedIds={trophyIds} />
        </View>

        <Button
          title={t('profile.signOut')}
          variant="secondary"
          icon="log-out-outline"
          onPress={signOut}
          testID="profile-signout"
        />
        {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}
        <Text style={styles.meta}>
          {t('profile.appVersion')} {Constants.expoConfig?.version} · {AUTH_LABELS[authMode]}
        </Text>
      </View>
      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteDialog}
      >
        <View style={styles.deleteModal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Párbeszéd bezárása"
            onPress={closeDeleteDialog}
            style={StyleSheet.absoluteFill}
          />
          <GlassSurface style={styles.deleteDialog} testID="profile-delete-dialog">
            <Text style={styles.deleteTitle}>Adataim törlése</Text>
            <Text style={styles.deleteDescription}>
              A játékrekordjaid, trófeáid és fiókod véglegesen törlődnek. A folytatáshoz add meg a
              jelszavad.
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoComplete="current-password"
              accessibilityLabel="Jelszó a fiók törlésének megerősítéséhez"
              placeholder="Jelszó"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => void confirmDeleteAccount()}
              style={styles.deletePassword}
              testID="profile-delete-password"
            />
            {authError ? <Text style={styles.deleteError}>{authError}</Text> : null}
            <View style={styles.deleteActions}>
              <Button
                title="Mégse"
                variant="secondary"
                onPress={closeDeleteDialog}
                disabled={authBusy}
              />
              <Button
                title="Végleges törlés"
                onPress={() => void confirmDeleteAccount()}
                loading={authBusy}
                disabled={!deletePassword}
                testID="profile-delete-confirm"
              />
            </View>
          </GlassSurface>
        </View>
      </Modal>
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
  deleteRow: {
    minHeight: sizing.touch + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteRowText: { ...font.body, color: colors.danger },
  deleteModal: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backdrop,
  },
  deleteDialog: { width: '100%', maxWidth: 440, gap: spacing.md, padding: spacing.lg },
  deleteTitle: { ...font.heading, color: colors.text },
  deleteDescription: { ...font.small, color: colors.textMuted, lineHeight: spacing.xl },
  deletePassword: {
    minHeight: sizing.touch + spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 16,
  },
  deleteError: { ...font.small, color: colors.danger },
  deleteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  trophyList: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.md },
  trophyCarousel: { width: '100%' },
  scrollbar: { marginTop: spacing.xs },
  meta: {
    ...font.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  syncError: { ...font.caption, color: colors.danger, textAlign: 'center' },
});
