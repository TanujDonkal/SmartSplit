import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { NoticeText } from '@/components/NoticeText';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, type Expense, type Group } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

type DashboardExpense = Expense & { groupName: string };

export default function ActivityScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<DashboardExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setRecentExpenses([]);
      setIsLoading(false);
      return;
    }

    void loadActivity();
  }, [token]);

  async function loadActivity() {
    setIsLoading(true);
    setError('');

    try {
      const groupList = await api.getGroups();
      setGroups(groupList);

      const expenseLists = await Promise.all(groupList.map((group) => api.getGroupExpenses(group.id)));
      const flattened = groupList.flatMap((group, index) =>
        expenseLists[index].map((expense) => ({
          ...expense,
          groupName: group.name,
        })),
      );

      flattened.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setRecentExpenses(flattened.slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activity');
    } finally {
      setIsLoading(false);
    }
  }

  const groupMap = useMemo(() => Object.fromEntries(groups.map((group) => [group.id, group])), [groups]);

  return (
    <AppScreen>
      <AppHeader />

      <SurfaceCard>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.body}>
          Recent group expenses, balances, and receipt-backed entries appear here.
        </Text>
      </SurfaceCard>

      {error ? <NoticeText tone="error" message={error} /> : null}

      {!token ? (
        <SurfaceCard>
          <Text style={styles.body}>Log in to view recent group activity.</Text>
        </SurfaceCard>
      ) : isLoading ? (
        <SurfaceCard>
          <Text style={styles.body}>Loading activity...</Text>
        </SurfaceCard>
      ) : recentExpenses.length === 0 ? (
        <SurfaceCard>
          <Text style={styles.body}>No recent group activity yet.</Text>
        </SurfaceCard>
      ) : (
        recentExpenses.map((expense) => (
          <Pressable
            key={expense.id}
            onPress={() => {
              if (expense.group_id && groupMap[expense.group_id]) {
                router.push(`/group/${expense.group_id}`);
              }
            }}
            style={({ pressed }) => [pressed ? styles.cardPressed : null]}
          >
            <SurfaceCard>
              <Text style={styles.itemTitle}>{expense.description}</Text>
              <Text style={styles.itemMeta}>
                Paid by {expense.payer.name} in {expense.groupName}
              </Text>
              <Text style={styles.amount}>
                {formatMoney(Number(expense.amount), expense.currency)}
              </Text>
              {expense.currency !== 'CAD' ? (
                <Text style={styles.converted}>
                  {formatMoney(Number(expense.converted_amount), 'CAD')} normalized
                </Text>
              ) : null}
              {expense.note ? <Text style={styles.note}>{expense.note}</Text> : null}
            </SurfaceCard>
          </Pressable>
        ))
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
  itemTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  amount: {
    marginTop: spacing.sm,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  converted: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSoft,
  },
  note: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  cardPressed: {
    opacity: 0.92,
  },
});
