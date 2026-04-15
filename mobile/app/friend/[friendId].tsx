import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import { api, SUPPORTED_CURRENCIES, type FriendExpense, type FriendSummary, type SupportedCurrency } from '@/lib/api';
import { buildIsoDate, formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

type FriendExpenseOption =
  | 'you_paid_equal'
  | 'friend_paid_equal'
  | 'you_paid_full'
  | 'friend_paid_full';

export default function FriendDetailScreen() {
  const params = useLocalSearchParams<{ friendId: string }>();
  const { user } = useAuth();
  const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId;
  const [summary, setSummary] = useState<FriendSummary | null>(null);
  const [expenses, setExpenses] = useState<FriendExpense[]>([]);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    currency: 'CAD' as SupportedCurrency,
    option: 'you_paid_equal' as FriendExpenseOption,
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettlingUp, setIsSettlingUp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!friendId) {
      setIsLoading(false);
      setError('Friend not found');
      return;
    }

    void loadFriendDetail(friendId);
  }, [friendId]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      currency: (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD',
    }));
  }, [user?.default_currency]);

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort(
        (a, b) => new Date(b.incurred_on).getTime() - new Date(a.incurred_on).getTime(),
      ),
    [expenses],
  );

  const currentBalance = summary?.net_balance ?? 0;
  const balanceMessage =
    currentBalance > 0.005
      ? `${summary?.friend.name} owes you ${formatMoney(Math.abs(currentBalance), 'CAD')} overall`
      : currentBalance < -0.005
        ? `You owe ${summary?.friend.name} ${formatMoney(Math.abs(currentBalance), 'CAD')} overall`
        : `You and ${summary?.friend.name ?? 'your friend'} are settled up in CAD`;

  async function loadFriendDetail(id: string) {
    setIsLoading(true);
    setError('');

    try {
      const [friendSummary, friendExpenses] = await Promise.all([
        api.getFriendSummary(id),
        api.getFriendExpenses(id),
      ]);
      setSummary(friendSummary);
      setExpenses(friendExpenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load friend details');
    } finally {
      setIsLoading(false);
    }
  }

  function payloadByOption(option: FriendExpenseOption) {
    const map: Record<
      FriendExpenseOption,
      { paid_by: 'self' | 'friend'; split_type: 'equal' | 'full_amount' }
    > = {
      you_paid_equal: { paid_by: 'self', split_type: 'equal' },
      friend_paid_equal: { paid_by: 'friend', split_type: 'equal' },
      you_paid_full: { paid_by: 'self', split_type: 'full_amount' },
      friend_paid_full: { paid_by: 'friend', split_type: 'full_amount' },
    };

    return map[option];
  }

  async function handleAddExpense() {
    if (!friendId || !summary) {
      return;
    }

    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await api.addFriendExpense(friendId, {
        description: form.description.trim(),
        amount,
        currency: form.currency,
        note: form.note.trim(),
        incurred_on: buildIsoDate(form.incurred_on),
        ...payloadByOption(form.option),
      });

      setForm({
        description: '',
        amount: '',
        currency: (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD',
        option: 'you_paid_equal',
        note: '',
        incurred_on: new Date().toISOString().slice(0, 10),
      });
      setShowAddExpenseForm(false);
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSettleUp() {
    if (!friendId || Math.abs(currentBalance) < 0.01) {
      return;
    }

    setIsSettlingUp(true);
    setError('');

    try {
      await api.settleUpFriend(friendId);
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to settle up');
    } finally {
      setIsSettlingUp(false);
    }
  }

  function getExpenseSummary(expense: FriendExpense) {
    if (!summary) {
      return '';
    }

    if (expense.activity_type === 'SETTLEMENT') {
      const paidByMe = expense.payer.id === user?.id;
      return paidByMe
        ? `You settled up with ${summary.friend.name} for ${formatMoney(Number(expense.amount), expense.currency)}`
        : `${summary.friend.name} settled up with you for ${formatMoney(Number(expense.amount), expense.currency)}`;
    }

    const amount = Number(expense.amount);
    const share = amount / 2;
    const paidByMe = expense.payer.id === user?.id;

    if (expense.split_type === 'FULL_AMOUNT') {
      return paidByMe
        ? `${summary.friend.name} owes you ${formatMoney(amount, expense.currency)}`
        : `You owe ${summary.friend.name} ${formatMoney(amount, expense.currency)}`;
    }

    return paidByMe
      ? `${summary.friend.name} owes you ${formatMoney(share, expense.currency)}`
      : `You owe ${summary.friend.name} ${formatMoney(share, expense.currency)}`;
  }

  if (isLoading) {
    return (
      <AppScreen>
        <SurfaceCard>
          <Text style={styles.helper}>Loading friend details...</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  if (!summary) {
    return (
      <AppScreen>
        {error ? <NoticeText tone="error" message={error} /> : null}
        <SurfaceCard>
          <Text style={styles.helper}>We could not find that friend.</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {error ? <NoticeText tone="error" message={error} /> : null}

      <SurfaceCard>
        <Text style={styles.heroTitle}>{summary.friend.name}</Text>
        <Text style={styles.heroMeta}>@{summary.friend.username}</Text>
        <Text style={styles.balanceMessage}>{balanceMessage}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>You paid</Text>
            <Text style={styles.statValue}>{formatMoney(summary.you_paid_total, 'CAD')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Friend paid</Text>
            <Text style={styles.statValue}>{formatMoney(summary.friend_paid_total, 'CAD')}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label={isSettlingUp ? 'Settling up...' : 'Settle up'}
            onPress={() => void handleSettleUp()}
            disabled={Math.abs(currentBalance) < 0.01}
          />
          <PrimaryButton
            label={showAddExpenseForm ? 'Close form' : 'Add expense'}
            tone="ghost"
            onPress={() => setShowAddExpenseForm((current) => !current)}
          />
        </View>
      </SurfaceCard>

      {showAddExpenseForm ? (
        <SurfaceCard>
          <Text style={styles.sectionTitle}>Add direct expense</Text>
          <View style={styles.form}>
            <FormField
              label="Description"
              value={form.description}
              onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
              placeholder="Food"
            />
            <FormField
              label="Amount"
              value={form.amount}
              onChangeText={(value) => setForm((current) => ({ ...current, amount: value }))}
              keyboardType="decimal-pad"
              placeholder="20"
            />
            <FormField
              label="Currency"
              value={form.currency}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  currency: (value.toUpperCase() as SupportedCurrency) || current.currency,
                }))
              }
              hint={`Supported: ${SUPPORTED_CURRENCIES.join(', ')}`}
            />
            <FormField
              label="Date"
              value={form.incurred_on}
              onChangeText={(value) => setForm((current) => ({ ...current, incurred_on: value }))}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label="Split details"
              value={form.option}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  option: value as FriendExpenseOption,
                }))
              }
              hint="Use: you_paid_equal, friend_paid_equal, you_paid_full, friend_paid_full"
            />
            <FormField
              label="Optional note"
              value={form.note}
              onChangeText={(value) => setForm((current) => ({ ...current, note: value }))}
              placeholder="Anything helpful to remember later"
            />
            <PrimaryButton
              label={isSaving ? 'Saving expense...' : 'Save expense'}
              onPress={() => void handleAddExpense()}
              loading={isSaving}
            />
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.list}>
          {sortedExpenses.length === 0 ? (
            <Text style={styles.helper}>No direct activity yet with {summary.friend.name}.</Text>
          ) : (
            sortedExpenses.map((expense) => (
              <View key={expense.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{expense.description}</Text>
                <Text style={styles.listMeta}>
                  {expense.activity_type === 'SETTLEMENT' ? 'Settlement' : `${expense.payer.name} paid`} on{' '}
                  {new Date(expense.incurred_on).toLocaleDateString()}
                </Text>
                <Text style={styles.listAmount}>
                  {formatMoney(Number(expense.amount), expense.currency)}
                </Text>
                <Text style={styles.listSummary}>{getExpenseSummary(expense)}</Text>
                {expense.note ? <Text style={styles.listNote}>{expense.note}</Text> : null}
              </View>
            ))
          )}
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  helper: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  heroMeta: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
  },
  balanceMessage: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#f7f8f4',
    padding: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  statValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  form: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  listCard: {
    borderRadius: 18,
    backgroundColor: '#f7f8f4',
    padding: spacing.md,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  listMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  listAmount: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  listSummary: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  listNote: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
