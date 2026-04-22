import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, type Friend, type FriendSummary } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, radii, spacing } from '@/theme/tokens';

function getFriendInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatBalanceCopy(friendName: string, balance: number) {
  if (balance > 0.005) {
    return {
      label: 'owes you',
      amount: formatMoney(Math.abs(balance), 'CAD'),
      tone: 'positive' as const,
      message: `${friendName} owes you ${formatMoney(Math.abs(balance), 'CAD')}`,
    };
  }

  if (balance < -0.005) {
    return {
      label: 'you owe',
      amount: formatMoney(Math.abs(balance), 'CAD'),
      tone: 'negative' as const,
      message: `You owe ${friendName} ${formatMoney(Math.abs(balance), 'CAD')}`,
    };
  }

  return {
    label: 'settled up',
    amount: '',
    tone: 'neutral' as const,
    message: 'You are settled up',
  };
}

export default function FriendsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [summaries, setSummaries] = useState<Record<string, FriendSummary>>({});
  const [friendUsername, setFriendUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!token) {
      setFriends([]);
      setSummaries({});
      setIsLoading(false);
      return;
    }

    void loadFriends();
  }, [token]);

  const totalSummary = useMemo(() => {
    return friends.reduce(
      (acc, friend) => {
        const balance = summaries[friend.id]?.net_balance ?? 0;
        if (balance > 0.005) {
          acc.owedToYou += balance;
        } else if (balance < -0.005) {
          acc.youOwe += Math.abs(balance);
        } else {
          acc.settled += 1;
        }

        return acc;
      },
      { youOwe: 0, owedToYou: 0, settled: 0 },
    );
  }, [friends, summaries]);

  async function loadFriends() {
    setIsLoading(true);
    setError('');

    try {
      const friendList = await api.getFriends();
      setFriends(friendList);

      const summaryList = await Promise.all(
        friendList.map(
          async (friend) => [friend.id, await api.getFriendSummary(friend.id)] as const,
        ),
      );

      setSummaries(Object.fromEntries(summaryList));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load friends');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  }

  async function handleAddFriend() {
    if (!friendUsername.trim()) {
      setError('Friend username is required.');
      return;
    }

    setIsAddingFriend(true);
    setError('');

    try {
      await api.addFriend({ username: friendUsername.trim().toLowerCase() });
      setFriendUsername('');
      setShowAddForm(false);
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add friend');
    } finally {
      setIsAddingFriend(false);
    }
  }

  function confirmDeleteFriend(friend: Friend) {
    Alert.alert(
      'Delete friend',
      `Do you want to delete ${friend.name}? This will also remove your shared direct expense history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void handleDeleteFriend(friend.id),
        },
      ],
    );
  }

  async function handleDeleteFriend(friendId: string) {
    setDeletingFriendId(friendId);
    setError('');

    try {
      await api.deleteFriend(friendId);
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete friend');
    } finally {
      setDeletingFriendId(null);
    }
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.topRow}>
        <Pressable style={styles.iconButton}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.addButton} onPress={() => setShowAddForm((current) => !current)}>
          <Text style={styles.addButtonText}>{showAddForm ? 'Close' : 'Add friends'}</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Friends</Text>

      {error ? <NoticeText tone="error" message={error} /> : null}

      {!token ? (
        <SurfaceCard>
          <Text style={styles.summaryTitle}>Log in first</Text>
          <Text style={styles.summaryLine}>
            Sign in to view friends, balances, and direct expenses.
          </Text>
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard>
            <Text style={styles.summaryTitle}>Total balance</Text>
            {totalSummary.youOwe > 0.005 ? (
              <Text style={[styles.summaryLine, styles.negativeText]}>
                You owe {formatMoney(totalSummary.youOwe, 'CAD')}
              </Text>
            ) : null}
            {totalSummary.owedToYou > 0.005 ? (
              <Text style={[styles.summaryLine, styles.positiveText]}>
                You are owed {formatMoney(totalSummary.owedToYou, 'CAD')}
              </Text>
            ) : null}
            {totalSummary.youOwe <= 0.005 && totalSummary.owedToYou <= 0.005 ? (
              <Text style={styles.summaryLine}>You are settled up</Text>
            ) : null}
            <Text style={styles.summaryHint}>
              {friends.length} {friends.length === 1 ? 'friend' : 'friends'} in your list
            </Text>
          </SurfaceCard>

          {showAddForm ? (
            <SurfaceCard>
              <View style={styles.form}>
                <FormField
                  label="Friend username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="friend_username"
                  value={friendUsername}
                  onChangeText={setFriendUsername}
                />
                <PrimaryButton
                  label="Add friend"
                  onPress={() => void handleAddFriend()}
                  loading={isAddingFriend}
                />
                <Text style={styles.help}>
                  Use the exact username your friend chose when signing up.
                </Text>
              </View>
            </SurfaceCard>
          ) : null}

          {isLoading ? (
            <SurfaceCard>
              <Text style={styles.summaryLine}>Loading friends...</Text>
            </SurfaceCard>
          ) : friends.length === 0 ? (
            <SurfaceCard>
              <Text style={styles.summaryTitle}>No friends yet</Text>
              <Text style={styles.summaryLine}>
                Tap Add friends to connect with someone by username.
              </Text>
            </SurfaceCard>
          ) : (
            <View style={styles.listWrap}>
              {friends.map((friend, index) => {
                const summary = summaries[friend.id];
                const balance = summary?.net_balance ?? 0;
                const balanceCopy = formatBalanceCopy(friend.name, balance);

                return (
                  <SwipeToDeleteRow
                    key={friend.id}
                    disabled={deletingFriendId === friend.id}
                    onDelete={() => confirmDeleteFriend(friend)}
                  >
                    <Pressable
                      onPress={() => router.push(`/friend/${friend.id}`)}
                      style={({ pressed }) => [
                        styles.friendRow,
                        index === friends.length - 1 ? styles.friendRowLast : null,
                        pressed ? styles.cardPressed : null,
                      ]}
                    >
                      <View style={styles.friendMain}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{getFriendInitials(friend.name)}</Text>
                        </View>
                        <View style={styles.friendCopy}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          <Text style={styles.friendUsername}>@{friend.username}</Text>
                        </View>
                      </View>
                      <View style={styles.friendSide}>
                        <Text
                          style={[
                            styles.balanceLabel,
                            balanceCopy.tone === 'positive'
                              ? styles.positiveText
                              : balanceCopy.tone === 'negative'
                                ? styles.negativeText
                                : styles.neutralText,
                          ]}
                        >
                          {balanceCopy.label}
                        </Text>
                        {balanceCopy.amount ? (
                          <Text
                            style={[
                              styles.balanceAmount,
                              balanceCopy.tone === 'positive'
                                ? styles.positiveText
                                : styles.negativeText,
                            ]}
                          >
                            {balanceCopy.amount}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textSoft}
                        style={styles.chevron}
                      />
                    </Pressable>
                  </SwipeToDeleteRow>
                );
              })}
            </View>
          )}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLine: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    fontWeight: '600',
  },
  summaryHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  help: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  listWrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  friendRowLast: {
    borderBottomWidth: 0,
  },
  friendMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTint,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  friendCopy: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  friendUsername: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  friendSide: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  balanceAmount: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
  },
  positiveText: {
    color: colors.primaryDark,
  },
  negativeText: {
    color: '#ff9630',
  },
  neutralText: {
    color: colors.textMuted,
  },
  chevron: {
    marginTop: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
});
