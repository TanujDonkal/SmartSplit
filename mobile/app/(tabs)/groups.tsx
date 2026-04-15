import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, type Balance, type Group } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

export default function GroupsScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, Balance[]>>({});
  const [groupName, setGroupName] = useState('');
  const [dashboardNetBalance, setDashboardNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setGroupBalances({});
      setDashboardNetBalance(0);
      setIsLoading(false);
      return;
    }

    void loadGroups();
  }, [token, user?.id]);

  async function loadGroups() {
    setIsLoading(true);
    setError('');

    try {
      const groupList = await api.getGroups();
      setGroups(groupList);

      const balancesList = await Promise.all(
        groupList.map(async (group) => [group.id, await api.getGroupBalances(group.id)] as const),
      );

      const balanceMap = Object.fromEntries(balancesList);
      setGroupBalances(balanceMap);

      const net = Object.values(balanceMap).reduce((total, balances) => {
        const mine = balances.find((entry) => entry.user.id === user?.id);
        return total + (mine?.balance ?? 0);
      }, 0);
      setDashboardNetBalance(net);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load groups');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const created = await api.createGroup({ name: groupName.trim() });
      setGroupName('');
      await loadGroups();
      router.push(`/group/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create group');
    } finally {
      setIsCreating(false);
    }
  }

  const dashboardMessage =
    dashboardNetBalance > 0.005
      ? `Overall, you are owed ${formatMoney(Math.abs(dashboardNetBalance), 'CAD')}`
      : dashboardNetBalance < -0.005
        ? `Overall, you owe ${formatMoney(Math.abs(dashboardNetBalance), 'CAD')}`
        : 'Overall, you are settled up in CAD';

  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.greeting}>{token ? `Hi, ${user?.name ?? 'there'}` : 'Welcome'}</Text>
        <Text style={styles.title}>{dashboardMessage}</Text>
      </SurfaceCard>

      {error ? <NoticeText tone="error" message={error} /> : null}

      {!token ? (
        <SurfaceCard>
          <Text style={styles.body}>Log in first to create groups and track shared balances.</Text>
        </SurfaceCard>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Groups</Text>
            <Text style={styles.sectionBadge}>Daily splits</Text>
          </View>

          <SurfaceCard>
            <View style={styles.form}>
              <FormField
                label="Group name"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Trip to Toronto"
              />
              <PrimaryButton
                label="Create group"
                onPress={() => void handleCreateGroup()}
                loading={isCreating}
              />
            </View>
          </SurfaceCard>

          {isLoading ? (
            <SurfaceCard>
              <Text style={styles.body}>Loading groups...</Text>
            </SurfaceCard>
          ) : groups.length === 0 ? (
            <SurfaceCard>
              <Text style={styles.body}>No groups yet. Create one to get started.</Text>
            </SurfaceCard>
          ) : (
            groups.map((group) => {
              const balances = groupBalances[group.id] ?? [];
              const mine = balances.find((entry) => entry.user.id === user?.id)?.balance ?? 0;

              return (
                <Pressable
                  key={group.id}
                  onPress={() => router.push(`/group/${group.id}`)}
                  style={({ pressed }) => [pressed ? styles.cardPressed : null]}
                >
                  <SurfaceCard>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>
                      {group.members.length} members
                      {group._count?.expenses ? ` • ${group._count.expenses} expenses` : ''}
                    </Text>
                    <Text
                      style={[
                        styles.groupBalance,
                        mine > 0.005
                          ? styles.positive
                          : mine < -0.005
                            ? styles.negative
                            : styles.neutral,
                      ]}
                    >
                      {mine > 0.005
                        ? `You get back ${formatMoney(Math.abs(mine), 'CAD')}`
                        : mine < -0.005
                          ? `You owe ${formatMoney(Math.abs(mine), 'CAD')}`
                          : 'Settled right now'}
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
  greeting: {
    fontSize: 14,
    color: colors.textMuted,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 32,
    lineHeight: 38,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  sectionBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  groupMeta: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  groupBalance: {
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
