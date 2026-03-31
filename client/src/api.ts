const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
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
  created_at: string;
  payer: AuthUser;
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
  getGroupExpenses: (groupId: string) => request<Expense[]>(`/expenses/${groupId}`),
  getGroupBalances: (groupId: string) => request<Balance[]>(`/groups/${groupId}/balances`),
  getGroupSettlements: (groupId: string) =>
    request<Settlement[]>(`/groups/${groupId}/settlements`),
  addExpense: (data: { group_id: string; amount: number; description: string }) =>
    request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
