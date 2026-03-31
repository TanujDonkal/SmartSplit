import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Expense, Group } from '../api';
import { useAuth } from '../context/useAuth';

type DashboardExpense = Expense & { groupName: string };

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'groups';

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState('');
  const [recentExpenses, setRecentExpenses] = useState<DashboardExpense[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setRecentExpenses([]);
      setNetBalance(0);
      setIsLoading(false);
      return;
    }

    void loadDashboard();
  }, [token]);

  async function loadDashboard() {
    setIsLoading(true);
    setError('');

    try {
      const groupList = await api.getGroups();
      setGroups(groupList);

      const [balanceLists, expenseLists] = await Promise.all([
        Promise.all(groupList.map((group) => api.getGroupBalances(group.id))),
        Promise.all(groupList.map((group) => api.getGroupExpenses(group.id))),
      ]);

      const overall = groupList.reduce((sum, _group, index) => {
        const mine = balanceLists[index].find((entry) => entry.user.id === user?.id);
        return sum + (mine?.balance ?? 0);
      }, 0);
      setNetBalance(Math.round(overall * 100) / 100);

      const flattened = groupList.flatMap((group, index) =>
        expenseLists[index].map((expense) => ({
          ...expense,
          groupName: group.name,
        })),
      );

      flattened.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setRecentExpenses(flattened.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      navigate('/login', {
        state: { message: 'Please log in to create a group.' },
      });
      return;
    }

    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const created = await api.createGroup({ name: groupName.trim() });
      setGroups((current) => [created, ...current]);
      setGroupName('');
      setSearchParams({ tab: 'groups' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create group');
    } finally {
      setIsCreating(false);
    }
  }

  const friends = useMemo(() => {
    const seen = new Map<string, { name: string; email: string; groups: Set<string> }>();

    for (const group of groups) {
      for (const member of group.members) {
        if (member.user.id === user?.id) {
          continue;
        }

        const existing = seen.get(member.user.id);
        if (existing) {
          existing.groups.add(group.name);
        } else {
          seen.set(member.user.id, {
            name: member.user.name,
            email: member.user.email,
            groups: new Set([group.name]),
          });
        }
      }
    }

    return Array.from(seen.entries()).map(([id, value]) => ({
      id,
      ...value,
    }));
  }, [groups, user?.id]);

  const balanceTone =
    netBalance > 0.005 ? 'text-[#36b5ac]' : netBalance < -0.005 ? 'text-[#ff9630]' : 'text-slate-700';

  const balanceMessage =
    netBalance > 0.005
      ? `Overall, you are owed $${Math.abs(netBalance).toFixed(2)}`
      : netBalance < -0.005
        ? `Overall, you owe $${Math.abs(netBalance).toFixed(2)}`
        : 'Overall, you are settled up';

  function promptLogin(message: string) {
    navigate('/login', { state: { message } });
  }

  return (
    <div className="space-y-5 pb-6">
      {error ? (
        <div className="rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
          {error}
        </div>
      ) : null}

      <section className="rounded-[1.8rem] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(31,41,55,0.05)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">
              {token ? `Hi, ${user?.name ?? 'there'}` : 'Welcome'}
            </p>
            <h1 className={`mt-2 text-[1.9rem] font-semibold leading-tight ${balanceTone}`}>
              {balanceMessage}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'groups' })}
            className="action-chip px-3.5 py-2.5 text-sm font-semibold"
          >
            <span className="action-chip-icon">oo</span>
            <span>View groups</span>
          </button>
        </div>
      </section>

      {activeTab === 'friends' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[1.75rem] font-semibold text-slate-900">Friends</h2>
            <button
              type="button"
              onClick={() =>
                token
                  ? setSearchParams({ tab: 'groups' })
                  : promptLogin('Please log in to add friends to a group.')
              }
              className="text-sm font-semibold text-[#36b5ac]"
            >
              Add friends
            </button>
          </div>

          {!token ? (
            <div className="surface-card p-5 text-sm text-slate-600">
              Log in first, then add a friend by email from inside a group.
            </div>
          ) : friends.length === 0 ? (
            <div className="surface-card p-5 text-sm text-slate-600">
              No friends added yet. Create a group and invite people by email.
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.id} className="surface-card flex items-center gap-4 p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#ffdfd4] text-sm font-semibold text-[#d96543]">
                    {friend.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{friend.name}</p>
                    <p className="truncate text-sm text-slate-500">{friend.email}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      In {friend.groups.size} group{friend.groups.size === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'groups' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[1.75rem] font-semibold text-slate-900">Groups</h2>
            <button
              type="button"
              onClick={() => {
                const form = document.getElementById('create-group-form');
                form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-sm font-semibold text-[#36b5ac]"
            >
              Create group
            </button>
          </div>

          <form id="create-group-form" className="surface-card space-y-3 p-4" onSubmit={handleCreateGroup}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Start a new group</span>
              <input
                required
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Trip to Halifax"
                className="form-input"
              />
            </label>
            <button type="submit" disabled={isCreating} className="primary-button w-full px-4 py-3">
              {token ? (isCreating ? 'Creating...' : 'Create group') : 'Log in to create a group'}
            </button>
          </form>

          {isLoading ? (
            <div className="surface-card p-5 text-sm text-slate-600">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="surface-card p-5 text-sm text-slate-600">
              No groups yet. Start one above and then add your friends.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <Link key={group.id} to={`/groups/${group.id}`} className="surface-card block p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{group.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.members.length} members
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#36b5ac]">
                        {group._count?.expenses ?? 0} expense{(group._count?.expenses ?? 0) === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(group.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[1.75rem] font-semibold text-slate-900">Recent activity</h2>
          </div>

          {!token ? (
            <div className="surface-card p-5 text-sm text-slate-600">
              Log in to see your recent shared expense activity.
            </div>
          ) : recentExpenses.length === 0 ? (
            <div className="surface-card p-5 text-sm text-slate-600">
              No activity yet. Add your first expense from a group.
            </div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => {
                const isMe = expense.payer.id === user?.id;
                return (
                  <div key={`${expense.group_id}-${expense.id}`} className="surface-card flex gap-4 p-4">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef8f7] text-sm font-semibold text-[#36b5ac]">
                      $
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {isMe ? 'You added' : `${expense.payer.name} added`} "{expense.description}"
                      </p>
                      <p className="mt-1 text-sm text-[#36b5ac]">
                        ${Number(expense.amount).toFixed(2)} in {expense.groupName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(expense.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'account' && (
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-[1.75rem] font-semibold text-slate-900">Account</h2>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[#ffd8cc] text-lg font-semibold text-[#d96543]">
                {user?.name
                  ?.split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2) ?? 'U'}
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-900">{user?.name ?? 'Guest'}</p>
                <p className="text-sm text-slate-500">{user?.email ?? 'Log in to manage your account'}</p>
              </div>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="bg-[linear-gradient(135deg,#eef8f7,#fff4dc)] px-5 py-6">
              <p className="text-lg font-semibold text-slate-900">Do more with SmartSplit</p>
              <p className="mt-2 text-sm text-slate-600">
                Keep your household, trip, and friend expenses easy to understand at a glance.
              </p>
              <button className="mt-4 rounded-full bg-[#355d74] px-5 py-3 text-sm font-semibold text-white">
                Explore SmartSplit style
              </button>
            </div>

            <div className="divide-y divide-[#ecece7]">
              {['Notifications', 'Security', 'Feedback'].map((item) => (
                <div key={item} className="flex items-center justify-between px-5 py-4 text-sm">
                  <span className="text-slate-700">{item}</span>
                  <span className="text-slate-400">›</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() =>
          token
            ? setSearchParams({ tab: 'groups' })
            : promptLogin('Please log in to add an expense.')
        }
        className="floating-action fixed bottom-24 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-[20rem] -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[#36b5ac] px-5 py-4 text-base font-semibold text-white"
      >
        <span className="text-lg leading-none">[]</span>
        <span>Add expense</span>
      </button>
    </div>
  );
}
