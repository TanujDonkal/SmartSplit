import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from './env';

export const SUPPORTED_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'INR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface AuthUser {
  id: string;
  name: string;
  username: string;
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
  username: string;
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

export interface AssistantChatMessage {
  role: 'assistant' | 'user';
  text: string;
}

type RequestOptions = RequestInit & {
  authToken?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const storedToken = await AsyncStorage.getItem('token');
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = options.authToken ?? storedToken;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login: (data: { username: string; password: string }) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { name: string; username: string; email: string; password: string }) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  validateRegistration: (data: { username: string; email: string }) =>
    request<{ ok: true }>('/auth/validate-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveUsername: (data: { username: string }) =>
    request<{ email: string; username: string; name: string }>('/auth/resolve-username', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAccount: () =>
    request<{ message: string }>('/auth/me', {
      method: 'DELETE',
    }),
  updateProfile: (data: {
    name: string;
    username: string;
    email: string;
    default_currency: string;
  }) =>
    request<AuthUser>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  syncCurrentUser: (
    data?: { name?: string; username?: string; email?: string },
    authToken?: string,
  ) =>
    request<AuthUser>('/auth/me/sync', {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
      authToken,
    }),
  getFriends: () => request<Friend[]>('/friends'),
  addFriend: (data: { username: string }) =>
    request<Friend>('/friends', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getFriendSummary: (friendId: string) => request<FriendSummary>(`/friends/${friendId}/summary`),
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
  addFriendExpenseComment: (
    friendId: string,
    expenseId: string,
    data: { body: string },
  ) =>
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
  addGroupMember: (groupId: string, data: { username: string }) =>
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
  askAssistant: (data: { messages: AssistantChatMessage[] }) =>
    request<{ reply: string }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
