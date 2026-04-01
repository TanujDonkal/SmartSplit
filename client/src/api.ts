const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  default_currency?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse extends AuthUser {
  created_at: string;
}

export interface GroupMember {
  id?: string;
  group_id?: string;
  user_id?: string;
  user: AuthUser;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members: GroupMember[];
  _count?: {
    expenses: number;
  };
}

export interface Expense {
  id: string;
  group_id?: string;
  description: string;
  amount: string;
  note?: string | null;
  receipt_data?: string | null;
  incurred_on: string;
  created_at: string;
  updated_at?: string;
  payer: AuthUser;
  comments?: ExpenseComment[];
  splits?: Array<{
    id: string;
    user_id: string;
    amount_owed: string;
    user: AuthUser;
  }>;
}

export interface Balance {
  user: AuthUser;
  balance: number;
}

export interface Settlement {
  from: AuthUser;
  to: AuthUser;
  amount: number;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
}

export interface FriendExpense {
  id: string;
  description: string;
  amount: string;
  split_type: 'EQUAL' | 'FULL_AMOUNT';
  activity_type: 'EXPENSE' | 'SETTLEMENT';
  note?: string | null;
  receipt_data?: string | null;
  incurred_on: string;
  created_at: string;
  updated_at?: string;
  payer: AuthUser;
  comments?: FriendExpenseComment[];
}

export interface ExpenseComment {
  id: string;
  body: string;
  created_at: string;
  author: AuthUser;
}

export interface FriendExpenseComment {
  id: string;
  body: string;
  created_at: string;
  author: AuthUser;
}

export interface FriendSummary {
  friend: Friend;
  net_balance: number;
  expense_count: number;
  you_paid_total: number;
  friend_paid_total: number;
  last_activity: string | null;
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { name: string; email: string; password: string }) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  requestPasswordResetOtp: (data: { email: string }) =>
    request<{ message: string }>('/auth/forgot-password/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resetPasswordWithOtp: (data: { email: string; otp: string; password: string }) =>
    request<{ message: string }>('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAccount: () =>
    request<{ message: string }>('/auth/me', {
      method: 'DELETE',
    }),
  updateProfile: (data: { name: string; email: string; default_currency: string }) =>
    request<AuthUser>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getFriends: () => request<Friend[]>('/friends'),
  addFriend: (data: { email: string }) =>
    request<Friend>('/friends', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getFriendSummary: (friendId: string) =>
    request<FriendSummary>(`/friends/${friendId}/summary`),
  getFriendExpenses: (friendId: string) =>
    request<FriendExpense[]>(`/friends/${friendId}/expenses`),
  addFriendExpense: (
    friendId: string,
    data: {
      description: string;
      amount: number;
      paid_by: 'self' | 'friend';
      split_type: 'equal' | 'full_amount';
      note?: string;
      receipt_data?: string;
      incurred_on?: string;
    },
  ) =>
    request<FriendExpense>(`/friends/${friendId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getFriendExpenseDetail: (friendId: string, expenseId: string) =>
    request<FriendExpense>(`/friends/${friendId}/expenses/${expenseId}`),
  updateFriendExpense: (
    friendId: string,
    expenseId: string,
    data: {
      description?: string;
      amount?: number;
      paid_by?: 'self' | 'friend';
      split_type?: 'equal' | 'full_amount';
      note?: string;
      receipt_data?: string | null;
      incurred_on?: string;
    },
  ) =>
    request<FriendExpense>(`/friends/${friendId}/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteFriendExpense: (friendId: string, expenseId: string) =>
    request<{ message: string }>(`/friends/${friendId}/expenses/${expenseId}`, {
      method: 'DELETE',
    }),
  addFriendExpenseComment: (friendId: string, expenseId: string, data: { body: string }) =>
    request<FriendExpenseComment>(`/friends/${friendId}/expenses/${expenseId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  settleUpFriend: (friendId: string) =>
    request<FriendExpense>(`/friends/${friendId}/settle`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getGroups: () => request<Group[]>('/groups'),
  createGroup: (data: { name: string }) =>
    request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addGroupMember: (groupId: string, data: { email: string }) =>
    request<GroupMember>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getGroupExpenses: (groupId: string) => request<Expense[]>(`/expenses/group/${groupId}`),
  getGroupBalances: (groupId: string) => request<Balance[]>(`/groups/${groupId}/balances`),
  getGroupSettlements: (groupId: string) =>
    request<Settlement[]>(`/groups/${groupId}/settlements`),
  addExpense: (data: {
    group_id: string;
    amount: number;
    description: string;
    note?: string;
    receipt_data?: string;
    incurred_on?: string;
  }) =>
    request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getExpenseDetail: (expenseId: string) => request<Expense>(`/expenses/${expenseId}`),
  updateExpense: (
    expenseId: string,
    data: {
      description?: string;
      amount?: number;
      note?: string;
      receipt_data?: string | null;
      incurred_on?: string;
    },
  ) =>
    request<Expense>(`/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteExpense: (expenseId: string) =>
    request<{ message: string }>(`/expenses/${expenseId}`, {
      method: 'DELETE',
    }),
  addExpenseComment: (expenseId: string, data: { body: string }) =>
    request<ExpenseComment>(`/expenses/${expenseId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
