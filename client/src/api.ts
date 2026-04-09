const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
export const SUPPORTED_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'INR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

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
  currency: SupportedCurrency;
  exchange_rate_to_base: string;
  converted_amount: string;
  note?: string | null;
  receipt_data?: string | null;
  receipt_storage_key?: string | null;
  incurred_on: string;
  created_at: string;
  updated_at?: string;
  payer: AuthUser;
  comments?: ExpenseComment[];
  splits?: Array<{
    id: string;
    user_id: string;
    amount_owed: string;
    converted_amount_owed: string;
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
  currency: SupportedCurrency;
  exchange_rate_to_base: string;
  converted_amount: string;
  split_type: 'EQUAL' | 'FULL_AMOUNT';
  activity_type: 'EXPENSE' | 'SETTLEMENT';
  note?: string | null;
  receipt_data?: string | null;
  receipt_storage_key?: string | null;
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

export interface GroupExpenseSplitInput {
  user_id: string;
  amount_owed: number;
}

export interface ParsedReceiptResult {
  receipt_data: string;
  receipt_storage_key?: string | null;
  parsed: {
    description: string;
    amount: number | null;
    currency: SupportedCurrency;
    incurred_on: string | null;
    note: string | null;
  };
}

export interface AssistantChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authToken?: string,
): Promise<T> {
  const token = authToken ?? localStorage.getItem('token');
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
  syncCurrentUser: (data?: { name?: string; email?: string }, authToken?: string) =>
    request<AuthUser>('/auth/me/sync', {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }, authToken),
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
      currency?: SupportedCurrency;
      paid_by: 'self' | 'friend';
      split_type: 'equal' | 'full_amount';
      note?: string;
      receipt_data?: string;
      receipt_storage_key?: string | null;
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
      currency?: SupportedCurrency;
      paid_by?: 'self' | 'friend';
      split_type?: 'equal' | 'full_amount';
      note?: string;
      receipt_data?: string | null;
      receipt_storage_key?: string | null;
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
    currency?: SupportedCurrency;
    description: string;
    note?: string;
    receipt_data?: string;
    receipt_storage_key?: string | null;
    incurred_on?: string;
    split_type?: 'equal' | 'manual';
    splits?: GroupExpenseSplitInput[];
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
      currency?: SupportedCurrency;
      note?: string;
      receipt_data?: string | null;
      receipt_storage_key?: string | null;
      incurred_on?: string;
      split_type?: 'equal' | 'manual';
      splits?: GroupExpenseSplitInput[];
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
  parseReceipt: (data: {
    receipt_data?: string;
    existing_receipt_data?: string | null;
    existing_receipt_storage_key?: string | null;
  }) =>
    request<ParsedReceiptResult>('/receipts/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  askAssistant: (data: { messages: AssistantChatMessage[] }) =>
    request<{ reply: string }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
