import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { FormField } from '@/components/FormField';
import { NoticeText } from '@/components/NoticeText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SelectField } from '@/components/SelectField';
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
import { buildIsoDate, formatMoney, toDateInputValue } from '@/lib/format';
import { pickReceiptImage } from '@/lib/receipt';
import { colors, spacing } from '@/theme/tokens';

type SplitEntry = { user_id: string; name: string; amount: string };
type ExpenseFormState = {
  description: string;
  amount: string;
  currency: SupportedCurrency;
  split_type: 'equal' | 'manual';
  manual_splits: SplitEntry[];
  note: string;
  incurred_on: string;
  receipt_data: string;
  receipt_storage_key: string | null;
};

function makeForm(currency: SupportedCurrency): ExpenseFormState {
  return {
    description: '',
    amount: '',
    currency,
    split_type: 'equal',
    manual_splits: [],
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
    receipt_storage_key: null,
  };
}

function splitDraft(group: Group, expense?: Expense): SplitEntry[] {
  return group.members.map((member) => {
    const match = expense?.splits?.find((split) => split.user.id === member.user.id);
    return {
      user_id: member.user.id,
      name: member.user.name,
      amount: match ? Number(match.amount_owed).toFixed(2) : '',
    };
  });
}

function inferSplitType(expense: Expense, count: number) {
  const splits = expense.splits ?? [];
  if (splits.length !== count || splits.length === 0) return 'manual' as const;
  const first = Number(splits[0].amount_owed);
  return splits.every((split) => Math.abs(Number(split.amount_owed) - first) < 0.001)
    ? ('equal' as const)
    : ('manual' as const);
}

const GROUP_SPLIT_OPTIONS: Array<{ label: string; value: 'equal' | 'manual' }> = [
  { label: 'Split equally across the group', value: 'equal' },
  { label: 'Set manual amounts for each member', value: 'manual' },
];

export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const defaultCurrency = (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD';

  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [memberUsername, setMemberUsername] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(makeForm(defaultCurrency));
  const [detailForm, setDetailForm] = useState<ExpenseFormState>(makeForm(defaultCurrency));
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [isParsingDetailReceipt, setIsParsingDetailReceipt] = useState(false);
  const [error, setError] = useState('');

  const group = useMemo(() => groups.find((entry) => entry.id === groupId), [groupId, groups]);
  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.incurred_on).getTime() - new Date(a.incurred_on).getTime()),
    [expenses],
  );
  const availableFriends = useMemo(() => {
    if (!group) return [];
    const ids = new Set(group.members.map((member) => member.user.id));
    return friends.filter((friend) => !ids.has(friend.id));
  }, [friends, group]);

  useEffect(() => {
    if (!groupId) {
      setError('Group not found');
      setIsLoading(false);
      return;
    }
    void loadGroupDetail(groupId);
  }, [groupId]);

  useEffect(() => {
    setForm((current) => ({ ...current, currency: defaultCurrency }));
  }, [defaultCurrency]);

  useEffect(() => {
    if (!group) return;
    setForm((current) => ({ ...current, manual_splits: splitDraft(group) }));
  }, [group]);

  useEffect(() => {
    if (!selectedExpense || !group) return;
    setDetailForm({
      description: selectedExpense.description,
      amount: String(Number(selectedExpense.amount).toFixed(2)),
      currency: selectedExpense.currency,
      split_type: inferSplitType(selectedExpense, group.members.length),
      manual_splits: splitDraft(group, selectedExpense),
      note: selectedExpense.note ?? '',
      incurred_on: toDateInputValue(selectedExpense.incurred_on),
      receipt_data: selectedExpense.receipt_data ?? '',
      receipt_storage_key: selectedExpense.receipt_storage_key ?? null,
    });
    setCommentBody('');
  }, [group, selectedExpense]);

  async function loadGroupDetail(id: string) {
    setIsLoading(true);
    setError('');
    try {
      const [groupList, friendList, groupExpenses, groupBalances, groupSettlements] = await Promise.all([
        api.getGroups(),
        api.getFriends(),
        api.getGroupExpenses(id),
        api.getGroupBalances(id),
        api.getGroupSettlements(id),
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

  function updateCreateSplit(userId: string, amount: string) {
    setForm((current) => ({
      ...current,
      manual_splits: current.manual_splits.map((split) =>
        split.user_id === userId ? { ...split, amount } : split,
      ),
    }));
  }

  function updateDetailSplit(userId: string, amount: string) {
    setDetailForm((current) => ({
      ...current,
      manual_splits: current.manual_splits.map((split) =>
        split.user_id === userId ? { ...split, amount } : split,
      ),
    }));
  }

  function validateManual(state: ExpenseFormState, amount: number) {
    if (state.split_type !== 'manual') return null;
    const parsed = state.manual_splits.map((split) => Number(split.amount));
    if (parsed.some((entry) => !Number.isFinite(entry) || entry < 0)) {
      return 'Manual split amounts must be zero or greater';
    }
    if (Math.abs(parsed.reduce((sum, entry) => sum + entry, 0) - amount) > 0.009) {
      return 'Manual split amounts must add up to the full expense total';
    }
    return null;
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

  async function openExpenseDetail(expenseId: string) {
    try {
      const detail = await api.getExpenseDetail(expenseId);
      setSelectedExpense(detail);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load expense details');
    }
  }

  async function handlePickReceipt(mode: 'create' | 'edit') {
    try {
      const data = await pickReceiptImage();
      if (!data) return;
      if (mode === 'create') {
        setForm((current) => ({ ...current, receipt_data: data, receipt_storage_key: null }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: data, receipt_storage_key: null }));
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load receipt image');
    }
  }

  async function handleParseReceipt(mode: 'create' | 'edit') {
    const target = mode === 'create' ? form : detailForm;
    if (!target.receipt_data) {
      setError('Upload a receipt first');
      return;
    }
    if (mode === 'create') setIsParsingReceipt(true);
    else setIsParsingDetailReceipt(true);
    setError('');
    try {
      const result = await api.parseReceipt({
        receipt_data: target.receipt_data,
        existing_receipt_storage_key: target.receipt_storage_key,
      });
      const applyParsed = (current: ExpenseFormState): ExpenseFormState => ({
        ...current,
        receipt_data: result.receipt_data,
        receipt_storage_key: result.receipt_storage_key ?? null,
        description: result.parsed.description || current.description,
        amount:
          result.parsed.amount !== null ? String(result.parsed.amount.toFixed(2)) : current.amount,
        currency: result.parsed.currency ?? current.currency,
        incurred_on: result.parsed.incurred_on
          ? toDateInputValue(result.parsed.incurred_on)
          : current.incurred_on,
        note: result.parsed.note ?? current.note,
      });
      if (mode === 'create') setForm((current) => applyParsed(current));
      else setDetailForm((current) => applyParsed(current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse receipt');
    } finally {
      if (mode === 'create') setIsParsingReceipt(false);
      else setIsParsingDetailReceipt(false);
    }
  }

  async function handleAddExpense() {
    if (!groupId || !group) {
      setError('Group not found');
      return;
    }
    const amount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }
    const manualError = validateManual(form, amount);
    if (manualError) {
      setError(manualError);
      return;
    }
    setIsAddingExpense(true);
    setError('');
    try {
      await api.addExpense({
        group_id: groupId,
        description: form.description.trim(),
        amount,
        currency: form.currency,
        note: form.note.trim(),
        receipt_data: form.receipt_data || undefined,
        receipt_storage_key: form.receipt_storage_key || undefined,
        incurred_on: buildIsoDate(form.incurred_on),
        split_type: form.split_type,
        splits:
          form.split_type === 'manual'
            ? form.manual_splits.map((split) => ({
                user_id: split.user_id,
                amount_owed: Number(split.amount),
              }))
            : undefined,
      });
      setForm({ ...makeForm(defaultCurrency), manual_splits: splitDraft(group) });
      setShowAddExpenseForm(false);
      await loadGroupDetail(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  }

  async function handleUpdateExpense() {
    if (!selectedExpense || !groupId) return;
    const amount = Number(detailForm.amount);
    if (!detailForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }
    const manualError = validateManual(detailForm, amount);
    if (manualError) {
      setError(manualError);
      return;
    }
    setIsUpdatingExpense(true);
    setError('');
    try {
      const updated = await api.updateExpense(selectedExpense.id, {
        description: detailForm.description.trim(),
        amount,
        currency: detailForm.currency,
        note: detailForm.note.trim(),
        receipt_data: detailForm.receipt_data || null,
        receipt_storage_key: detailForm.receipt_storage_key || null,
        incurred_on: buildIsoDate(detailForm.incurred_on),
        split_type: detailForm.split_type,
        splits:
          detailForm.split_type === 'manual'
            ? detailForm.manual_splits.map((split) => ({
                user_id: split.user_id,
                amount_owed: Number(split.amount),
              }))
            : undefined,
      });
      setSelectedExpense(updated);
      await loadGroupDetail(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update expense');
    } finally {
      setIsUpdatingExpense(false);
    }
  }

  async function handleDeleteExpense() {
    if (!selectedExpense || !groupId) return;
    setIsDeletingExpense(true);
    setError('');
    try {
      await api.deleteExpense(selectedExpense.id);
      setSelectedExpense(null);
      setCommentBody('');
      await loadGroupDetail(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete expense');
    } finally {
      setIsDeletingExpense(false);
    }
  }

  async function handlePostComment() {
    if (!selectedExpense || !commentBody.trim()) return;
    setIsPostingComment(true);
    setError('');
    try {
      const comment = await api.addExpenseComment(selectedExpense.id, {
        body: commentBody.trim(),
      });
      setSelectedExpense((current) =>
        current ? { ...current, comments: [...(current.comments ?? []), comment] } : current,
      );
      setCommentBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post comment');
    } finally {
      setIsPostingComment(false);
    }
  }

  if (isLoading) {
    return (
      <AppScreen safeTop={false}>
        <SurfaceCard>
          <Text style={styles.helper}>Loading group details...</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  if (!group) {
    return (
      <AppScreen safeTop={false}>
        {error ? <NoticeText tone="error" message={error} /> : null}
        <SurfaceCard>
          <Text style={styles.helper}>We could not find that group.</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen safeTop={false}>
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
            <FormField label="Description" value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} placeholder="Groceries" />
            <FormField label="Amount" value={form.amount} onChangeText={(value) => setForm((current) => ({ ...current, amount: value }))} keyboardType="decimal-pad" placeholder="200" />
            <FormField label="Currency" value={form.currency} onChangeText={(value) => setForm((current) => ({ ...current, currency: (value.toUpperCase() as SupportedCurrency) || current.currency }))} hint={`Supported: ${SUPPORTED_CURRENCIES.join(', ')}`} />
            <FormField label="Date" value={form.incurred_on} onChangeText={(value) => setForm((current) => ({ ...current, incurred_on: value }))} placeholder="YYYY-MM-DD" />
            <SelectField
              label="How should this split work?"
              value={form.split_type}
              options={GROUP_SPLIT_OPTIONS}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  split_type: value === 'manual' ? 'manual' : 'equal',
                }))
              }
            />
            {form.split_type === 'manual' ? (
              <View style={styles.manualWrap}>
                {form.manual_splits.map((split) => (
                  <FormField key={split.user_id} label={split.name} value={split.amount} onChangeText={(value) => updateCreateSplit(split.user_id, value)} keyboardType="decimal-pad" placeholder="0.00" />
                ))}
              </View>
            ) : null}
            <FormField label="Optional note" value={form.note} onChangeText={(value) => setForm((current) => ({ ...current, note: value }))} placeholder="Anything helpful to remember later" />
            <View style={styles.receiptActions}>
              <PrimaryButton label={form.receipt_data ? 'Replace receipt' : 'Upload receipt'} tone="ghost" onPress={() => void handlePickReceipt('create')} />
              <PrimaryButton label={isParsingReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'} onPress={() => void handleParseReceipt('create')} loading={isParsingReceipt} disabled={!form.receipt_data} />
            </View>
            {form.receipt_data ? <Image source={{ uri: form.receipt_data }} style={styles.receiptImage} /> : null}
            <PrimaryButton label={isAddingExpense ? 'Saving expense...' : 'Save expense'} onPress={() => void handleAddExpense()} loading={isAddingExpense} />
          </View>
        </SurfaceCard>
      ) : null}

      {selectedExpense ? (
        <SurfaceCard>
          <View style={styles.detailHeader}>
            <Text style={styles.sectionTitle}>Expense details</Text>
            <Pressable onPress={() => setSelectedExpense(null)}>
              <Text style={styles.dismiss}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.listTitle}>{selectedExpense.description}</Text>
          <Text style={styles.listMeta}>
            Paid by {selectedExpense.payer.name} on {new Date(selectedExpense.incurred_on).toLocaleDateString()}
          </Text>
          <View style={styles.form}>
            <FormField label="Description" value={detailForm.description} onChangeText={(value) => setDetailForm((current) => ({ ...current, description: value }))} />
            <FormField label="Amount" value={detailForm.amount} onChangeText={(value) => setDetailForm((current) => ({ ...current, amount: value }))} keyboardType="decimal-pad" />
            <FormField label="Currency" value={detailForm.currency} onChangeText={(value) => setDetailForm((current) => ({ ...current, currency: (value.toUpperCase() as SupportedCurrency) || current.currency }))} hint={`Supported: ${SUPPORTED_CURRENCIES.join(', ')}`} />
            <FormField label="Date" value={detailForm.incurred_on} onChangeText={(value) => setDetailForm((current) => ({ ...current, incurred_on: value }))} />
            <SelectField
              label="How should this split work?"
              value={detailForm.split_type}
              options={GROUP_SPLIT_OPTIONS}
              onChange={(value) =>
                setDetailForm((current) => ({
                  ...current,
                  split_type: value === 'manual' ? 'manual' : 'equal',
                }))
              }
            />
            {detailForm.split_type === 'manual' ? (
              <View style={styles.manualWrap}>
                {detailForm.manual_splits.map((split) => (
                  <FormField key={split.user_id} label={split.name} value={split.amount} onChangeText={(value) => updateDetailSplit(split.user_id, value)} keyboardType="decimal-pad" />
                ))}
              </View>
            ) : null}
            <FormField label="Optional note" value={detailForm.note} onChangeText={(value) => setDetailForm((current) => ({ ...current, note: value }))} />
            <View style={styles.receiptActions}>
              <PrimaryButton label={detailForm.receipt_data ? 'Replace receipt' : 'Upload receipt'} tone="ghost" onPress={() => void handlePickReceipt('edit')} />
              <PrimaryButton label={isParsingDetailReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'} onPress={() => void handleParseReceipt('edit')} loading={isParsingDetailReceipt} disabled={!detailForm.receipt_data} />
            </View>
            {detailForm.receipt_data ? <Image source={{ uri: detailForm.receipt_data }} style={styles.receiptImage} /> : null}
            <PrimaryButton label={isUpdatingExpense ? 'Saving changes...' : 'Save changes'} onPress={() => void handleUpdateExpense()} loading={isUpdatingExpense} />
            <PrimaryButton label={isDeletingExpense ? 'Deleting expense...' : 'Delete expense'} tone="danger" onPress={() => void handleDeleteExpense()} loading={isDeletingExpense} />
          </View>
          <View style={styles.commentsWrap}>
            <Text style={styles.commentsTitle}>Split</Text>
            {(selectedExpense.splits ?? []).map((split) => (
              <View key={split.id} style={styles.commentCard}>
                <Text style={styles.commentAuthor}>{split.user.name}</Text>
                <Text style={styles.commentBody}>Owes {formatMoney(Number(split.amount_owed), selectedExpense.currency)}</Text>
              </View>
            ))}
            <Text style={styles.commentsTitle}>Comments</Text>
            {(selectedExpense.comments ?? []).length === 0 ? (
              <Text style={styles.helper}>No comments yet on this expense.</Text>
            ) : (
              (selectedExpense.comments ?? []).map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                  <Text style={styles.commentMeta}>{new Date(comment.created_at).toLocaleString()}</Text>
                </View>
              ))
            )}
            <FormField label="Add comment" value={commentBody} onChangeText={setCommentBody} placeholder="Write something helpful" />
            <PrimaryButton label={isPostingComment ? 'Posting comment...' : 'Post comment'} onPress={() => void handlePostComment()} loading={isPostingComment} disabled={!commentBody.trim()} />
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
              <PrimaryButton label="Add" tone="ghost" onPress={() => void addMemberByUsername(friend.username)} disabled={isAddingMember} />
            </View>
          ))}
          <FormField label="Add by username" value={memberUsername} onChangeText={setMemberUsername} autoCapitalize="none" autoCorrect={false} placeholder="friend_username" />
          <PrimaryButton label={isAddingMember ? 'Adding member...' : 'Add member'} onPress={() => void addMemberByUsername(memberUsername)} loading={isAddingMember} />
          {group.members.map((member) => (
            <View key={member.user.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{member.user.name}{member.user.id === user?.id ? ' (You)' : ''}</Text>
              <Text style={styles.listMeta}>@{member.user.username}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Balances</Text>
        <View style={styles.list}>
          {balances.length === 0 ? <Text style={styles.helper}>No balances yet.</Text> : balances.map((entry) => (
            <View key={entry.user.id} style={styles.listCard}>
              <Text style={styles.listTitle}>{entry.user.name}</Text>
              <Text style={styles.listMeta}>@{entry.user.username}</Text>
              <Text style={[styles.listAmount, entry.balance > 0 ? styles.positive : entry.balance < 0 ? styles.negative : styles.neutral]}>{formatMoney(Math.abs(entry.balance), 'CAD')}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Settle up</Text>
        <View style={styles.list}>
          {settlements.length === 0 ? <Text style={styles.helper}>Everyone is settled right now.</Text> : settlements.map((settlement, index) => (
            <View key={`${settlement.from.id}-${settlement.to.id}-${index}`} style={styles.listCard}>
              <Text style={styles.listMeta}>{settlement.from.name} pays {settlement.to.name}</Text>
              <Text style={styles.listAmount}>{formatMoney(settlement.amount, 'CAD')}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.list}>
          {sortedExpenses.length === 0 ? <Text style={styles.helper}>No expenses added yet.</Text> : sortedExpenses.map((expense) => (
            <Pressable key={expense.id} style={styles.listCard} onPress={() => void openExpenseDetail(expense.id)}>
              <Text style={styles.listTitle}>{expense.description}</Text>
              <Text style={styles.listMeta}>Paid by {expense.payer.name} on {new Date(expense.incurred_on).toLocaleDateString()}</Text>
              <Text style={styles.listAmount}>{formatMoney(Number(expense.amount), expense.currency)}</Text>
              {expense.note ? <Text style={styles.listNote}>{expense.note}</Text> : null}
              <Text style={styles.listMeta}>{inferSplitType(expense, group.members.length) === 'equal' ? 'Equal split' : 'Manual split'}</Text>
              {expense.receipt_data ? <Text style={styles.receiptTag}>Receipt attached</Text> : null}
            </Pressable>
          ))}
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 14, lineHeight: 22, color: colors.textMuted },
  heroTitle: { fontSize: 30, fontWeight: '700', color: colors.text },
  heroMeta: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  form: { marginTop: spacing.md, gap: spacing.md },
  manualWrap: { gap: spacing.sm },
  list: { marginTop: spacing.md, gap: spacing.sm },
  listCard: { borderRadius: 18, backgroundColor: '#f7f8f4', padding: spacing.md },
  memberSuggestion: { borderRadius: 18, backgroundColor: '#f7f8f4', padding: spacing.md, gap: spacing.sm },
  listTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  listMeta: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  listAmount: { marginTop: spacing.sm, fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  listNote: { marginTop: spacing.xs, fontSize: 14, lineHeight: 22, color: colors.textMuted },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dismiss: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  receiptActions: { gap: spacing.sm },
  receiptImage: { width: '100%', height: 220, borderRadius: 18, backgroundColor: colors.surfaceMuted },
  commentsWrap: { marginTop: spacing.lg, gap: spacing.sm },
  commentsTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  commentCard: { borderRadius: 16, backgroundColor: colors.surfaceMuted, padding: spacing.md, gap: spacing.xs },
  commentAuthor: { fontSize: 14, fontWeight: '700', color: colors.text },
  commentBody: { fontSize: 14, lineHeight: 22, color: colors.text },
  commentMeta: { fontSize: 12, color: colors.textMuted },
  receiptTag: { marginTop: spacing.xs, fontSize: 12, fontWeight: '600', color: colors.secondary },
  positive: { color: colors.primaryDark },
  negative: { color: '#ff9630' },
  neutral: { color: colors.textMuted },
});
