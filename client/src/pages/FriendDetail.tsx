import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { FriendExpense, FriendSummary } from '../api';
import { useAuth } from '../context/useAuth';

type FriendExpenseOption =
  | 'you_paid_equal'
  | 'friend_paid_equal'
  | 'you_paid_full'
  | 'friend_paid_full';

export default function FriendDetail() {
  const { friendId } = useParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState<FriendSummary | null>(null);
  const [expenses, setExpenses] = useState<FriendExpense[]>([]);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    option: 'you_paid_equal' as FriendExpenseOption,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!friendId) {
      setError('Friend not found');
      setIsLoading(false);
      return;
    }

    void loadFriendDetail(friendId);
  }, [friendId]);

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

  function getExpenseSummary(expense: FriendExpense) {
    if (!summary) {
      return '';
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

    const payloadByOption: Record<
      FriendExpenseOption,
      { paid_by: 'self' | 'friend'; split_type: 'equal' | 'full_amount' }
    > = {
      you_paid_equal: { paid_by: 'self', split_type: 'equal' },
      friend_paid_equal: { paid_by: 'friend', split_type: 'equal' },
      you_paid_full: { paid_by: 'self', split_type: 'full_amount' },
      friend_paid_full: { paid_by: 'friend', split_type: 'full_amount' },
    };

    setIsSaving(true);
    setError('');

    try {
      await api.addFriendExpense(friendId, {
        description: form.description.trim(),
        amount,
        ...payloadByOption[form.option],
      });

      setForm({
        description: '',
        amount: '',
        option: 'you_paid_equal',
      });
      await loadFriendDetail(friendId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setIsSaving(false);
    }
  }

  const balance = summary?.net_balance ?? 0;
  const heroTone =
    balance > 0.005 ? 'text-[#36b5ac]' : balance < -0.005 ? 'text-[#ff9630]' : 'text-slate-700';
  const heroMessage =
    balance > 0.005
      ? `${summary?.friend.name} owes you $${Math.abs(balance).toFixed(2)} overall`
      : balance < -0.005
        ? `You owe ${summary?.friend.name} $${Math.abs(balance).toFixed(2)} overall`
        : `You and ${summary?.friend.name ?? 'your friend'} are settled up`;

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

      {isLoading || !summary ? (
        <div className="surface-card p-5 text-sm text-slate-600">Loading friend details...</div>
      ) : (
        <>
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
                <p className={`text-[1.45rem] font-semibold ${heroTone}`}>{heroMessage}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Direct daily expenses with this friend show up here automatically.
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Expenses</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{summary.expense_count}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card space-y-4 p-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Add an expense</h2>
              <p className="mt-1 text-sm text-slate-500">Split something quickly with {summary.friend.name}.</p>
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

              <button type="submit" disabled={isSaving} className="primary-button w-full px-4 py-3">
                {isSaving ? 'Saving expense...' : 'Save expense'}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <div className="px-1">
              <h2 className="text-xl font-semibold text-slate-900">Recent transactions</h2>
            </div>

            {expenses.length === 0 ? (
              <div className="surface-card p-5 text-sm text-slate-600">
                No direct expenses yet with {summary.friend.name}.
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="surface-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{expense.description}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {expense.payer.name} paid ${Number(expense.amount).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#36b5ac]">
                      {new Date(expense.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#2b938c]">{getExpenseSummary(expense)}</p>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
