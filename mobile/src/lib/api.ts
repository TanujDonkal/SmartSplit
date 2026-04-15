import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from './env';

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

type RequestOptions = RequestInit & {
  authToken?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const storedToken = await AsyncStorage.getItem('token');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

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

  return (await response.json()) as T;
}

export const api = {
  login: (data: { username: string; password: string }) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { name: string; username: string; email: string; password: string }) =>
    request<AuthUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveUsername: (data: { username: string }) =>
    request<{ email: string; username: string; name: string }>('/auth/resolve-username', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  syncCurrentUser: (data?: { name?: string; username?: string; email?: string }, authToken?: string) =>
    request<AuthUser>('/auth/me/sync', {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
      authToken,
    }),
};
