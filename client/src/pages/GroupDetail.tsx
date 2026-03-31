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

  const myBalance = useMemo(() => {
    const mine = balances.find((entry) => entry.user.id === user?.id);
    return mine?.balance ?? 0;
  }, [balances, user?.id]);

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
          entry.id === groupId ? { ...entry, members: [...entry.members, newMember] } : entry,
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
          We couldn&apos;t find that group.
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
          ‹ Back to groups
        </Link>

        <div className="mt-4">
          <p className="text-sm text-slate-500">Group</p>
          <h1 className="mt-2 text-[2rem] font-semibold text-slate-900">{group.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {group.members.length} members • {expenses.length} expenses
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="soft-card p-4">
            <p className="text-sm text-slate-500">Your balance</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                myBalance > 0
                  ? 'text-[#36b5ac]'
                  : myBalance < 0
                    ? 'text-[#ff9630]'
                    : 'text-slate-700'
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
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
          {error}
        </div>
      ) : null}

      <section className="surface-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add expense</h2>
            <p className="mt-1 text-sm text-slate-500">
              Record what you paid and split it equally.
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleAddExpense}>
          <input
            required
            value={expenseForm.description}
            onChange={(event) =>
              setExpenseForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Groceries"
            className="form-input"
          />

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
            placeholder="94.50"
            className="form-input"
          />

            <div className="rounded-2xl bg-[#eef8f7] px-4 py-3 text-sm text-[#2b938c]">
            Split preview: {group.members.length} member(s) would each owe ${splitPreview.toFixed(2)}.
          </div>

          <button type="submit" disabled={isAddingExpense} className="primary-button w-full px-4 py-4">
            {isAddingExpense ? 'Saving expense...' : 'Add expense'}
          </button>
        </form>
      </section>

      <section className="surface-card p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Members</h2>
          <p className="mt-1 text-sm text-slate-500">Add people by email to this group.</p>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleAddMember}>
          <input
            required
            autoComplete="email"
            type="email"
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="friend@example.com"
            className="form-input"
          />
          <button type="submit" disabled={isAddingMember} className="outline-button w-full px-4 py-3">
            {isAddingMember ? 'Adding member...' : 'Add member'}
          </button>
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
                <p className="font-semibold text-slate-900">{member.user.name}</p>
                <p className="truncate text-sm text-slate-500">{member.user.email}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Balances</h2>
            <p className="mt-1 text-sm text-slate-500">See who owes and who gets back.</p>
          </div>
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
                    {Math.abs(entry.balance) < 0.01
                      ? 'Settled'
                      : entry.balance > 0
                        ? 'Gets back'
                        : 'Owes'}
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
                <p className="mt-2 text-2xl font-semibold text-[#36b5ac]">
                  ${settlement.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card p-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Recent activity</h2>
          <p className="mt-1 text-sm text-slate-500">Latest expenses in this group.</p>
        </div>

        {expenses.length === 0 ? (
          <div className="mt-4 text-sm text-slate-500">No expenses added yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="soft-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{expense.description}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Paid by {expense.payer.name} on {new Date(expense.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-[#36b5ac]">
                    ${Number(expense.amount).toFixed(2)}
                  </p>
                </div>

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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
