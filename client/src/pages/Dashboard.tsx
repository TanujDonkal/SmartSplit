import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import type { Expense, Friend, FriendExpense, Group } from '../api';
import { useAuth } from '../context/useAuth';

type DashboardExpense = Expense & { groupName: string };
type FriendExpenseOption = 'you_paid_equal' | 'friend_paid_equal' | 'you_paid_full' | 'friend_paid_full';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'groups';

  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupName, setGroupName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [recentExpenses, setRecentExpenses] = useState<DashboardExpense[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendExpenses, setFriendExpenses] = useState<Record<string, FriendExpense[]>>({});
  const [friendExpenseForm, setFriendExpenseForm] = useState({
    description: '',
    amount: '',
    option: 'you_paid_equal' as FriendExpenseOption,
  });
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isSavingFriendExpense, setIsSavingFriendExpense] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setFriends([]);
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
      const [groupList, friendList] = await Promise.all([
        api.getGroups(),
        api.getFriends(),
      ]);
      setGroups(groupList);
      setFriends(friendList);

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

  async function loadFriendExpenses(friendId: string) {
    const expenses = await api.getFriendExpenses(friendId);
    setFriendExpenses((current) => ({
      ...current,
      [friendId]: expenses,
    }));
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

  async function handleAddFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      promptLogin('Please log in to add a friend.');
      return;
    }

    if (!friendEmail.trim()) {
      setError('Friend email is required');
      return;
    }

    setIsAddingFriend(true);
    setError('');

    try {
      const friend = await api.addFriend({ email: friendEmail.trim() });
      setFriends((current) => {
        const exists = current.some((entry) => entry.id === friend.id);
        return exists ? current : [friend, ...current];
      });
      setFriendEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add friend');
    } finally {
      setIsAddingFriend(false);
    }
  }

  async function handleSelectFriend(friendId: string) {
    if (selectedFriendId === friendId) {
      setSelectedFriendId(null);
      return;
    }

    setSelectedFriendId(friendId);
    setFriendExpenseForm({
      description: '',
      amount: '',
      option: 'you_paid_equal',
    });

    if (!friendExpenses[friendId]) {
      try {
        await loadFriendExpenses(friendId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load direct friend expenses');
      }
    }
  }

  async function handleAddFriendExpense(friend: Friend, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      promptLogin('Please log in to add an expense.');
      return;
    }

    const amount = Number(friendExpenseForm.amount);
    if (!friendExpenseForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
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

    setIsSavingFriendExpense(true);
    setError('');

    try {
      const created = await api.addFriendExpense(friend.id, {
        description: friendExpenseForm.description.trim(),
        amount,
        ...payloadByOption[friendExpenseForm.option],
      });

      setFriendExpenses((current) => ({
        ...current,
        [friend.id]: [created, ...(current[friend.id] ?? [])],
      }));

      setFriendExpenseForm({
        description: '',
        amount: '',
        option: 'you_paid_equal',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add friend expense');
    } finally {
      setIsSavingFriendExpense(false);
    }
  }

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

  function getFriendExpenseSummary(expense: FriendExpense, friend: Friend) {
    const amount = Number(expense.amount);
    const share = amount / 2;
    const paidByMe = expense.payer.id === user?.id;

    if (expense.split_type === 'FULL_AMOUNT') {
      return paidByMe
        ? `${friend.name} owes you $${amount.toFixed(2)}`
        : `You owe ${friend.name} $${amount.toFixed(2)}`;
    }

    return paidByMe
      ? `${friend.name} owes you $${share.toFixed(2)}`
      : `You owe ${friend.name} $${share.toFixed(2)}`;
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
            <span className="text-sm font-semibold text-[#36b5ac]">Daily splits</span>
          </div>

          {!token ? (
            <div className="surface-card p-5 text-sm text-slate-600">
              Log in first, then add a signed-up friend by email.
            </div>
          ) : (
            <>
              <form className="surface-card space-y-3 p-4" onSubmit={handleAddFriend}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Friend email</span>
                  <input
                    required
                    autoComplete="email"
                    type="email"
                    value={friendEmail}
                    onChange={(event) => setFriendEmail(event.target.value)}
                    placeholder="friend@example.com"
                    className="form-input"
                  />
                </label>
                <button type="submit" disabled={isAddingFriend} className="primary-button w-full px-4 py-3">
                  {isAddingFriend ? 'Adding friend...' : 'Add friend'}
                </button>
                <p className="text-sm text-slate-500">
                  Use the exact email your friend used when signing up. Once added, both of you will see each other in Friends.
                </p>
              </form>

              {friends.length === 0 ? (
                <div className="surface-card p-5 text-sm text-slate-600">
                  No friends added yet. Add a signed-up friend by email to start daily direct splits.
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => {
                    const isOpen = selectedFriendId === friend.id;
                    const expenses = friendExpenses[friend.id] ?? [];

                    return (
                      <div key={friend.id} className="surface-card p-4">
                        <div className="flex items-center gap-4">
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
                            <p className="mt-1 text-sm text-[#36b5ac]">Mutual friend connection active</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleSelectFriend(friend.id)}
                            className="rounded-xl border border-[#cfe7e3] px-3 py-2 text-sm font-semibold text-[#2b938c]"
                          >
                            {isOpen ? 'Close' : 'Add expense'}
                          </button>
                        </div>

                        {isOpen ? (
                          <div className="mt-4 space-y-4 border-t border-[#ecece7] pt-4">
                            <form className="space-y-3" onSubmit={(event) => void handleAddFriendExpense(friend, event)}>
                              <label className="block space-y-2">
                                <span className="text-sm font-medium text-slate-700">Description</span>
                                <input
                                  required
                                  value={friendExpenseForm.description}
                                  onChange={(event) =>
                                    setFriendExpenseForm((current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
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
                                  value={friendExpenseForm.amount}
                                  onChange={(event) =>
                                    setFriendExpenseForm((current) => ({
                                      ...current,
                                      amount: event.target.value,
                                    }))
                                  }
                                  placeholder="20"
                                  className="form-input"
                                />
                              </label>

                              <label className="block space-y-2">
                                <span className="text-sm font-medium text-slate-700">How should this work?</span>
                                <select
                                  value={friendExpenseForm.option}
                                  onChange={(event) =>
                                    setFriendExpenseForm((current) => ({
                                      ...current,
                                      option: event.target.value as FriendExpenseOption,
                                    }))
                                  }
                                  className="form-input"
                                >
                                  <option value="you_paid_equal">You paid, split equally</option>
                                  <option value="friend_paid_equal">{friend.name} paid, split equally</option>
                                  <option value="you_paid_full">You paid, {friend.name} owes the full amount</option>
                                  <option value="friend_paid_full">{friend.name} paid, you owe the full amount</option>
                                </select>
                              </label>

                              <button
                                type="submit"
                                disabled={isSavingFriendExpense}
                                className="primary-button w-full px-4 py-3"
                              >
                                {isSavingFriendExpense ? 'Saving expense...' : 'Save direct expense'}
                              </button>
                            </form>

                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-slate-700">Recent direct expenses</p>
                              {expenses.length === 0 ? (
                                <div className="rounded-2xl bg-[#f7f8f4] px-4 py-3 text-sm text-slate-500">
                                  No direct expenses yet with {friend.name}.
                                </div>
                              ) : (
                                expenses.slice(0, 4).map((expense) => (
                                  <div key={expense.id} className="rounded-2xl bg-[#f7f8f4] px-4 py-3">
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
                                    <p className="mt-2 text-sm text-[#2b938c]">
                                      {getFriendExpenseSummary(expense, friend)}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
