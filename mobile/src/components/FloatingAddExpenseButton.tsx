import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type Friend, type Group } from '@/lib/api';
import { colors, radii, shadows, spacing } from '@/theme/tokens';

type ShortcutState = {
  friends: Friend[];
  groups: Group[];
};

const HIDDEN_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/account']);

export function FloatingAddExpenseButton() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [shortcutState, setShortcutState] = useState<ShortcutState>({ friends: [], groups: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const shouldHide = useMemo(() => {
    if (!pathname) {
      return true;
    }

    return HIDDEN_PATHS.has(pathname);
  }, [pathname]);

  const bottomOffset = pathname === '/friends' || pathname === '/groups' || pathname === '/activity'
    ? insets.bottom + 86
    : insets.bottom + 20;

  async function loadShortcuts() {
    setIsLoading(true);
    setError('');

    try {
      const [friends, groups] = await Promise.all([api.getFriends(), api.getGroups()]);
      setShortcutState({ friends, groups });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load shortcuts');
    } finally {
      setIsLoading(false);
    }
  }

  async function openSheet() {
    setSheetVisible(true);

    if (shortcutState.friends.length === 0 && shortcutState.groups.length === 0 && !isLoading) {
      await loadShortcuts();
    }
  }

  function closeSheet() {
    setSheetVisible(false);
    setError('');
  }

  function openFriendExpenseShortcut() {
    closeSheet();

    const firstFriend = shortcutState.friends[0];
    if (firstFriend) {
      router.push({
        pathname: '/friend/[friendId]',
        params: {
          friendId: firstFriend.id,
          compose: 'expense',
          composeKey: String(Date.now()),
        },
      });
      return;
    }

    router.push('/friends');
  }

  function openGroupExpenseShortcut() {
    closeSheet();

    const firstGroup = shortcutState.groups[0];
    if (firstGroup) {
      router.push({
        pathname: '/group/[groupId]',
        params: {
          groupId: firstGroup.id,
          compose: 'expense',
          composeKey: String(Date.now()),
        },
      });
      return;
    }

    router.push('/groups');
  }

  function handlePress() {
    if (pathname?.startsWith('/friend/')) {
      router.setParams({ compose: 'expense', composeKey: String(Date.now()) });
      return;
    }

    if (pathname?.startsWith('/group/')) {
      router.setParams({ compose: 'expense', composeKey: String(Date.now()) });
      return;
    }

    void openSheet();
  }

  if (shouldHide) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add expense"
        onPress={handlePress}
        style={[styles.fab, { bottom: bottomOffset }]}
      >
        <Ionicons name="add" size={22} color="#ffffff" />
        <Text style={styles.fabLabel}>Add expense</Text>
      </Pressable>

      <Modal visible={sheetVisible} animationType="fade" transparent onRequestClose={closeSheet}>
        <Pressable style={styles.overlay} onPress={closeSheet}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Add expense</Text>
            <Text style={styles.sheetText}>
              Jump straight into your existing friend or group expense flow.
            </Text>

            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primaryDark} />
                <Text style={styles.loadingText}>Loading your shortcuts...</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.optionCard} onPress={openFriendExpenseShortcut}>
              <View style={styles.optionIcon}>
                <Ionicons name="people-outline" size={18} color={colors.secondary} />
              </View>
              <View style={styles.optionBody}>
                <Text style={styles.optionTitle}>Friend expense</Text>
                <Text style={styles.optionMeta}>
                  {shortcutState.friends[0]
                    ? `Open ${shortcutState.friends[0].name}'s expense form`
                    : 'Go to Friends and pick who this is for'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable style={styles.optionCard} onPress={openGroupExpenseShortcut}>
              <View style={styles.optionIcon}>
                <Ionicons name="albums-outline" size={18} color={colors.secondary} />
              </View>
              <View style={styles.optionBody}>
                <Text style={styles.optionTitle}>Group expense</Text>
                <Text style={styles.optionMeta}>
                  {shortcutState.groups[0]
                    ? `Open ${shortcutState.groups[0].name}'s expense form`
                    : 'Go to Groups and pick where to add it'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...shadows.card,
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sheetText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  optionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  optionMeta: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
