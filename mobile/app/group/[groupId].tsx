import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useAuth } from '@/context/useAuth';
import {
  api,
  SUPPORTED_CURRENCIES,
  type Balance,
  type Expense,
  type Friend,
  type Group,
  type Settlement,
  type SupportedCurrency,
} from '@/lib/api';
import { buildIsoDate, formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme/tokens';

type MobileManualSplitEntry = {
  user_id: string;
  name: string;
  amount: string;
};

function createManualSplitDraft(group: Group, amount = ''): MobileManualSplitEntry[] {
  return group.members.map((member) => ({
    user_id: member.user.id,
    name: member.user.name,
    amount,
  }));
}

function inferSplitType(expense: Expense, memberCount: number) {
  const splits = expense.splits ?? [];

  if (splits.length !== memberCount || splits.length === 0) {
    return 'manual' as const;
  }

  const firstAmount = Number(splits[0].amount_owed);
  const allEqual = splits.every(
    (split) => Math.abs(Number(split.amount_owed) - firstAmount) < 0.001,
  );

  return allEqual ? ('equal' as const) : ('manual' as const);
}

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [memberUsername, setMemberUsername] = useState('');
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    currency: 'CAD' as SupportedCurrency,
    split_type: 'equal' as 'equal' | 'manual',
    manual_splits: [] as MobileManualSplitEntry[],
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [error, setError] = useState('');

  const group = useMemo(() => groups.find((entry) => entry.id === groupId), [groupId, groups]);

  useEffect(() => {
    if (!groupId) {
      setError('Group not found');
      setIsLoading(false);
      return;
    }

    void loadGroupDetail(groupId);
  }, [groupId]);

  useEffect(() => {
    if (!group) {
      return;
    }

    setExpenseForm((current) => ({
      ...current,
      manual_splits: createManualSplitDraft(group),
    }));
  }, [group]);

  useEffect(() => {
    setExpenseForm((current) => ({
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

  const availableFriends = useMemo(() => {
    if (!group) {
      return [];
    }

    const memberIds = new Set(group.members.map((member) => member.user.id));
    return friends.filter((friend) => !memberIds.has(friend.id));
  }, [friends, group]);

  async function loadGroupDetail(activeGroupId: string) {
    setIsLoading(true);
    setError('');

    try {
      const [groupList, friendList, groupExpenses, groupBalances, groupSettlements] = await Promise.all([
        api.getGroups(),
        api.getFriends(),
        api.getGroupExpenses(activeGroupId),
        api.getGroupBalances(activeGroupId),
        api.getGroupSettlements(activeGroupId),
      ]);
      setGroups(groupList);
      setFriends(friendList);
      setExpenses(groupExpenses);
      setBalances(groupBalances);
      setSettlements(groupSettlements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load group details');
    } finally {
      setIsLoading(false);
    }
  }

  async function addMemberByUsername(username: string) {
    if (!groupId || !username.trim()) {
      setError('Member username is required');
      return;
    }

    setIsAddingMember(true);
    setError('');

    try {
      await api.addGroupMember(groupId, { username: username.trim().toLowerCase() });
      setMemberUsername('');
      await loadGroupDetail(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add member');
    } finally {
      setIsAddingMember(false);
    }
  }

  function updateManualSplit(userId: string, amount: string) {
    setExpenseForm((current) => ({
      ...current,
      manual_splits: current.manual_splits.map((split) =>
        split.user_id === userId ? { ...split, amount } : split,
      ),
    }));
  }

  async function handleAddExpense() {
    if (!groupId || !group) {
      setError('Group not found');
      return;
    }

    const amount = Number(expenseForm.amount);
    if (!expenseForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }

    const manualSplits =
      expenseForm.split_type === 'manual'
        ? expenseForm.manual_splits.map((split) => ({
            user_id: split.user_id,
            amount_owed: Number(split.amount),
          }))
        : [];

    if (
      expenseForm.split_type === 'manual' &&
      manualSplits.some((split) => !Number.isFinite(split.amount_owed) || split.amount_owed < 0)
    ) {
      setError('Manual split amounts must be zero or greater');
      return;
    }

    if (
      expenseForm.split_type === 'manual' &&
      Math.abs(manualSplits.reduce((sum, split) => sum + split.amount_owed, 0) - amount) > 0.009
    ) {
      setError('Manual split amounts must add up to the full expense total');
      return;
    }

    setIsAddingExpense(true);
    setError('');

    try {
      await api.addExpense({
        group_id: groupId,
        description: expenseForm.description.trim(),
        amount,
        currency: expenseForm.currency,
        note: expenseForm.note.trim(),
        incurred_on: buildIsoDate(expenseForm.incurred_on),
        split_type: expenseForm.split_type,
        splits: expenseForm.split_type === 'manual' ? manualSplits : undefined,
      });

      setExpenseForm({
        description: '',
        amount: '',
        currency: (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD',
        split_type: 'equal',
        manual_splits: createManualSplitDraft(group),
        note: '',
        incurred_on: new Date().toISOString().slice(0, 10),
      });
      setShowAddExpenseForm(false);
      await loadGroupDetail(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  }

  if (isLoading) {
    return (
      <AppScreen>
        <SurfaceCard>
          <Text style={styles.helper}>Loading group details...</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  if (!group) {
    return (
      <AppScreen>
        {error ? <NoticeText tone="error" message={error} /> : null}
        <SurfaceCard>
          <Text style={styles.helper}>We could not find that group.</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {error ? <NoticeText tone="error" message={error} /> : null}

      <SurfaceCard>
        <Text style={styles.heroTitle}>{group.name}</Text>
        <Text style={styles.heroMeta}>{group.members.length} members</Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={showAddExpenseForm ? 'Close form' : 'Add expense'}
            onPress={() => setShowAddExpenseForm((current) => !current)}
          />
        </View>
      </SurfaceCard>

      {showAddExpenseForm ? (
        <SurfaceCard>
          <Text style={styles.sectionTitle}>Add group expense</Text>
          <View style={styles.form}>
            <FormField
              label="Description"
              value={expenseForm.description}
              onChangeText={(value) => setExpenseForm((current) => ({ ...current, description: value }))}
              placeholder="Groceries"
            />
            <FormField
              label="Amount"
              value={expenseForm.amount}
              onChangeText={(value) => setExpenseForm((current) => ({ ...current, amount: value }))}
              keyboardType="decimal-pad"
              placeholder="200"
            />
            <FormField
              label="Currency"
              value={expenseForm.currency}
              onChangeText={(value) =>
                setExpenseForm((current) => ({
                  ...current,
                  currency: (value.toUpperCase() as SupportedCurrency) || current.currency,
                }))
              }
              hint={`Supported: ${SUPPORTED_CURRENCIES.join(', ')}`}
            />
            <FormField
              label="Date"
              value={expenseForm.incurred_on}
              onChangeText={(value) => setExpenseForm((current) => ({ ...current, incurred_on: value }))}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label="Split type"
              value={expenseForm.split_type}
              onChangeText={(value) =>
                setExpenseForm((current) => ({
                  ...current,
                  split_type: value === 'manual' ? 'manual' : 'equal',
                }))
              }
              hint="Use equal or manual"
            />
            {expenseForm.split_type === 'manual' ? (
              <View style={styles.manualWrap}>
                {expenseForm.manual_splits.map((split) => (
                  <FormField
                    key={split.user_id}
                    label={split.name}
                    value={split.amount}
                    onChangeText={(value) => updateManualSplit(split.user_id, value)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                ))}
              </View>
            ) : null}
            <FormField
              label="Optional note"
              value={expenseForm.note}
              onChangeText={(value) => setExpenseForm((current) => ({ ...current, note: value }))}
              placeholder="Anything helpful to remember later"
            />
            <PrimaryButton
              label={isAddingExpense ? 'Saving expense...' : 'Save expense'}
              onPress={() => void handleAddExpense()}
              loading={isAddingExpense}
            />
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Members</Text>
        <View style={styles.list}>
          {availableFriends.slice(0, 5).map((friend) => (
            <View key={friend.id} style={styles.memberSuggestion}>
              <View>
                <Text style={styles.listTitle}>{friend.name}</Text>
                <Text style={styles.listMeta}>@{friend.username}</Text>
              </View>
              <PrimaryButton
                label="Add"
                tone="ghost"
                onPress={() => void addMemberByUsername(friend.username)}
                disabled={isAddingMember}
              />
            </View>
          ))}
          <FormField
            label="Add by username"
            value={memberUsername}
            onChangeText={setMemberUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="friend_username"
          />
          <PrimaryButton
            label={isAddingMember ? 'Adding member...' : 'Add member'}
            onPress={() => void addMemberByUsername(memberUsername)}
            loading={isAddingMember}
          />
          {group.members.map((member) => (
            <View key={member.user.id} style={styles.listCard}>
              <Text style={styles.listTitle}>
                {member.user.name}
                {member.user.id === user?.id ? ' (You)' : ''}
              </Text>
              <Text style={styles.listMeta}>@{member.user.username}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Balances</Text>
        <View style={styles.list}>
          {balances.length === 0 ? (
            <Text style={styles.helper}>No balances yet.</Text>
          ) : (
            balances.map((entry) => (
              <View key={entry.user.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{entry.user.name}</Text>
                <Text style={styles.listMeta}>@{entry.user.username}</Text>
                <Text
                  style={[
                    styles.listAmount,
                    entry.balance > 0
                      ? styles.positive
                      : entry.balance < 0
                        ? styles.negative
                        : styles.neutral,
                  ]}
                >
                  {formatMoney(Math.abs(entry.balance), 'CAD')}
                </Text>
              </View>
            ))
          )}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Settle up</Text>
        <View style={styles.list}>
          {settlements.length === 0 ? (
            <Text style={styles.helper}>Everyone is settled right now.</Text>
          ) : (
            settlements.map((settlement, index) => (
              <View key={`${settlement.from.id}-${settlement.to.id}-${index}`} style={styles.listCard}>
                <Text style={styles.listMeta}>
                  {settlement.from.name} pays {settlement.to.name}
                </Text>
                <Text style={styles.listAmount}>{formatMoney(settlement.amount, 'CAD')}</Text>
              </View>
            ))
          )}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.list}>
          {sortedExpenses.length === 0 ? (
            <Text style={styles.helper}>No expenses added yet.</Text>
          ) : (
            sortedExpenses.map((expense) => (
              <View key={expense.id} style={styles.listCard}>
                <Text style={styles.listTitle}>{expense.description}</Text>
                <Text style={styles.listMeta}>
                  Paid by {expense.payer.name} on {new Date(expense.incurred_on).toLocaleDateString()}
                </Text>
                <Text style={styles.listAmount}>
                  {formatMoney(Number(expense.amount), expense.currency)}
                </Text>
                {expense.note ? <Text style={styles.listNote}>{expense.note}</Text> : null}
                {expense.splits?.length ? (
                  <Text style={styles.listMeta}>
                    {inferSplitType(expense, group.members.length) === 'equal'
                      ? 'Equal split'
                      : 'Manual split'}
                  </Text>
                ) : null}
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
  manualWrap: {
    gap: spacing.sm,
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
  memberSuggestion: {
    borderRadius: 18,
    backgroundColor: '#f7f8f4',
    padding: spacing.md,
    gap: spacing.sm,
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
  listNote: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
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
});
