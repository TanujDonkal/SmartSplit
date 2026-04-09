import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, SUPPORTED_CURRENCIES } from '../api';
import type { AssistantChatMessage, Expense, Friend, Group, SupportedCurrency } from '../api';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';

type DashboardExpense = Expense & { groupName: string };
type ChatMessage = {
  id: string;
  role: AssistantChatMessage['role'];
  text: string;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Dashboard() {
  const { token, user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'groups';

  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupName, setGroupName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    default_currency: 'CAD',
  });
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      text: 'Hi, I am your SmartSplit assistant. Ask me about splitting with a friend, creating a group, or settling balances.',
    },
  ]);
  const [isSendingAiMessage, setIsSendingAiMessage] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTarget, setExpenseTarget] = useState<'friend' | 'group'>('friend');
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [quickExpenseForm, setQuickExpenseForm] = useState({
    description: '',
    amount: '',
    currency: 'CAD' as SupportedCurrency,
    note: '',
    incurred_on: new Date().toISOString().slice(0, 10),
    receipt_data: '',
    receipt_storage_key: '' as string | null,
    option: 'you_paid_equal' as
      | 'you_paid_equal'
      | 'friend_paid_equal'
      | 'you_paid_full'
      | 'friend_paid_full',
  });
  const [recentExpenses, setRecentExpenses] = useState<DashboardExpense[]>([]);
  const [dashboardNetBalance, setDashboardNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSavingQuickExpense, setIsSavingQuickExpense] = useState(false);
  const [isParsingQuickReceipt, setIsParsingQuickReceipt] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [groupList, friendList] = await Promise.all([
        api.getGroups(),
        api.getFriends(),
      ]);
      setGroups(groupList);
      setFriends(friendList);

      const [expenseLists, groupBalanceLists, friendSummaries] = await Promise.all([
        Promise.all(groupList.map((group) => api.getGroupExpenses(group.id))),
        Promise.all(groupList.map((group) => api.getGroupBalances(group.id))),
        Promise.all(friendList.map((friend) => api.getFriendSummary(friend.id))),
      ]);

      const flattened = groupList.flatMap((group, index) =>
        expenseLists[index].map((expense) => ({
          ...expense,
          groupName: group.name,
        })),
      );

      flattened.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setRecentExpenses(flattened.slice(0, 10));

      const groupNet = groupBalanceLists.reduce((total, balanceList) => {
        const mine = balanceList.find((entry) => entry.user.id === user?.id);
        return total + (mine?.balance ?? 0);
      }, 0);

      const friendNet = friendSummaries.reduce(
        (total, summary) => total + summary.net_balance,
        0,
      );

      setDashboardNetBalance(groupNet + friendNet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!token) {
      setGroups([]);
      setFriends([]);
      setRecentExpenses([]);
      setDashboardNetBalance(0);
      setIsLoading(false);
      return;
    }

    void loadDashboard();
  }, [loadDashboard, token]);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      default_currency: user?.default_currency ?? 'CAD',
    });
  }, [user?.default_currency, user?.email, user?.name]);

  useEffect(() => {
    setQuickExpenseForm((current) => ({
      ...current,
      currency: (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD',
    }));
  }, [user?.default_currency]);

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
      navigate(`/groups/${created.id}`);
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

  function promptLogin(message: string) {
    navigate('/login', { state: { message } });
  }

  async function handleAskAiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = aiInput.trim();
    if (!trimmed || isSendingAiMessage) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setAiInput('');

    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setIsSendingAiMessage(true);

    try {
      const response = await api.askAssistant({
        messages: nextMessages.map((message) => ({
          role: message.role,
          text: message.text,
        })),
      });

      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now() + 1}`,
          role: 'assistant',
          text: response.reply,
        },
      ]);
    } catch (err) {
      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now() + 1}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? `I couldn't reach SmartSplit AI right now: ${err.message}`
              : 'I could not reach SmartSplit AI right now.',
        },
      ]);
    } finally {
      setIsSendingAiMessage(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Delete account? All your SmartSplit data will be deleted and this cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    const secondConfirm = window.confirm(
      'Please confirm again: your account and all related data will be permanently deleted.',
    );

    if (!secondConfirm) {
      return;
    }

    setIsDeletingAccount(true);
    setError('');

    try {
      await api.deleteAccount();
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      promptLogin('Please log in to edit your profile.');
      return;
    }

    if (!profileForm.name.trim() || !profileForm.email.trim() || !profileForm.default_currency) {
      setError('Name, email, and currency are required');
      return;
    }

    setIsSavingProfile(true);
    setError('');

    try {
      const normalizedEmail = profileForm.email.trim().toLowerCase();
      const trimmedName = profileForm.name.trim();
      const emailChanged = normalizedEmail !== user?.email?.trim().toLowerCase();

      const { data: authUpdate, error: authError } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: normalizedEmail } : {}),
        data: {
          name: trimmedName,
        },
      });

      if (authError) {
        throw authError;
      }

      const updated = await api.updateProfile({
        name: trimmedName,
        email: authUpdate.user?.email?.trim().toLowerCase() ?? normalizedEmail,
        default_currency: profileForm.default_currency,
      });

      updateUser(updated);

      if (emailChanged && (authUpdate.user?.email?.trim().toLowerCase() ?? '') !== normalizedEmail) {
        setError(
          'Profile saved. Check your inbox to confirm the new email address in Supabase, then save again if needed.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function readFileAsDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Unable to read receipt image'));
      reader.readAsDataURL(file);
    });
  }

  function resetQuickExpenseForm() {
    setQuickExpenseForm({
      description: '',
      amount: '',
      currency: (user?.default_currency as SupportedCurrency | undefined) ?? 'CAD',
      note: '',
      incurred_on: new Date().toISOString().slice(0, 10),
      receipt_data: '',
      receipt_storage_key: null,
      option: 'you_paid_equal',
    });
  }

  async function handleQuickReceiptChange(file: File | null) {
    if (!file) {
      setQuickExpenseForm((current) => ({ ...current, receipt_data: '', receipt_storage_key: null }));
      return;
    }

    try {
      const receiptData = await readFileAsDataUrl(file);
      setQuickExpenseForm((current) => ({
        ...current,
        receipt_data: receiptData,
        receipt_storage_key: null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read receipt');
    }
  }

  async function handleParseQuickReceipt() {
    if (!quickExpenseForm.receipt_data) {
      setError('Upload a receipt first');
      return;
    }

    setIsParsingQuickReceipt(true);
    setError('');

    try {
      const result = await api.parseReceipt({
        receipt_data: quickExpenseForm.receipt_data,
        existing_receipt_storage_key: quickExpenseForm.receipt_storage_key,
      });

      setQuickExpenseForm((current) => ({
        ...current,
        receipt_data: result.receipt_data,
        receipt_storage_key: result.receipt_storage_key ?? null,
        description: result.parsed.description || current.description,
        amount: result.parsed.amount !== null ? String(result.parsed.amount.toFixed(2)) : current.amount,
        currency: result.parsed.currency ?? current.currency,
        incurred_on: result.parsed.incurred_on
          ? new Date(result.parsed.incurred_on).toISOString().slice(0, 10)
          : current.incurred_on,
        note: result.parsed.note ?? current.note,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse receipt');
    } finally {
      setIsParsingQuickReceipt(false);
    }
  }

  async function handleQuickExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      promptLogin('Please log in to add an expense.');
      return;
    }

    const amount = Number(quickExpenseForm.amount);
    if (!quickExpenseForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a description and an amount greater than zero');
      return;
    }

    setIsSavingQuickExpense(true);
    setError('');

    try {
      if (expenseTarget === 'friend') {
        if (!selectedFriendId) {
          throw new Error('Select a friend first');
        }

        const payloadByOption: Record<
          typeof quickExpenseForm.option,
          { paid_by: 'self' | 'friend'; split_type: 'equal' | 'full_amount' }
        > = {
          you_paid_equal: { paid_by: 'self', split_type: 'equal' },
          friend_paid_equal: { paid_by: 'friend', split_type: 'equal' },
          you_paid_full: { paid_by: 'self', split_type: 'full_amount' },
          friend_paid_full: { paid_by: 'friend', split_type: 'full_amount' },
        };

        await api.addFriendExpense(selectedFriendId, {
          description: quickExpenseForm.description.trim(),
          amount,
          currency: quickExpenseForm.currency,
          note: quickExpenseForm.note.trim(),
          receipt_data: quickExpenseForm.receipt_data || undefined,
          receipt_storage_key: quickExpenseForm.receipt_storage_key || undefined,
          incurred_on: new Date(`${quickExpenseForm.incurred_on}T12:00:00`).toISOString(),
          ...payloadByOption[quickExpenseForm.option],
        });

        setShowExpenseModal(false);
        resetQuickExpenseForm();
        navigate(`/friends/${selectedFriendId}`);
        return;
      }

      if (!selectedGroupId) {
        throw new Error('Select a group first');
      }

      await api.addExpense({
        group_id: selectedGroupId,
        description: quickExpenseForm.description.trim(),
        amount,
        currency: quickExpenseForm.currency,
        note: quickExpenseForm.note.trim(),
        receipt_data: quickExpenseForm.receipt_data || undefined,
        receipt_storage_key: quickExpenseForm.receipt_storage_key || undefined,
        incurred_on: new Date(`${quickExpenseForm.incurred_on}T12:00:00`).toISOString(),
      });

      setShowExpenseModal(false);
      resetQuickExpenseForm();
      navigate(`/groups/${selectedGroupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add expense');
    } finally {
      setIsSavingQuickExpense(false);
    }
  }

  const dashboardTone =
    dashboardNetBalance > 0.005
      ? 'text-[#36b5ac]'
      : dashboardNetBalance < -0.005
        ? 'text-[#ff9630]'
        : 'text-slate-700';

  const dashboardOwedMessage =
    dashboardNetBalance > 0.005
      ? `Overall, you are owed ${formatMoney(Math.abs(dashboardNetBalance), 'CAD')}`
      : dashboardNetBalance < -0.005
        ? `Overall, you owe ${formatMoney(Math.abs(dashboardNetBalance), 'CAD')}`
        : `Overall, you are settled up in CAD`;

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
            <h1 className={`mt-2 text-[1.9rem] font-semibold leading-tight ${dashboardTone}`}>
              {dashboardOwedMessage}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowAiChat(true)}
            className="action-chip px-3.5 py-2.5 text-sm font-semibold"
          >
            <span className="action-chip-icon">AI</span>
            <span>Ask AI</span>
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
                  {friends.map((friend) => (
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
                        <Link
                          to={`/friends/${friend.id}`}
                          className="rounded-xl border border-[#cfe7e3] px-3 py-2 text-sm font-semibold text-[#2b938c]"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  ))}
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
                      <p className="mt-1 text-sm text-slate-500">{group.members.length} members</p>
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
                        {formatMoney(Number(expense.amount), expense.currency)} in {expense.groupName}
                      </p>
                      {expense.currency !== 'CAD' ? (
                        <p className="mt-1 text-xs text-slate-400">
                          Converted: {formatMoney(Number(expense.converted_amount), 'CAD')}
                        </p>
                      ) : null}
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

          <form className="surface-card p-5" onSubmit={handleSaveProfile}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Profile settings</h3>
              <p className="mt-1 text-sm text-slate-500">
                Update your account name, email, and default currency.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  required
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email address</span>
                <input
                  required
                  autoComplete="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Default currency</span>
                <select
                  value={profileForm.default_currency}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      default_currency: event.target.value,
                    }))
                  }
                  className="form-input"
                >
                  {['CAD', 'USD', 'EUR', 'GBP', 'INR'].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="primary-button mt-5 w-full px-4 py-3 text-sm"
            >
              {isSavingProfile ? 'Saving profile...' : 'Save profile'}
            </button>
          </form>

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
                  <span className="text-slate-400">{'>'}</span>
                </div>
              ))}
            </div>
          </div>

          {token ? (
            <div className="surface-card border border-[#f6c9bc] p-5">
              <h3 className="text-lg font-semibold text-slate-900">Delete account</h3>
              <p className="mt-2 text-sm text-slate-600">
                Your account and all related data will be permanently deleted. This cannot be undone.
              </p>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => void handleDeleteAccount()}
                className="mt-4 w-full rounded-xl bg-[#d96543] px-4 py-3 text-sm font-semibold text-white"
              >
                {isDeletingAccount ? 'Deleting account...' : 'Delete account'}
              </button>
            </div>
          ) : null}
        </section>
      )}

      <button
        type="button"
        onClick={() =>
          token ? setShowExpenseModal(true) : promptLogin('Please log in to add an expense.')
        }
        className="floating-action fixed bottom-24 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-[20rem] -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[#36b5ac] px-5 py-4 text-base font-semibold text-white"
      >
        <span className="text-lg leading-none">[]</span>
        <span>Add expense</span>
      </button>

      {showExpenseModal ? (
        <div className="fixed inset-0 z-40 bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-h-[calc(100vh-3rem)] w-full max-w-[30rem] overflow-y-auto rounded-[1.8rem] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Add expense</h2>
                <p className="mt-1 text-sm text-slate-500">Choose whether this is with a friend or in a group.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowExpenseModal(false);
                  resetQuickExpenseForm();
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d8ddd9] bg-white text-lg text-slate-500"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExpenseTarget('friend')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  expenseTarget === 'friend'
                    ? 'bg-[#36b5ac] text-white'
                    : 'bg-[#f4f6f4] text-slate-700'
                }`}
              >
                With a friend
              </button>
              <button
                type="button"
                onClick={() => setExpenseTarget('group')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  expenseTarget === 'group'
                    ? 'bg-[#36b5ac] text-white'
                    : 'bg-[#f4f6f4] text-slate-700'
                }`}
              >
                In a group
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleQuickExpenseSubmit}>
              {expenseTarget === 'friend' ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Choose friend</span>
                  <select
                    value={selectedFriendId}
                    onChange={(event) => setSelectedFriendId(event.target.value)}
                    className="form-input"
                  >
                    <option value="">Select a friend</option>
                    {friends.map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {friend.name} ({friend.email})
                      </option>
                    ))}
                  </select>
                  {friends.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Add a friend first from the Friends tab before creating a direct expense.
                    </p>
                  ) : null}
                </label>
              ) : (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Choose group</span>
                  <select
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    className="form-input"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {groups.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Create a group first from the Groups tab before adding a group expense.
                    </p>
                  ) : null}
                </label>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <input
                  required
                  value={quickExpenseForm.description}
                  onChange={(event) =>
                    setQuickExpenseForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Dinner"
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
                  value={quickExpenseForm.amount}
                  onChange={(event) =>
                    setQuickExpenseForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="20"
                  className="form-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Currency</span>
                <select
                  value={quickExpenseForm.currency}
                  onChange={(event) =>
                    setQuickExpenseForm((current) => ({
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
                <p className="text-xs text-slate-400">
                  Balances and settlements are normalized to CAD behind the scenes.
                </p>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Expense date</span>
                <input
                  type="date"
                  value={quickExpenseForm.incurred_on}
                  onChange={(event) =>
                    setQuickExpenseForm((current) => ({ ...current, incurred_on: event.target.value }))
                  }
                  className="form-input"
                />
              </label>

              {expenseTarget === 'friend' ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">How should this split work?</span>
                  <select
                    value={quickExpenseForm.option}
                    onChange={(event) =>
                      setQuickExpenseForm((current) => ({
                        ...current,
                        option: event.target.value as typeof current.option,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="you_paid_equal">You paid, split equally</option>
                    <option value="friend_paid_equal">Friend paid, split equally</option>
                    <option value="you_paid_full">You paid, friend owes full amount</option>
                    <option value="friend_paid_full">Friend paid, you owe full amount</option>
                  </select>
                </label>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Optional note</span>
                <textarea
                  rows={3}
                  value={quickExpenseForm.note}
                  onChange={(event) =>
                    setQuickExpenseForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Add a quick note"
                  className="form-input resize-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Optional receipt photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleQuickReceiptChange(event.target.files?.[0] ?? null)}
                  className="form-input"
                />
              </label>

              {quickExpenseForm.receipt_data ? (
                <div className="space-y-3">
                  <img
                    src={quickExpenseForm.receipt_data}
                    alt="Receipt preview"
                    className="h-40 w-full rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => void handleParseQuickReceipt()}
                    disabled={isParsingQuickReceipt}
                    className="outline-button w-full px-4 py-3 text-sm"
                  >
                    {isParsingQuickReceipt ? 'Parsing receipt...' : 'Parse receipt with AI'}
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSavingQuickExpense}
                className="primary-button w-full px-4 py-4 text-lg"
              >
                {isSavingQuickExpense ? 'Saving expense...' : 'Save expense'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {showAiChat ? (
        <div className="fixed inset-0 z-50 bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-[1.8rem] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between border-b border-[#e8e8e0] px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">SmartSplit AI</h2>
                <p className="mt-1 text-sm text-slate-500">Ask about friends, groups, expenses, or settlements.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiChat(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d8ddd9] bg-white text-lg text-slate-500"
              >
                x
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'assistant'
                      ? 'bg-[#f4f8f7] text-slate-700'
                      : 'ml-auto bg-[#36b5ac] text-white'
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <form className="border-t border-[#e8e8e0] px-4 py-4" onSubmit={handleAskAiSubmit}>
              <div className="flex gap-3">
                <input
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  placeholder="Ask how to split something..."
                  className="form-input"
                  disabled={isSendingAiMessage}
                />
                <button
                  type="submit"
                  className="primary-button px-5 py-3 text-sm"
                  disabled={isSendingAiMessage}
                >
                  {isSendingAiMessage ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
