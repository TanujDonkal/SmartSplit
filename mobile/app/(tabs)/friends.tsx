import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, type Friend, type FriendSummary } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

export default function FriendsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [summaries, setSummaries] = useState<Record<string, FriendSummary>>({});
  const [friendUsername, setFriendUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [deletingFriendId, setDeletingFriendId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setFriends([]);
      setSummaries({});
      setIsLoading(false);
      return;
    }

    void loadFriends();
  }, [token]);

  async function loadFriends() {
    setIsLoading(true);
    setError('');

    try {
      const friendList = await api.getFriends();
      setFriends(friendList);

      const summaryList = await Promise.all(
        friendList.map(async (friend) => [friend.id, await api.getFriendSummary(friend.id)] as const),
      );

      setSummaries(Object.fromEntries(summaryList));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load friends');
    } finally {
      setIsLoading(false);
    }
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
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.body}>
          Add signed-up friends by username and keep direct daily balances easy to read.
        </Text>
      </SurfaceCard>

      {error ? <NoticeText tone="error" message={error} /> : null}

      {!token ? (
        <SurfaceCard>
          <Text style={styles.body}>Log in first, then add a signed-up friend by username.</Text>
        </SurfaceCard>
      ) : (
        <>
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

          {isLoading ? (
            <SurfaceCard>
              <Text style={styles.body}>Loading friends...</Text>
            </SurfaceCard>
          ) : friends.length === 0 ? (
            <SurfaceCard>
              <Text style={styles.body}>No friends added yet.</Text>
            </SurfaceCard>
          ) : (
            friends.map((friend) => {
              const summary = summaries[friend.id];
              const balance = summary?.net_balance ?? 0;
              const tone =
                balance > 0.005
                  ? styles.positive
                  : balance < -0.005
                    ? styles.negative
                    : styles.neutral;

              return (
                <Pressable
                  key={friend.id}
                  onPress={() => router.push(`/friend/${friend.id}`)}
                  style={({ pressed }) => [pressed ? styles.cardPressed : null]}
                >
                  <SurfaceCard>
                    <View style={styles.rowTop}>
                      <View style={styles.titleWrap}>
                        <Text style={styles.friendName}>{friend.name}</Text>
                        <Text style={styles.friendUsername}>@{friend.username}</Text>
                      </View>
                      <View style={styles.iconRow}>
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => router.push(`/friend/${friend.id}`)}
                        >
                          <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => router.push(`/friend/${friend.id}`)}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.textMuted} />
                        </Pressable>
                        <Pressable
                          style={[styles.iconButton, styles.deleteButton]}
                          onPress={() => confirmDeleteFriend(friend)}
                          disabled={deletingFriendId === friend.id}
                        >
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={[styles.balance, tone]}>
                      {balance > 0.005
                        ? `${friend.name} owes you ${formatMoney(Math.abs(balance), 'CAD')}`
                        : balance < -0.005
                          ? `You owe ${friend.name} ${formatMoney(Math.abs(balance), 'CAD')}`
                          : 'You are settled up'}
                    </Text>
                  </SurfaceCard>
                </Pressable>
              );
            })
          )}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 24,
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
  friendName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
  },
  friendUsername: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  balance: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: colors.primaryDark,
  },
  negative: {
    color: '#ff9630',
  },
  neutral: {
    color: colors.textMuted,
  },
  cardPressed: {
    opacity: 0.92,
  },
});
