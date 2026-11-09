import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { FriendSummary } from '@/core/models/Friend';
import { GAME_OPTIONS } from '@/features/games/gameOptions';
import { useAuthStore } from '@/state/useAuthStore';
import { Button } from '@/ui/Button';
import { GlassSurface } from '@/ui/GlassSurface';
import { Avatar } from '@/ui/components';
import { t } from '@/ui/i18n';
import { colors, font, radius, sizing, spacing } from '@/ui/theme';

import { useFriendsStore, type FriendEntry } from './useFriendsStore';

function initialsOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

/** „Felismerő 340 · Csillagról — · Hiedelem 120” alakú rekordsor. */
export function formatFriendScores(summary: FriendSummary): string {
  return GAME_OPTIONS.map((game) => {
    const score = summary.scores[game.id];
    return `${t(game.leaderboardKey)} ${score ? score.toLocaleString('hu-HU') : '—'}`;
  }).join(' · ');
}

function FriendRow({ entry, onRemove }: { entry: FriendEntry; onRemove: () => void }) {
  const { summary } = entry;
  const name = summary?.displayName ?? 'Már nem elérhető';
  return (
    <View style={styles.friendRow} testID={`friend-${entry.uid}`}>
      <Avatar initials={initialsOf(name)} size={sizing.touch} />
      <View style={styles.friendCopy}>
        <Text style={styles.friendName} numberOfLines={1}>
          {name}
        </Text>
        {summary ? (
          <>
            <Text style={styles.friendMeta} numberOfLines={1}>
              {summary.points.toLocaleString('hu-HU')} XP · {summary.trophyCount}{' '}
              {t('leaderboard.trophies')}
            </Text>
            <Text style={styles.friendScores} numberOfLines={2}>
              {formatFriendScores(summary)}
            </Text>
          </>
        ) : (
          <Text style={styles.friendMeta}>A játékos fiókja törölve lett.</Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} eltávolítása a barátok közül`}
        onPress={onRemove}
        hitSlop={spacing.sm}
        style={styles.removeButton}
      >
        <Ionicons name="person-remove-outline" size={sizing.icon} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function FriendsSection() {
  const uid = useAuthStore((state) => state.user?.uid);
  const status = useFriendsStore((state) => state.status);
  const entries = useFriendsStore((state) => state.entries);
  const addError = useFriendsStore((state) => state.addError);
  const refresh = useFriendsStore((state) => state.refresh);
  const addFriend = useFriendsStore((state) => state.addFriend);
  const removeFriend = useFriendsStore((state) => state.removeFriend);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);

  // A fül megnyitásakor frissítünk (a store ritkítja a kéréseket); a gomb kényszerített frissítés.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function submit() {
    setAdding(true);
    try {
      if (await addFriend(code)) setCode('');
    } finally {
      setAdding(false);
    }
  }

  const loading = status === 'loading';

  return (
    <View style={styles.section} testID="friends-section">
      <View style={styles.heading}>
        <Text style={styles.sectionTitle}>
          Barátok{status === 'ready' ? ` · ${entries.length}` : ''}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Barátlista frissítése"
          disabled={loading || status === 'unavailable'}
          onPress={() => void refresh({ force: true })}
          hitSlop={spacing.sm}
          testID="friends-refresh"
        >
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Ionicons name="refresh-outline" size={sizing.icon} color={colors.accent} />
          )}
        </Pressable>
      </View>

      {status === 'unavailable' ? (
        <GlassSurface style={styles.card}>
          <Text style={styles.hint}>
            A barátlistához online fiók kell (Firebase). Helyi módban nem érhető el.
          </Text>
        </GlassSurface>
      ) : (
        <>
          <GlassSurface style={styles.card}>
            <Text style={styles.label}>A te barátkódod (oszd meg a barátaiddal)</Text>
            <Text selectable style={styles.code} testID="friends-own-code">
              {uid ?? ''}
            </Text>
            <View style={styles.addRow}>
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Barátkód"
                placeholder="Barátkód beillesztése"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={() => void submit()}
                style={styles.input}
                testID="friends-code-input"
              />
              <Button
                title="Hozzáadás"
                icon="person-add-outline"
                onPress={() => void submit()}
                loading={adding}
                disabled={!code.trim()}
                testID="friends-add"
              />
            </View>
            {addError ? <Text style={styles.error}>{addError}</Text> : null}
          </GlassSurface>

          {status === 'error' ? (
            <Text style={styles.error}>
              A barátlista most nem tölthető be. Próbáld újra a frissítés gombbal.
            </Text>
          ) : null}

          {entries.length ? (
            <GlassSurface style={styles.list}>
              {entries.map((entry) => (
                <FriendRow
                  key={entry.uid}
                  entry={entry}
                  onRemove={() => void removeFriend(entry.uid)}
                />
              ))}
            </GlassSurface>
          ) : status === 'ready' ? (
            <Text style={styles.hint}>Még nincs barátod. Add meg valaki barátkódját!</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...font.heading, color: colors.text },
  card: { gap: spacing.sm, padding: spacing.md },
  label: { ...font.caption, color: colors.textMuted },
  code: { ...font.small, ...font.mono, color: colors.text },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: sizing.touch + spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 16,
  },
  hint: { ...font.small, color: colors.textMuted },
  error: { ...font.small, color: colors.danger },
  list: { padding: spacing.sm, gap: spacing.xs },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm },
  friendCopy: { flex: 1, minWidth: 0, gap: 2 },
  friendName: { ...font.body, color: colors.text, fontWeight: '600' },
  friendMeta: { ...font.caption, color: colors.accent },
  friendScores: { ...font.caption, color: colors.textMuted },
  removeButton: { padding: spacing.xs },
});
