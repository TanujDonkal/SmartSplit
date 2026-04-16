import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  type FriendExpense,
  type FriendSummary,
  type SupportedCurrency,
} from '@/lib/api';
import { buildIsoDate, formatMoney, toDateInputValue } from '@/lib/format';
import { pickReceiptImage } from '@/lib/receipt';
import { colors, spacing } from '@/theme/tokens';

type FriendExpenseOption =
  | 'you_paid_equal'
  | 'friend_paid_equal'
  | 'you_paid_full'
  | 'friend_paid_full';

type ExpenseFormState = {
  description: string;
  amount: string;
  currency: SupportedCurrency;
  option: FriendExpenseOption;
  note: string;
  incurred_on: string;
  receipt_data: string;
  receipt_storage_key: string | null;
};

function buildInitialForm(defaultCurrency: SupportedCurrency): ExpenseFormState {
  return {
    description: '',
    amount: '',
    currency: defaultCurrency,
    option: 'you_paid_equal',
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
    receipt_storage_key: null,
  };
}

function getOptionFromExpense(
  expense: FriendExpense,
  userId: string | undefined,
): FriendExpenseOption {
  const paidByMe = expense.payer.id === userId;

  if (expense.split_type === 'FULL_AMOUNT') {
    return paidByMe ? 'you_paid_full' : 'friend_paid_full';
  }

  return paidByMe ? 'you_paid_equal' : 'friend_paid_equal';
}

const FRIEND_SPLIT_OPTIONS: Array<{ label: string; value: FriendExpenseOption }> = [
  { label: 'You paid, split equally', value: 'you_paid_equal' },
  { label: 'Friend paid, split equally', value: 'friend_paid_equal' },
  { label: 'You paid, friend owes full amount', value: 'you_paid_full' },
  { label: 'Friend paid, you owe full amount', value: 'friend_paid_full' },
];

export default function FriendDetailScreen() {
  const params = useLocalSearchParams<{ friendId: string; compose?: string; composeKey?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const friendId = Array.isArray(params.friendId) ? params.friendId[0] : params.friendId;
  const defaultCurrency = (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD';

  const [summary, setSummary] = useState<FriendSummary | null>(null);
  const [expenses, setExpenses] = useState<FriendExpense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<FriendExpense | null>(null);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [form, setForm] = useState<ExpenseFormState>(buildInitialForm(defaultCurrency));
  const [detailForm, setDetailForm] = useState<ExpenseFormState>(buildInitialForm(defaultCurrency));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettlingUp, setIsSettlingUp] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [isParsingDetailReceipt, setIsParsingDetailReceipt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
    setForm((current) => ({ ...current, currency: defaultCurrency }));
  }, [defaultCurrency]);

  useEffect(() => {
    if (!selectedExpense) {
      return;
    }

    setDetailForm({
      description: selectedExpense.description,
      amount: String(Number(selectedExpense.amount).toFixed(2)),
      currency: selectedExpense.currency,
      option: getOptionFromExpense(selectedExpense, user?.id),
      note: selectedExpense.note ?? '',
      incurred_on: toDateInputValue(selectedExpense.incurred_on),
      receipt_data: selectedExpense.receipt_data ?? '',
      receipt_storage_key: selectedExpense.receipt_storage_key ?? null,
    });
    setCommentBody('');
  }, [selectedExpense, user?.id]);

  useEffect(() => {
    if (params.compose !== 'expense') {
      return;
    }

    setSelectedExpense(null);
    setShowAddExpenseForm(true);
  }, [params.compose, params.composeKey]);

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

  async function openExpenseDetail(expenseId: string) {
    if (!friendId) {
      return;
    }

    try {
      const detail = await api.getFriendExpenseDetail(friendId, expenseId);
      setSelectedExpense(detail);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load expense details');
    }
  }

  async function handlePickReceipt(mode: 'create' | 'edit') {
    try {
      const data = await pickReceiptImage();
      if (!data) {
        return;
      }

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

    if (mode === 'create') {
      setIsParsingReceipt(true);
    } else {
      setIsParsingDetailReceipt(true);
    }
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

      if (mode === 'create') {
        setForm((current) => applyParsed(current));
      } else {
        setDetailForm((current) => applyParsed(current));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse receipt');
    } finally {
      if (mode === 'create') {
        setIsParsingReceipt(false);
      } else {
        setIsParsingDetailReceipt(false);
      }
    }
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
        receipt_data: form.receipt_data || undefined,
        receipt_storage_key: form.receipt_storage_key || undefined,
        incurred_on: buildIsoDate(form.incurred_on),
        ...payloadByOption(form.option),
      });

      setForm(buildInitialForm(defaultCurrency));
      setShowAddExpenseForm(false);
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateExpense() {
    if (!friendId || !selectedExpense) {
      return;
    }

    const amount = Number(detailForm.amount);
    if (!detailForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }

    setIsUpdatingExpense(true);
    setError('');

    try {
      const updated = await api.updateFriendExpense(friendId, selectedExpense.id, {
        description: detailForm.description.trim(),
        amount,
        currency: detailForm.currency,
        note: detailForm.note.trim(),
        receipt_data: detailForm.receipt_data || null,
        receipt_storage_key: detailForm.receipt_storage_key || null,
        incurred_on: buildIsoDate(detailForm.incurred_on),
        ...payloadByOption(detailForm.option),
      });
      setSelectedExpense(updated);
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update expense');
    } finally {
      setIsUpdatingExpense(false);
    }
  }

  async function handleDeleteExpense() {
    if (!friendId || !selectedExpense) {
      return;
    }

    setIsDeletingExpense(true);
    setError('');

    try {
      await api.deleteFriendExpense(friendId, selectedExpense.id);
      setSelectedExpense(null);
      setCommentBody('');
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete expense');
    } finally {
      setIsDeletingExpense(false);
    }
  }

  async function handlePostComment() {
    if (!friendId || !selectedExpense || !commentBody.trim()) {
      return;
    }

    setIsPostingComment(true);
    setError('');

    try {
      const comment = await api.addFriendExpenseComment(friendId, selectedExpense.id, {
        body: commentBody.trim(),
      });
      setSelectedExpense((current) =>
        current
          ? {
              ...current,
              comments: [...(current.comments ?? []), comment],
            }
          : current,
      );
      setCommentBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post comment');
    } finally {
      setIsPostingComment(false);
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
      Alert.alert('Settled up!', `You and ${summary?.friend.name} are now settled up.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to settle up');
    } finally {
      setIsSettlingUp(false);
    }
  }

  async function handleRefresh() {
    if (!friendId) return;
    setRefreshing(true);
    await loadFriendDetail(friendId);
    setRefreshing(false);
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
      <AppScreen safeTop={false}>
        <SurfaceCard>
          <Text style={styles.helper}>Loading friend details...</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  if (!summary) {
    return (
      <AppScreen safeTop={false}>
        {error ? <NoticeText tone="error" message={error} /> : null}
        <SurfaceCard>
          <Text style={styles.helper}>We could not find that friend.</Text>
        </SurfaceCard>
      </AppScreen>
    );
  }

  const selectedIsSettlement = selectedExpense?.activity_type === 'SETTLEMENT';

  return (
    <AppScreen safeTop={false} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />
    }>
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
            onPress={() => {
              setShowAddExpenseForm((current) => {
                const next = !current;
                if (!next) {
                  router.setParams({ compose: undefined, composeKey: undefined });
                }
                return next;
              });
            }}
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
            <SelectField
              label="Currency"
              value={form.currency}
              options={SUPPORTED_CURRENCIES.map((c) => ({ label: c, value: c }))}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  currency: value as SupportedCurrency,
                }))
              }
            />
            <FormField
              label="Date"
              value={form.incurred_on}
              onChangeText={(value) => setForm((current) => ({ ...current, incurred_on: value }))}
              placeholder="YYYY-MM-DD"
            />
            <SelectField
              label="How should this split work?"
              value={form.option}
              options={FRIEND_SPLIT_OPTIONS}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  option: value as FriendExpenseOption,
                }))
              }
            />
            <FormField
              label="Optional note"
              value={form.note}
              onChangeText={(value) => setForm((current) => ({ ...current, note: value }))}
              placeholder="Anything helpful to remember later"
            />

            <View style={styles.receiptActions}>
              <PrimaryButton
                label={form.receipt_data ? 'Replace receipt' : 'Upload receipt'}
                tone="ghost"
                onPress={() => void handlePickReceipt('create')}
              />
              <PrimaryButton
                label={isParsingReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'}
                onPress={() => void handleParseReceipt('create')}
                loading={isParsingReceipt}
                disabled={!form.receipt_data}
              />
            </View>
            {form.receipt_data ? (
              <Image source={{ uri: form.receipt_data }} style={styles.receiptImage} />
            ) : null}

            <PrimaryButton
              label={isSaving ? 'Saving expense...' : 'Save expense'}
              onPress={() => void handleAddExpense()}
              loading={isSaving}
            />
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
            {selectedExpense.activity_type === 'SETTLEMENT'
              ? 'Settlement'
              : `${selectedExpense.payer.name} paid on ${new Date(selectedExpense.incurred_on).toLocaleDateString()}`}
          </Text>
          <Text style={styles.listSummary}>{getExpenseSummary(selectedExpense)}</Text>

          {selectedIsSettlement ? (
            <Text style={styles.helper}>Settlement entries are read-only in mobile right now.</Text>
          ) : (
            <View style={styles.form}>
              <FormField
                label="Description"
                value={detailForm.description}
                onChangeText={(value) => setDetailForm((current) => ({ ...current, description: value }))}
              />
              <FormField
                label="Amount"
                value={detailForm.amount}
                onChangeText={(value) => setDetailForm((current) => ({ ...current, amount: value }))}
                keyboardType="decimal-pad"
              />
              <SelectField
                label="Currency"
                value={detailForm.currency}
                options={SUPPORTED_CURRENCIES.map((c) => ({ label: c, value: c }))}
                onChange={(value) =>
                  setDetailForm((current) => ({
                    ...current,
                    currency: value as SupportedCurrency,
                  }))
                }
              />
              <FormField
                label="Date"
                value={detailForm.incurred_on}
                onChangeText={(value) => setDetailForm((current) => ({ ...current, incurred_on: value }))}
              />
              <SelectField
                label="How should this split work?"
                value={detailForm.option}
                options={FRIEND_SPLIT_OPTIONS}
                onChange={(value) =>
                  setDetailForm((current) => ({
                    ...current,
                    option: value as FriendExpenseOption,
                  }))
                }
              />
              <FormField
                label="Optional note"
                value={detailForm.note}
                onChangeText={(value) => setDetailForm((current) => ({ ...current, note: value }))}
              />

              <View style={styles.receiptActions}>
                <PrimaryButton
                  label={detailForm.receipt_data ? 'Replace receipt' : 'Upload receipt'}
                  tone="ghost"
                  onPress={() => void handlePickReceipt('edit')}
                />
                <PrimaryButton
                  label={isParsingDetailReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'}
                  onPress={() => void handleParseReceipt('edit')}
                  loading={isParsingDetailReceipt}
                  disabled={!detailForm.receipt_data}
                />
              </View>
              {detailForm.receipt_data ? (
                <Image source={{ uri: detailForm.receipt_data }} style={styles.receiptImage} />
              ) : null}

              <PrimaryButton
                label={isUpdatingExpense ? 'Saving changes...' : 'Save changes'}
                onPress={() => void handleUpdateExpense()}
                loading={isUpdatingExpense}
              />
              <PrimaryButton
                label={isDeletingExpense ? 'Deleting expense...' : 'Delete expense'}
                tone="danger"
                onPress={() => void handleDeleteExpense()}
                loading={isDeletingExpense}
              />
            </View>
          )}

          <View style={styles.commentsWrap}>
            <Text style={styles.commentsTitle}>Comments</Text>
            {(selectedExpense.comments ?? []).length === 0 ? (
              <Text style={styles.helper}>No comments yet on this expense.</Text>
            ) : (
              (selectedExpense.comments ?? []).map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                  <Text style={styles.commentMeta}>
                    {new Date(comment.created_at).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
            <FormField
              label="Add comment"
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder="Write something helpful"
            />
            <PrimaryButton
              label={isPostingComment ? 'Posting comment...' : 'Post comment'}
              onPress={() => void handlePostComment()}
              loading={isPostingComment}
              disabled={!commentBody.trim()}
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
                <View style={styles.listCardHeader}>
                  <Pressable style={{ flex: 1 }} onPress={() => void openExpenseDetail(expense.id)}>
                    <Text style={styles.listTitle}>{expense.description}</Text>
                  </Pressable>
                  <View style={styles.listCardIcons}>
                    <Pressable hitSlop={8} onPress={() => void openExpenseDetail(expense.id)}>
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => {
                      Alert.alert('Delete expense', `Delete "${expense.description}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => {
                          void (async () => {
                            try {
                              await api.deleteFriendExpense(friendId!, expense.id);
                              await loadFriendDetail(friendId!);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Unable to delete');
                            }
                          })();
                        }},
                      ]);
                    }}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.listMeta}>
                  {expense.activity_type === 'SETTLEMENT' ? 'Settlement' : `${expense.payer.name} paid`} on{' '}
                  {new Date(expense.incurred_on).toLocaleDateString()}
                </Text>
                <Text style={styles.listAmount}>
                  {formatMoney(Number(expense.amount), expense.currency)}
                </Text>
                <Text style={styles.listSummary}>{getExpenseSummary(expense)}</Text>
                {expense.note ? <Text style={styles.listNote}>{expense.note}</Text> : null}
                {expense.receipt_data ? (
                  <Text style={styles.receiptTag}>Receipt attached</Text>
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
  receiptActions: {
    gap: spacing.sm,
  },
  receiptImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
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
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listCardIcons: {
    flexDirection: 'row',
    gap: spacing.md,
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
  receiptTag: {
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dismiss: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  commentsWrap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  commentCard: {
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  commentMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
