import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import type { Expense, Group } from '../api';

export default function GroupDetail() {
  const { groupId } = useParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
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

  async function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
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

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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

        <section className="space-y-4 rounded-[2rem] border border-white/10 bg-white/8 p-6">
          <div>
            <h2 className="text-2xl font-semibold">Recent expenses</h2>
            <p className="mt-1 text-sm text-slate-400">
              Expenses UI lands in the next branch. For now, this shows live group activity from the API.
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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
