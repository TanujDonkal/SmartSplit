import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Expense, Group } from '../api';
import { useAuth } from '../context/useAuth';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
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
        const [groupList, groupExpenses] = await Promise.all([
          api.getGroups(),
          api.getGroupExpenses(groupId),
        ]);
        setGroups(groupList);
        setExpenses(groupExpenses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load group details');
      } finally {
        setIsLoading(false);
      }
    }

    void run();
  }, [groupId]);

  const group = useMemo(
    () => groups.find((entry) => entry.id === groupId),
    [groupId, groups],
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

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupId || !memberEmail.trim()) {
      setError('Member email is required');
      return;
    }

    setIsAddingMember(true);
    setError('');

    try {
      const newMember = await api.addGroupMember(groupId, { email: memberEmail.trim() });
      setGroups((current) =>
        current.map((entry) =>
          entry.id === groupId
            ? { ...entry, members: [...entry.members, newMember] }
            : entry,
        ),
      );
      setMemberEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add member');
    } finally {
      setIsAddingMember(false);
    }
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
      const newExpense = await api.addExpense({
        group_id: groupId,
        description: expenseForm.description.trim(),
        amount,
      });

      setExpenses((current) => [newExpense, ...current]);
      setGroups((current) =>
        current.map((entry) =>
          entry.id === groupId
            ? {
                ...entry,
                _count: { expenses: (entry._count?.expenses ?? 0) + 1 },
              }
            : entry,
        ),
      );
      setExpenseForm({
        description: '',
        amount: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/8 p-8 text-sm text-slate-300">
        Loading group details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
        <Link className="text-sm font-medium text-cyan-200" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          We couldn&apos;t find that group.
        </div>
        <Link className="text-sm font-medium text-cyan-200" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <Link className="text-sm font-medium text-cyan-200" to="/">
          Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">Group detail</p>
            <h1 className="text-4xl font-semibold">{group.name}</h1>
            <p className="text-sm text-slate-400">
              {group.members.length} members and {expenses.length} expense entries so far
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
              <p className="mt-2 text-lg font-medium">
                {new Date(group.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Expenses</p>
              <p className="mt-2 text-lg font-medium">{group._count?.expenses ?? expenses.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/8 p-6">
            <div>
              <h2 className="text-2xl font-semibold">Add expense</h2>
              <p className="mt-1 text-sm text-slate-400">
                Record what you paid and SmartSplit will divide it evenly across the group.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleAddExpense}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-200">Description</span>
                <input
                  required
                  value={expenseForm.description}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Dinner at The Bicycle Thief"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/25"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-200">Amount paid</span>
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  inputMode="decimal"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="120.00"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/25"
                />
              </label>

              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100">
                <p className="font-medium">Split preview</p>
                <p className="mt-1 text-cyan-50/90">
                  {user?.name ?? 'You'} paid. Each of the {group.members.length} member(s) would owe{' '}
                  ${splitPreview.toFixed(2)}.
                </p>
              </div>

              <button
                type="submit"
                disabled={isAddingExpense}
                className="w-full rounded-2xl bg-cyan-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-100"
              >
                {isAddingExpense ? 'Saving expense...' : 'Add expense'}
              </button>
            </form>
          </section>

          <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/8 p-6">
          <div>
            <h2 className="text-2xl font-semibold">Members</h2>
            <p className="mt-1 text-sm text-slate-400">
              Add people by email to start recording shared expenses together.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleAddMember}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Member email</span>
              <input
                required
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="friend@example.com"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/25"
              />
            </label>
            <button
              type="submit"
              disabled={isAddingMember}
              className="w-full rounded-2xl bg-cyan-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-100"
            >
              {isAddingMember ? 'Adding member...' : 'Add member'}
            </button>
          </form>

          <div className="space-y-3">
            {group.members.map((member) => (
              <div
                key={member.user.id}
                className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3"
              >
                <p className="font-medium text-slate-100">{member.user.name}</p>
                <p className="text-sm text-slate-400">{member.user.email}</p>
              </div>
            ))}
          </div>
          </section>
        </div>

        <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/8 p-6">
          <div>
            <h2 className="text-2xl font-semibold">Expense activity</h2>
            <p className="mt-1 text-sm text-slate-400">
              New expenses appear here instantly, with payer details and equal-split breakdowns.
            </p>
          </div>

          {expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/20 p-6 text-sm text-slate-400">
              No expenses have been added to this group yet.
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-100">{expense.description}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Paid by {expense.payer.name} on{' '}
                        {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-cyan-200">
                      ${Number(expense.amount).toFixed(2)}
                    </p>
                  </div>
                  {expense.splits?.length ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Equal split
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {expense.splits.map((split) => (
                          <div
                            key={split.id}
                            className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                          >
                            <span className="text-slate-300">{split.user.name}</span>
                            <span className="font-medium text-slate-100">
                              ${Number(split.amount_owed).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
