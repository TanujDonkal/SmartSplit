import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Balance, Expense, Friend, Group, Settlement } from '../api';
import { useAuth } from '../context/useAuth';

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
  const [memberEmail, setMemberEmail] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
  });
  const [detailForm, setDetailForm] = useState({
    description: '',
    amount: '',
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [error, setError] = useState('');

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

    setDetailForm({
      description: selectedExpense.description,
      amount: String(Number(selectedExpense.amount).toFixed(2)),
      note: selectedExpense.note ?? '',
      incurred_on: toDateInputValue(selectedExpense.incurred_on),
      receipt_data: selectedExpense.receipt_data ?? '',
    });
    setCommentBody('');
  }, [selectedExpense]);

  const group = useMemo(() => groups.find((entry) => entry.id === groupId), [groupId, groups]);

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

  async function addMemberByEmail(email: string) {
    if (!groupId || !email.trim()) {
      setError('Member email is required');
      return;
    }

    setIsAddingMember(true);
    setError('');

    try {
      await api.addGroupMember(groupId, { email: email.trim().toLowerCase() });
      setMemberEmail('');
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
        setExpenseForm((current) => ({ ...current, receipt_data: '' }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: '' }));
      }
      return;
    }

    try {
      const value = await readFileAsDataUrl(file);
      if (mode === 'create') {
        setExpenseForm((current) => ({ ...current, receipt_data: value }));
      } else {
        setDetailForm((current) => ({ ...current, receipt_data: value }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load receipt image');
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addMemberByEmail(memberEmail);
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

    setIsAddingExpense(true);
    setError('');

    try {
      await api.addExpense({
        group_id: groupId,
        description: expenseForm.description.trim(),
        amount,
        note: expenseForm.note.trim(),
        receipt_data: expenseForm.receipt_data || undefined,
        incurred_on: buildIsoDate(expenseForm.incurred_on),
      });
      setExpenseForm({
        description: '',
        amount: '',
        note: '',
        incurred_on: new Date().toISOString().slice(0, 10),
        receipt_data: '',
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

    setIsUpdatingExpense(true);
    setError('');

    try {
      const updated = await api.updateExpense(selectedExpense.id, {
        description: detailForm.description.trim(),
        amount,
        note: detailForm.note.trim(),
        receipt_data: detailForm.receipt_data || null,
        incurred_on: buildIsoDate(detailForm.incurred_on),
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
              ${Math.abs(myBalance).toFixed(2)}
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
              <img
                src={expenseForm.receipt_data}
                alt="Receipt preview"
                className="h-40 w-full rounded-2xl object-cover"
              />
            ) : null}

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-[#eef8f7] px-3 py-2 font-medium text-[#2b938c]">
                Paid by you
              </span>
              <span className="rounded-full bg-[#f6f7f3] px-3 py-2 font-medium text-slate-600">
                Split equally
              </span>
            </div>

            <div className="rounded-2xl bg-[#eef8f7] px-4 py-3 text-sm text-[#2b938c]">
              Split preview: {group.members.length} member(s) would each owe ${splitPreview.toFixed(2)}.
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
          <p className="mt-1 text-sm text-slate-500">Add signed-up friends quickly or invite by email.</p>
        </div>

        {availableFriends.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Quick add from your friends</p>
            <div className="space-y-2">
              {availableFriends.slice(0, 5).map((friend) => (
                <div key={friend.id} className="soft-card flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{friend.name}</p>
                    <p className="truncate text-sm text-slate-500">{friend.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isAddingMember}
                    onClick={() => void addMemberByEmail(friend.email)}
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
            <span className="text-sm font-medium text-slate-700">Add by email</span>
            <input
              required
              autoComplete="email"
              type="email"
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="friend@example.com"
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
                <p className="truncate text-sm text-slate-500">{member.user.email}</p>
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
                  <p className="text-sm text-slate-500">{entry.user.email}</p>
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
                    ${Math.abs(entry.balance).toFixed(2)}
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
                <p className="mt-2 text-2xl font-semibold text-[#36b5ac]">${settlement.amount.toFixed(2)}</p>
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
                  <p className="text-lg font-semibold text-[#36b5ac]">${Number(expense.amount).toFixed(2)}</p>
                </div>

                {expense.note ? <p className="mt-2 text-sm text-slate-500 line-clamp-2">{expense.note}</p> : null}

                {expense.splits?.length ? (
                  <div className="mt-4 rounded-2xl bg-[#f6f7f3] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Equal split</p>
                    <div className="mt-3 space-y-2">
                      {expense.splits.map((split) => (
                        <div key={split.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{split.user.name}</span>
                          <span className="font-semibold text-slate-900">
                            ${Number(split.amount_owed).toFixed(2)}
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
                <p>Amount: ${Number(selectedExpense.amount).toFixed(2)}</p>
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
                <span className="text-sm font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  value={detailForm.incurred_on}
                  onChange={(event) => setDetailForm((current) => ({ ...current, incurred_on: event.target.value }))}
                  className="form-input"
                />
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
                <img src={detailForm.receipt_data} alt="Receipt" className="h-44 w-full rounded-2xl object-cover" />
              ) : null}

              <div className="rounded-2xl bg-[#f7f8f4] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Split breakdown</p>
                <div className="mt-3 space-y-2">
                  {(selectedExpense.splits ?? []).map((split) => (
                    <div key={split.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{split.user.name}</span>
                      <span className="font-semibold text-slate-900">${Number(split.amount_owed).toFixed(2)}</span>
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
