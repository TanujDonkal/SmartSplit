import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Balance, Expense, Group, Settlement } from '../api';
import { useAuth } from '../context/useAuth';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
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
        const [groupList, groupExpenses, groupBalances, groupSettlements] = await Promise.all([
          api.getGroups(),
          api.getGroupExpenses(groupId),
          api.getGroupBalances(groupId),
          api.getGroupSettlements(groupId),
        ]);
        setGroups(groupList);
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

  async function refreshGroupSummaries(activeGroupId: string) {
    const [groupBalances, groupSettlements] = await Promise.all([
      api.getGroupBalances(activeGroupId),
      api.getGroupSettlements(activeGroupId),
    ]);
    setBalances(groupBalances);
    setSettlements(groupSettlements);
  }

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
      await refreshGroupSummaries(groupId);
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
      await refreshGroupSummaries(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-[2rem] p-8 text-sm text-slate-600">
        Loading group details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
        <Link className="text-sm font-medium text-sky-700" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          We couldn&apos;t find that group.
        </div>
        <Link className="text-sm font-medium text-sky-700" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-[2rem] p-6">
        <Link className="text-sm font-medium text-sky-700" to="/dashboard">
          Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-700">Group detail</p>
            <h1 className="text-4xl font-semibold text-slate-900">{group.name}</h1>
            <p className="text-sm text-slate-600">
              {group.members.length} members and {expenses.length} expense entries so far
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-panel rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
              <p className="mt-2 text-lg font-medium text-slate-900">
                {new Date(group.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="soft-panel rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Expenses</p>
              <p className="mt-2 text-lg font-medium text-slate-900">
                {group._count?.expenses ?? expenses.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <section className="glass-card space-y-4 rounded-[2rem] p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Balances</h2>
              <p className="mt-1 text-sm text-slate-600">
                Positive balances should receive money. Negative balances still owe the group.
              </p>
            </div>

            {balances.length === 0 ? (
              <div className="soft-panel rounded-2xl border-dashed p-4 text-sm text-slate-500">
                No balances yet.
              </div>
            ) : (
              <div className="space-y-3">
                {balances.map((entry) => {
                  const positive = entry.balance > 0;
                  const neutral = Math.abs(entry.balance) < 0.01;

                  return (
                    <div
                      key={entry.user.id}
                      className="soft-panel flex items-center justify-between rounded-2xl px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{entry.user.name}</p>
                        <p className="text-sm text-slate-500">{entry.user.email}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${
                            neutral
                              ? 'text-slate-700'
                              : positive
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                          }`}
                        >
                          {entry.balance > 0 ? '+' : ''}
                          ${Math.abs(entry.balance).toFixed(2)}
                        </p>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {neutral ? 'Settled' : positive ? 'Gets back' : 'Owes'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="glass-card space-y-4 rounded-[2rem] p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Suggested settlements</h2>
              <p className="mt-1 text-sm text-slate-600">
                These are the fewest payments needed to settle the current balances.
              </p>
            </div>

            {settlements.length === 0 ? (
              <div className="soft-panel rounded-2xl border-dashed p-4 text-sm text-slate-500">
                Everyone is settled up right now.
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((settlement, index) => (
                  <div
                    key={`${settlement.from.id}-${settlement.to.id}-${index}`}
                    className="soft-panel rounded-2xl px-4 py-4"
                  >
                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-900">{settlement.from.name}</span>{' '}
                      pays <span className="font-medium text-slate-900">{settlement.to.name}</span>
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-sky-700">
                      ${settlement.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="glass-card space-y-4 rounded-[2rem] p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Add expense</h2>
              <p className="mt-1 text-sm text-slate-600">
                Record what you paid and SmartSplit will divide it evenly across the group.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleAddExpense}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-700">Description</span>
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
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-700">Amount paid</span>
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
                  className="form-input"
                />
              </label>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <p className="font-medium">Split preview</p>
                <p className="mt-1">
                  {user?.name ?? 'You'} paid. Each of the {group.members.length} member(s) would owe $
                  {splitPreview.toFixed(2)}.
                </p>
              </div>

              <button type="submit" disabled={isAddingExpense} className="primary-button w-full px-4 py-3">
                {isAddingExpense ? 'Saving expense...' : 'Add expense'}
              </button>
            </form>
          </section>

          <section className="glass-card space-y-4 rounded-[2rem] p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Members</h2>
              <p className="mt-1 text-sm text-slate-600">
                Add people by email to start recording shared expenses together.
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleAddMember}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-700">Member email</span>
                <input
                  required
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="friend@example.com"
                  className="form-input"
                />
              </label>
              <button type="submit" disabled={isAddingMember} className="primary-button w-full px-4 py-3">
                {isAddingMember ? 'Adding member...' : 'Add member'}
              </button>
            </form>

            <div className="space-y-3">
              {group.members.map((member) => (
                <div key={member.user.id} className="soft-panel rounded-2xl px-4 py-3">
                  <p className="font-medium text-slate-900">{member.user.name}</p>
                  <p className="text-sm text-slate-500">{member.user.email}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="glass-card space-y-4 rounded-[2rem] p-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Expense activity</h2>
            <p className="mt-1 text-sm text-slate-600">
              New expenses appear here instantly, with payer details and equal-split breakdowns.
            </p>
          </div>

          {expenses.length === 0 ? (
            <div className="soft-panel rounded-2xl border-dashed p-6 text-sm text-slate-500">
              No expenses have been added to this group yet.
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="soft-panel rounded-2xl px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{expense.description}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Paid by {expense.payer.name} on {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-sky-700">
                      ${Number(expense.amount).toFixed(2)}
                    </p>
                  </div>
                  {expense.splits?.length ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Equal split</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {expense.splits.map((split) => (
                          <div
                            key={split.id}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                          >
                            <span className="text-slate-600">{split.user.name}</span>
                            <span className="font-medium text-slate-900">
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
