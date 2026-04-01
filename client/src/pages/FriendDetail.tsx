import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { FriendExpense, FriendSummary } from '../api';
import { useAuth } from '../context/useAuth';

type FriendExpenseOption =
  | 'you_paid_equal'
  | 'friend_paid_equal'
  | 'you_paid_full'
  | 'friend_paid_full';

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

function getOptionFromExpense(expense: FriendExpense, userId: string | undefined): FriendExpenseOption {
  const paidByMe = expense.payer.id === userId;

  if (expense.split_type === 'FULL_AMOUNT') {
    return paidByMe ? 'you_paid_full' : 'friend_paid_full';
  }

  return paidByMe ? 'you_paid_equal' : 'friend_paid_equal';
}

export default function FriendDetail() {
  const { friendId } = useParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState<FriendSummary | null>(null);
  const [expenses, setExpenses] = useState<FriendExpense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<FriendExpense | null>(null);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    option: 'you_paid_equal' as FriendExpenseOption,
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
  });
  const [detailForm, setDetailForm] = useState({
    description: '',
    amount: '',
    option: 'you_paid_equal' as FriendExpenseOption,
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettlingUp, setIsSettlingUp] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!friendId) {
      setError('Friend not found');
      setIsLoading(false);
      return;
    }

    void loadFriendDetail(friendId);
  }, [friendId]);

  useEffect(() => {
    if (!selectedExpense) {
      return;
    }

    setDetailForm({
      description: selectedExpense.description,
      amount: String(Number(selectedExpense.amount).toFixed(2)),
      option: getOptionFromExpense(selectedExpense, user?.id),
      note: selectedExpense.note ?? '',
      incurred_on: toDateInputValue(selectedExpense.incurred_on),
      receipt_data: selectedExpense.receipt_data ?? '',
    });
    setCommentBody('');
  }, [selectedExpense, user?.id]);

  const currentBalance = summary?.net_balance ?? 0;
  const balanceTone =
    currentBalance > 0.005
      ? 'text-[#36b5ac]'
      : currentBalance < -0.005
        ? 'text-[#ff9630]'
        : 'text-slate-700';

  const balanceMessage =
    currentBalance > 0.005
      ? `${summary?.friend.name} owes you $${Math.abs(currentBalance).toFixed(2)} overall`
      : currentBalance < -0.005
        ? `You owe ${summary?.friend.name} $${Math.abs(currentBalance).toFixed(2)} overall`
        : `You and ${summary?.friend.name ?? 'your friend'} are settled up`;

  const sortedExpenses = useMemo(
    () =>
      [...expenses].sort(
        (a, b) => new Date(b.incurred_on).getTime() - new Date(a.incurred_on).getTime(),
      ),
    [expenses],
  );

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

  function getExpenseSummary(expense: FriendExpense) {
    if (!summary) {
      return '';
    }

    if (expense.activity_type === 'SETTLEMENT') {
      const paidByMe = expense.payer.id === user?.id;
      return paidByMe
        ? `You settled up with ${summary.friend.name} for $${Number(expense.amount).toFixed(2)}`
        : `${summary.friend.name} settled up with you for $${Number(expense.amount).toFixed(2)}`;
    }

    const amount = Number(expense.amount);
    const share = amount / 2;
    const paidByMe = expense.payer.id === user?.id;

    if (expense.split_type === 'FULL_AMOUNT') {
      return paidByMe
        ? `${summary.friend.name} owes you $${amount.toFixed(2)}`
        : `You owe ${summary.friend.name} $${amount.toFixed(2)}`;
    }

    return paidByMe
      ? `${summary.friend.name} owes you $${share.toFixed(2)}`
      : `You owe ${summary.friend.name} $${share.toFixed(2)}`;
  }

  async function handleReceiptChange(
    event: ChangeEvent<HTMLInputElement>,
    mode: 'create' | 'edit',
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      if (mode === 'create') {
        setForm((current) => ({ ...current, receipt_data: '' }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: '' }));
      }
      return;
    }

    try {
      const value = await readFileAsDataUrl(file);
      if (mode === 'create') {
        setForm((current) => ({ ...current, receipt_data: value }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: value }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load receipt image');
    }
  }

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        note: form.note.trim(),
        receipt_data: form.receipt_data || undefined,
        incurred_on: buildIsoDate(form.incurred_on),
        ...payloadByOption(form.option),
      });

      setForm({
        description: '',
        amount: '',
        option: 'you_paid_equal',
        note: '',
        incurred_on: new Date().toISOString().slice(0, 10),
        receipt_data: '',
      });
      setShowAddExpenseForm(false);
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        note: detailForm.note.trim(),
        receipt_data: detailForm.receipt_data || null,
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

    const confirmed = window.confirm('Delete this expense? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setIsDeletingExpense(true);
    setError('');

    try {
      await api.deleteFriendExpense(friendId, selectedExpense.id);
      setSelectedExpense(null);
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete expense');
    } finally {
      setIsDeletingExpense(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add comment');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to settle up');
    } finally {
      setIsSettlingUp(false);
    }
  }

  if (isLoading) {
    return <div className="surface-card p-5 text-sm text-slate-600">Loading friend details...</div>;
  }

  if (error && !summary) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
          {error}
        </div>
        <Link className="text-sm font-semibold text-[#36b5ac]" to="/dashboard?tab=friends">
          Back to friends
        </Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#ead7a8] bg-[#fff8e7] px-4 py-3 text-sm text-[#8c6a25]">
          We couldn't find that friend.
        </div>
        <Link className="text-sm font-semibold text-[#36b5ac]" to="/dashboard?tab=friends">
          Back to friends
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3 px-1">
        <Link
          to="/dashboard?tab=friends"
          className="grid h-10 w-10 place-items-center rounded-full border border-[#d8ddd9] bg-white text-xl text-slate-500"
        >
          {'<'}
        </Link>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Friend detail</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
          {error}
        </div>
      ) : null}

      <section className="surface-card overflow-hidden">
        <div className="bg-[linear-gradient(135deg,#36b5ac_0%,#5dc6bf_55%,#c7d579_100%)] px-5 py-7 text-white">
          <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border-4 border-white/70 bg-[#fff1ec] text-lg font-semibold text-[#d96543] shadow-[0_8px_22px_rgba(31,41,55,0.15)]">
            {summary.friend.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </div>
          <h1 className="mt-4 text-[2rem] font-semibold text-white">{summary.friend.name}</h1>
          <p className="mt-1 text-sm text-white/85">{summary.friend.email}</p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <p className={`text-[1.45rem] font-semibold ${balanceTone}`}>{balanceMessage}</p>
            <p className="mt-2 text-sm text-slate-500">
              Keep direct daily expenses, receipts, notes, and settlement history in one place.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#f7f8f4] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">You paid</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">${summary.you_paid_total.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-[#f7f8f4] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Friend paid</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">${summary.friend_paid_total.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-[#f7f8f4] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Activities</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{summary.expense_count}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleSettleUp()}
              disabled={Math.abs(currentBalance) < 0.01 || isSettlingUp}
              className="primary-button flex-1 px-4 py-3 text-sm"
            >
              {isSettlingUp ? 'Settling up...' : 'Settle up'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddExpenseForm((current) => !current)}
              className="outline-button flex-1 px-4 py-3 text-sm"
            >
              {showAddExpenseForm ? 'Close form' : 'Add expense'}
            </button>
          </div>
        </div>
      </section>

      {showAddExpenseForm ? (
        <section id="friend-expense-form" className="surface-card space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Add an expense</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a direct split with {summary.friend.name}, including date, note, and receipt if needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddExpenseForm(false)}
              className="text-sm font-semibold text-[#36b5ac]"
            >
              Close
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleAddExpense}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <input
                required
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Food"
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
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="20"
                className="form-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Expense date</span>
              <input
                type="date"
                value={form.incurred_on}
                onChange={(event) => setForm((current) => ({ ...current, incurred_on: event.target.value }))}
                className="form-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Split details</span>
              <select
                value={form.option}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    option: event.target.value as FriendExpenseOption,
                  }))
                }
                className="form-input"
              >
                <option value="you_paid_equal">You paid, split equally</option>
                <option value="friend_paid_equal">{summary.friend.name} paid, split equally</option>
                <option value="you_paid_full">You paid, {summary.friend.name} owes the full amount</option>
                <option value="friend_paid_full">{summary.friend.name} paid, you owe the full amount</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Optional note</span>
              <textarea
                rows={3}
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Anything helpful to remember later"
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

            {form.receipt_data ? (
              <img
                src={form.receipt_data}
                alt="Receipt preview"
                className="h-40 w-full rounded-2xl object-cover"
              />
            ) : null}

            <button type="submit" disabled={isSaving} className="primary-button w-full px-4 py-3">
              {isSaving ? 'Saving expense...' : 'Save expense'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-xl font-semibold text-slate-900">Activity</h2>
          <p className="mt-1 text-sm text-slate-500">Tap an item to open details, comments, or receipt preview.</p>
        </div>

        {sortedExpenses.length === 0 ? (
          <div className="surface-card p-5 text-sm text-slate-600">
            No direct activity yet with {summary.friend.name}.
          </div>
        ) : (
          sortedExpenses.map((expense) => (
            <button
              key={expense.id}
              type="button"
              onClick={() => void openExpenseDetail(expense.id)}
              className="surface-card block w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{expense.description}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {expense.activity_type === 'SETTLEMENT' ? 'Settlement' : `${expense.payer.name} paid`} on{' '}
                    {new Date(expense.incurred_on).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-lg font-semibold text-[#36b5ac]">${Number(expense.amount).toFixed(2)}</p>
              </div>
              <p className="mt-2 text-sm font-medium text-[#2b938c]">{getExpenseSummary(expense)}</p>
              {expense.note ? <p className="mt-2 text-sm text-slate-500 line-clamp-2">{expense.note}</p> : null}
            </button>
          ))
        )}
      </section>

      {selectedExpense ? (
        <div className="fixed inset-0 z-40 bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-h-[calc(100vh-3rem)] w-full max-w-[34rem] overflow-y-auto rounded-[1.8rem] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Expense details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedExpense.activity_type === 'SETTLEMENT'
                    ? 'Settlement record'
                    : 'Edit this expense, update receipt, or add comments.'}
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
              <p className="mt-1 text-sm text-slate-500">{getExpenseSummary(selectedExpense)}</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p>Amount: ${Number(selectedExpense.amount).toFixed(2)}</p>
                <p>Occurred on: {new Date(selectedExpense.incurred_on).toLocaleString()}</p>
                <p>Created: {new Date(selectedExpense.created_at).toLocaleString()}</p>
                {selectedExpense.updated_at ? (
                  <p>Updated: {new Date(selectedExpense.updated_at).toLocaleString()}</p>
                ) : null}
              </div>
            </div>

            {selectedExpense.activity_type === 'EXPENSE' ? (
              <form className="mt-5 space-y-4" onSubmit={handleUpdateExpense}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Description</span>
                  <input
                    required
                    value={detailForm.description}
                    onChange={(event) =>
                      setDetailForm((current) => ({ ...current, description: event.target.value }))
                    }
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
                    onChange={(event) =>
                      setDetailForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    className="form-input"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    value={detailForm.incurred_on}
                    onChange={(event) =>
                      setDetailForm((current) => ({ ...current, incurred_on: event.target.value }))
                    }
                    className="form-input"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Split details</span>
                  <select
                    value={detailForm.option}
                    onChange={(event) =>
                      setDetailForm((current) => ({
                        ...current,
                        option: event.target.value as FriendExpenseOption,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="you_paid_equal">You paid, split equally</option>
                    <option value="friend_paid_equal">{summary.friend.name} paid, split equally</option>
                    <option value="you_paid_full">You paid, {summary.friend.name} owes the full amount</option>
                    <option value="friend_paid_full">{summary.friend.name} paid, you owe the full amount</option>
                  </select>
                </label>

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
                  <img
                    src={detailForm.receipt_data}
                    alt="Receipt"
                    className="h-44 w-full rounded-2xl object-cover"
                  />
                ) : null}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isUpdatingExpense}
                    className="primary-button flex-1 px-4 py-3 text-sm"
                  >
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
            ) : null}

            <section className="mt-5 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Comments</h3>
                <p className="mt-1 text-sm text-slate-500">Leave context for this expense or settlement.</p>
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
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
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
                <button
                  type="submit"
                  disabled={isPostingComment || !commentBody.trim()}
                  className="outline-button w-full px-4 py-3 text-sm"
                >
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
