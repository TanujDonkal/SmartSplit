import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, SUPPORTED_CURRENCIES } from '../api';
import type { Balance, Expense, Friend, Group, Settlement, SupportedCurrency } from '../api';
import { useAuth } from '../context/useAuth';

type ManualSplitEntry = {
  user_id: string;
  name: string;
  amount: string;
};

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function buildIsoDate(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Unable to read receipt image'));
    reader.readAsDataURL(file);
  });
}

function createManualSplitDraft(group: Group, amount = '') {
  return group.members.map((member) => ({
    user_id: member.user.id,
    name: member.user.name,
    amount,
  }));
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
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

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [memberUsername, setMemberUsername] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    currency: 'CAD' as SupportedCurrency,
    split_type: 'equal' as 'equal' | 'manual',
    manual_splits: [] as ManualSplitEntry[],
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
    receipt_storage_key: null as string | null,
  });
  const [detailForm, setDetailForm] = useState({
    description: '',
    amount: '',
    currency: 'CAD' as SupportedCurrency,
    split_type: 'equal' as 'equal' | 'manual',
    manual_splits: [] as ManualSplitEntry[],
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
    receipt_storage_key: null as string | null,
  });
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

  useEffect(() => {
    async function run() {
      if (!groupId) {
        setError('Group not found');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const [groupList, friendList, groupExpenses, groupBalances, groupSettlements] = await Promise.all([
          api.getGroups(),
          api.getFriends(),
          api.getGroupExpenses(groupId),
          api.getGroupBalances(groupId),
          api.getGroupSettlements(groupId),
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

    void run();
  }, [groupId]);

  useEffect(() => {
    if (!selectedExpense) {
      return;
    }

    const splitType = inferSplitType(selectedExpense, group?.members.length ?? 0);
    setDetailForm({
      description: selectedExpense.description,
      amount: String(Number(selectedExpense.amount).toFixed(2)),
      currency: selectedExpense.currency,
      split_type: splitType,
      manual_splits:
        group?.members.map((member) => {
          const existingSplit = selectedExpense.splits?.find(
            (split) => split.user.id === member.user.id,
          );

          return {
            user_id: member.user.id,
            name: member.user.name,
            amount: existingSplit ? Number(existingSplit.amount_owed).toFixed(2) : '0.00',
          };
        }) ?? [],
      note: selectedExpense.note ?? '',
      incurred_on: toDateInputValue(selectedExpense.incurred_on),
      receipt_data: selectedExpense.receipt_data ?? '',
      receipt_storage_key: selectedExpense.receipt_storage_key ?? null,
    });
    setCommentBody('');
  }, [group, selectedExpense]);

  useEffect(() => {
    if (!group) {
      return;
    }

    setExpenseForm((current) => {
      const currentIds = current.manual_splits.map((split) => split.user_id).join(',');
      const nextIds = group.members.map((member) => member.user.id).join(',');

      if (currentIds === nextIds && current.manual_splits.length === group.members.length) {
        return current;
      }

      return {
        ...current,
        manual_splits: createManualSplitDraft(group),
      };
    });
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

  const splitPreview = useMemo(() => {
    if (!group) {
      return 0;
    }

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0 || group.members.length === 0) {
      return 0;
    }

    return amount / group.members.length;
  }, [expenseForm.amount, group]);

  const manualSplitTotal = useMemo(
    () =>
      expenseForm.manual_splits.reduce((sum, split) => {
        const value = Number(split.amount);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [expenseForm.manual_splits],
  );

  const myBalance = useMemo(() => {
    const mine = balances.find((entry) => entry.user.id === user?.id);
    return mine?.balance ?? 0;
  }, [balances, user?.id]);

  const availableFriends = useMemo(() => {
    if (!group) {
      return [];
    }

    const memberIds = new Set(group.members.map((member) => member.user.id));
    return friends.filter((friend) => !memberIds.has(friend.id));
  }, [friends, group]);

  const owesCount = useMemo(() => balances.filter((entry) => entry.balance < -0.01).length, [balances]);
  const getsBackCount = useMemo(
    () => balances.filter((entry) => entry.balance > 0.01).length,
    [balances],
  );

  async function refreshGroupData(activeGroupId: string) {
    const [groupList, groupExpenses, groupBalances, groupSettlements] = await Promise.all([
      api.getGroups(),
      api.getGroupExpenses(activeGroupId),
      api.getGroupBalances(activeGroupId),
      api.getGroupSettlements(activeGroupId),
    ]);
    setGroups(groupList);
    setExpenses(groupExpenses);
    setBalances(groupBalances);
    setSettlements(groupSettlements);
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
      await refreshGroupData(groupId);
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

  async function handleReceiptChange(
    event: ChangeEvent<HTMLInputElement>,
    mode: 'create' | 'edit',
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      if (mode === 'create') {
        setExpenseForm((current) => ({ ...current, receipt_data: '', receipt_storage_key: null }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: '', receipt_storage_key: null }));
      }
      return;
    }

    try {
      const value = await readFileAsDataUrl(file);
      if (mode === 'create') {
        setExpenseForm((current) => ({ ...current, receipt_data: value, receipt_storage_key: null }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: value, receipt_storage_key: null }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load receipt image');
    }
  }

  async function handleParseReceipt(mode: 'create' | 'edit') {
    const target = mode === 'create' ? expenseForm : detailForm;

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

      const applyParsed = (current: typeof expenseForm) => ({
        ...current,
        receipt_data: result.receipt_data,
        receipt_storage_key: result.receipt_storage_key ?? null,
        description: result.parsed.description || current.description,
        amount:
          result.parsed.amount !== null ? String(result.parsed.amount.toFixed(2)) : current.amount,
        currency: result.parsed.currency ?? current.currency,
        incurred_on: result.parsed.incurred_on
          ? new Date(result.parsed.incurred_on).toISOString().slice(0, 10)
          : current.incurred_on,
        note: result.parsed.note ?? current.note,
      });

      if (mode === 'create') {
        setExpenseForm((current) => applyParsed(current));
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

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addMemberByUsername(memberUsername);
  }

  function updateCreateManualSplit(userId: string, amount: string) {
    setExpenseForm((current) => ({
      ...current,
      manual_splits: current.manual_splits.map((split) =>
        split.user_id === userId ? { ...split, amount } : split,
      ),
    }));
  }

  function updateDetailManualSplit(userId: string, amount: string) {
    setDetailForm((current) => ({
      ...current,
      manual_splits: current.manual_splits.map((split) =>
        split.user_id === userId ? { ...split, amount } : split,
      ),
    }));
  }

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupId) {
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
        receipt_data: expenseForm.receipt_data || undefined,
        receipt_storage_key: expenseForm.receipt_storage_key || undefined,
        incurred_on: buildIsoDate(expenseForm.incurred_on),
        split_type: expenseForm.split_type,
        splits: expenseForm.split_type === 'manual' ? manualSplits : undefined,
      });
      setExpenseForm({
        description: '',
        amount: '',
        currency: (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD',
        split_type: 'equal',
        manual_splits: group ? createManualSplitDraft(group) : [],
        note: '',
        incurred_on: new Date().toISOString().slice(0, 10),
        receipt_data: '',
        receipt_storage_key: null,
      });
      setShowAddExpenseForm(false);
      await refreshGroupData(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  }

  async function handleUpdateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExpense || !groupId) {
      return;
    }

    const amount = Number(detailForm.amount);
    if (!detailForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }

    const manualSplits =
      detailForm.split_type === 'manual'
        ? detailForm.manual_splits.map((split) => ({
            user_id: split.user_id,
            amount_owed: Number(split.amount),
          }))
        : [];

    if (
      detailForm.split_type === 'manual' &&
      manualSplits.some((split) => !Number.isFinite(split.amount_owed) || split.amount_owed < 0)
    ) {
      setError('Manual split amounts must be zero or greater');
      return;
    }

    if (
      detailForm.split_type === 'manual' &&
      Math.abs(manualSplits.reduce((sum, split) => sum + split.amount_owed, 0) - amount) > 0.009
    ) {
      setError('Manual split amounts must add up to the full expense total');
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
        splits: detailForm.split_type === 'manual' ? manualSplits : undefined,
      });
      setSelectedExpense(updated);
      await refreshGroupData(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update expense');
    } finally {
      setIsUpdatingExpense(false);
    }
  }

  async function handleDeleteExpense() {
    if (!selectedExpense || !groupId) {
      return;
    }

    const confirmed = window.confirm('Delete this expense? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setIsDeletingExpense(true);
    setError('');

    try {
      await api.deleteExpense(selectedExpense.id);
      setSelectedExpense(null);
      await refreshGroupData(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete expense');
    } finally {
      setIsDeletingExpense(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExpense || !commentBody.trim() || !groupId) {
      return;
    }

    setIsPostingComment(true);
    setError('');

    try {
      const comment = await api.addExpenseComment(selectedExpense.id, { body: commentBody.trim() });
      setSelectedExpense((current) =>
        current
          ? {
              ...current,
              comments: [...(current.comments ?? []), comment],
            }
          : current,
      );
      setCommentBody('');
      await refreshGroupData(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add comment');
    } finally {
      setIsPostingComment(false);
    }
  }

  if (isLoading) {
    return <div className="surface-card p-5 text-sm text-slate-600">Loading group details...</div>;
  }

  if (error && !group) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
          {error}
        </div>
        <Link className="text-sm font-semibold text-[#36b5ac]" to="/dashboard?tab=groups">
          Back to groups
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#ead7a8] bg-[#fff8e7] px-4 py-3 text-sm text-[#8c6a25]">
          We couldn't find that group.
        </div>
        <Link className="text-sm font-semibold text-[#36b5ac]" to="/dashboard?tab=groups">
          Back to groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-[1.8rem] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(31,41,55,0.05)]">
        <Link className="text-sm font-semibold text-[#36b5ac]" to="/dashboard?tab=groups">
          {'<'} Back to groups
        </Link>

        <div className="mt-4">
          <p className="text-sm text-slate-500">Group</p>
          <h1 className="mt-2 text-[2rem] font-semibold text-slate-900">{group.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {group.members.length} members • {expenses.length} expenses
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="soft-card p-4">
            <p className="text-sm text-slate-500">Your balance</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                myBalance > 0 ? 'text-[#36b5ac]' : myBalance < 0 ? 'text-[#ff9630]' : 'text-slate-700'
              }`}
            >
              {myBalance > 0 ? '+' : ''}
              {formatMoney(Math.abs(myBalance), 'CAD')}
            </p>
          </div>
          <div className="soft-card p-4">
            <p className="text-sm text-slate-500">Created</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {new Date(group.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="soft-card p-4">
            <p className="text-sm text-slate-500">People who owe</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{owesCount}</p>
          </div>
          <div className="soft-card p-4">
            <p className="text-sm text-slate-500">People getting back</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{getsBackCount}</p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
          {error}
        </div>
      ) : null}

      <section className="surface-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add expense</h2>
            <p className="mt-1 text-sm text-slate-500">
              Open the form only when you want to record a new group expense.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddExpenseForm((current) => !current)}
            className="outline-button px-4 py-3 text-sm"
          >
            {showAddExpenseForm ? 'Close form' : 'Add expense'}
          </button>
        </div>

        {showAddExpenseForm ? (
          <form className="mt-4 space-y-4" onSubmit={handleAddExpense}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">What was it for?</span>
              <input
                required
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Groceries"
                className="form-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Amount</span>
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                inputMode="decimal"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="94.50"
                className="form-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Currency</span>
              <select
                value={expenseForm.currency}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    currency: event.target.value as SupportedCurrency,
                  }))
                }
                className="form-input"
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Expense date</span>
              <input
                type="date"
                value={expenseForm.incurred_on}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, incurred_on: event.target.value }))
                }
                className="form-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Split type</span>
              <select
                value={expenseForm.split_type}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    split_type: event.target.value as 'equal' | 'manual',
                  }))
                }
                className="form-input"
              >
                <option value="equal">Split equally</option>
                <option value="manual">Manual split</option>
              </select>
            </label>

            {expenseForm.split_type === 'manual' ? (
              <div className="space-y-3 rounded-2xl bg-[#f7f8f4] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Manual split amounts</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter how much each member owes. The total must match the expense amount.
                  </p>
                </div>
                <div className="space-y-3">
                  {expenseForm.manual_splits.map((split) => (
                    <label key={split.user_id} className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-700">{split.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={split.amount}
                        onChange={(event) =>
                          updateCreateManualSplit(split.user_id, event.target.value)
                        }
                        className="form-input w-32"
                      />
                    </label>
                  ))}
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                  Manual total: {formatMoney(manualSplitTotal, expenseForm.currency)} / {formatMoney(Number(expenseForm.amount || 0), expenseForm.currency)}
                </div>
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Optional note</span>
              <textarea
                rows={3}
                value={expenseForm.note}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Anything important about this expense"
                className="form-input resize-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Optional receipt photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void handleReceiptChange(event, 'create')}
                className="form-input"
              />
            </label>

            {expenseForm.receipt_data ? (
              <div className="space-y-3">
                <img
                  src={expenseForm.receipt_data}
                  alt="Receipt preview"
                  className="h-40 w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleParseReceipt('create')}
                  disabled={isParsingReceipt}
                  className="outline-button w-full px-4 py-3 text-sm"
                >
                  {isParsingReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'}
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-[#eef8f7] px-3 py-2 font-medium text-[#2b938c]">
                Paid by you
              </span>
              <span className="rounded-full bg-[#f6f7f3] px-3 py-2 font-medium text-slate-600">
                {expenseForm.split_type === 'equal' ? 'Split equally' : 'Manual split'}
              </span>
            </div>

            <div className="rounded-2xl bg-[#eef8f7] px-4 py-3 text-sm text-[#2b938c]">
              {expenseForm.split_type === 'equal'
                ? `Split preview: ${group.members.length} member(s) would each owe ${formatMoney(splitPreview, expenseForm.currency)}.`
                : `Manual preview: total assigned is ${formatMoney(manualSplitTotal, expenseForm.currency)}.`}
            </div>
            <button type="submit" disabled={isAddingExpense} className="primary-button w-full px-4 py-4">
              {isAddingExpense ? 'Saving expense...' : 'Save expense'}
            </button>
          </form>
        ) : null}
      </section>

      <section className="surface-card p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Members</h2>
          <p className="mt-1 text-sm text-slate-500">Add signed-up friends quickly or invite by username.</p>
        </div>

        {availableFriends.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Quick add from your friends</p>
            <div className="space-y-2">
              {availableFriends.slice(0, 5).map((friend) => (
                <div key={friend.id} className="soft-card flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{friend.name}</p>
                    <p className="truncate text-sm text-slate-500">@{friend.username}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isAddingMember}
                    onClick={() => void addMemberByUsername(friend.username)}
                    className="rounded-xl border border-[#cfe7e3] px-3 py-2 text-sm font-semibold text-[#2b938c]"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={handleAddMember}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Add by username</span>
            <input
              required
              autoComplete="username"
              value={memberUsername}
              onChange={(event) => setMemberUsername(event.target.value)}
              placeholder="friend_username"
              className="form-input"
            />
          </label>
          <button type="submit" disabled={isAddingMember} className="outline-button w-full px-4 py-3">
            {isAddingMember ? 'Adding member...' : 'Add member'}
          </button>
          <p className="text-sm text-slate-500">
            The person must already be registered in SmartSplit before you can add them.
          </p>
        </form>

        <div className="mt-4 space-y-3">
          {group.members.map((member) => (
            <div key={member.user.id} className="soft-card flex items-center gap-3 p-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#eef8f7] text-sm font-semibold text-[#36b5ac]">
                {member.user.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {member.user.name}
                  {member.user.id === user?.id ? ' (You)' : ''}
                </p>
                <p className="truncate text-sm text-slate-500">@{member.user.username}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Balances</h2>
          <p className="mt-1 text-sm text-slate-500">See who owes and who gets back.</p>
        </div>

        {balances.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">No balances yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {balances.map((entry) => (
              <div key={entry.user.id} className="soft-card flex items-center justify-between p-3">
                <div>
                  <p className="font-semibold text-slate-900">{entry.user.name}</p>
                  <p className="text-sm text-slate-500">@{entry.user.username}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-semibold ${
                      entry.balance > 0
                        ? 'text-[#36b5ac]'
                        : entry.balance < 0
                          ? 'text-[#ff9630]'
                          : 'text-slate-700'
                    }`}
                  >
                    {entry.balance > 0 ? '+' : ''}
                    {formatMoney(Math.abs(entry.balance), 'CAD')}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {Math.abs(entry.balance) < 0.01 ? 'Settled' : entry.balance > 0 ? 'Gets back' : 'Owes'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Settle up</h2>
          <p className="mt-1 text-sm text-slate-500">Suggested payments for the fewest transfers.</p>
        </div>

        {settlements.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">Everyone is settled right now.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {settlements.map((settlement, index) => (
              <div key={`${settlement.from.id}-${settlement.to.id}-${index}`} className="soft-card p-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{settlement.from.name}</span> pays{' '}
                  <span className="font-semibold text-slate-900">{settlement.to.name}</span>
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#36b5ac]">{formatMoney(settlement.amount, 'CAD')}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Recent activity</h2>
          <p className="mt-1 text-sm text-slate-500">Tap any expense to see full details, notes, receipt, and comments.</p>
        </div>

        {sortedExpenses.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">No expenses added yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedExpenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => void openExpenseDetail(expense.id)}
                className="soft-card block w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{expense.description}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Paid by {expense.payer.name} on {new Date(expense.incurred_on).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#36b5ac]">
                      {formatMoney(Number(expense.amount), expense.currency)}
                    </p>
                    {expense.currency !== 'CAD' ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {formatMoney(Number(expense.converted_amount), 'CAD')}
                      </p>
                    ) : null}
                  </div>
                </div>

                {expense.note ? <p className="mt-2 text-sm text-slate-500 line-clamp-2">{expense.note}</p> : null}

                {expense.splits?.length ? (
                  <div className="mt-4 rounded-2xl bg-[#f6f7f3] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      {inferSplitType(expense, group.members.length) === 'equal' ? 'Equal split' : 'Manual split'}
                    </p>
                    <div className="mt-3 space-y-2">
                      {expense.splits.map((split) => (
                        <div key={split.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{split.user.name}</span>
                          <span className="font-semibold text-slate-900">
                            {formatMoney(Number(split.amount_owed), expense.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedExpense ? (
        <div className="fixed inset-0 z-40 bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-h-[calc(100vh-3rem)] w-full max-w-[34rem] overflow-y-auto rounded-[1.8rem] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Expense details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the amount, date, note, receipt, or comments for this group expense.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d8ddd9] bg-white text-lg text-slate-500"
              >
                x
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#f7f8f4] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Summary</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{selectedExpense.description}</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p>Amount: {formatMoney(Number(selectedExpense.amount), selectedExpense.currency)}</p>
                {selectedExpense.currency !== 'CAD' ? (
                  <p>Converted amount: {formatMoney(Number(selectedExpense.converted_amount), 'CAD')}</p>
                ) : null}
                <p>Paid by: {selectedExpense.payer.name}</p>
                <p>Occurred on: {new Date(selectedExpense.incurred_on).toLocaleString()}</p>
                <p>Created: {new Date(selectedExpense.created_at).toLocaleString()}</p>
                {selectedExpense.updated_at ? <p>Updated: {new Date(selectedExpense.updated_at).toLocaleString()}</p> : null}
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleUpdateExpense}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <input
                  required
                  value={detailForm.description}
                  onChange={(event) => setDetailForm((current) => ({ ...current, description: event.target.value }))}
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Amount</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={detailForm.amount}
                  onChange={(event) => setDetailForm((current) => ({ ...current, amount: event.target.value }))}
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Currency</span>
                <select
                  value={detailForm.currency}
                  onChange={(event) =>
                    setDetailForm((current) => ({
                      ...current,
                      currency: event.target.value as SupportedCurrency,
                    }))
                  }
                  className="form-input"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  value={detailForm.incurred_on}
                  onChange={(event) => setDetailForm((current) => ({ ...current, incurred_on: event.target.value }))}
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Split type</span>
                <select
                  value={detailForm.split_type}
                  onChange={(event) =>
                    setDetailForm((current) => ({
                      ...current,
                      split_type: event.target.value as 'equal' | 'manual',
                    }))
                  }
                  className="form-input"
                >
                  <option value="equal">Split equally</option>
                  <option value="manual">Manual split</option>
                </select>
              </label>

              {detailForm.split_type === 'manual' ? (
                <div className="space-y-3 rounded-2xl bg-[#f7f8f4] px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Manual split amounts</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Update how much each member owes for this expense.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {detailForm.manual_splits.map((split) => (
                      <label key={split.user_id} className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-slate-700">{split.name}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={split.amount}
                          onChange={(event) =>
                            updateDetailManualSplit(split.user_id, event.target.value)
                          }
                          className="form-input w-32"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Note</span>
                <textarea
                  rows={3}
                  value={detailForm.note}
                  onChange={(event) => setDetailForm((current) => ({ ...current, note: event.target.value }))}
                  className="form-input resize-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Receipt photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleReceiptChange(event, 'edit')}
                  className="form-input"
                />
              </label>

              {detailForm.receipt_data ? (
                <div className="space-y-3">
                  <img src={detailForm.receipt_data} alt="Receipt" className="h-44 w-full rounded-2xl object-cover" />
                  <button
                    type="button"
                    onClick={() => void handleParseReceipt('edit')}
                    disabled={isParsingDetailReceipt}
                    className="outline-button w-full px-4 py-3 text-sm"
                  >
                    {isParsingDetailReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'}
                  </button>
                </div>
              ) : null}

              <div className="rounded-2xl bg-[#f7f8f4] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {detailForm.split_type === 'equal' ? 'Equal split' : 'Manual split'}
                </p>
                <div className="mt-3 space-y-2">
                  {(selectedExpense.splits ?? []).map((split) => (
                    <div key={split.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{split.user.name}</span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(Number(split.amount_owed), selectedExpense.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={isUpdatingExpense} className="primary-button flex-1 px-4 py-3 text-sm">
                  {isUpdatingExpense ? 'Saving changes...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  disabled={isDeletingExpense}
                  onClick={() => void handleDeleteExpense()}
                  className="flex-1 rounded-xl bg-[#d96543] px-4 py-3 text-sm font-semibold text-white"
                >
                  {isDeletingExpense ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </form>

            <section className="mt-5 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Comments</h3>
                <p className="mt-1 text-sm text-slate-500">Add context for the rest of the group.</p>
              </div>

              <div className="space-y-3">
                {(selectedExpense.comments ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d8ddd9] px-4 py-3 text-sm text-slate-500">
                    No comments yet.
                  </div>
                ) : (
                  (selectedExpense.comments ?? []).map((comment) => (
                    <div key={comment.id} className="rounded-2xl bg-[#f7f8f4] px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{comment.author.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{comment.body}</p>
                      <p className="mt-2 text-xs text-slate-400">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>

              <form className="space-y-3" onSubmit={handleAddComment}>
                <textarea
                  rows={3}
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Add a comment"
                  className="form-input resize-none"
                />
                <button type="submit" disabled={isPostingComment || !commentBody.trim()} className="outline-button w-full px-4 py-3 text-sm">
                  {isPostingComment ? 'Posting comment...' : 'Add comment'}
                </button>
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
