import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface AuthContextType {
  token: string | null;
  user: { id: string; name: string; email: string; default_currency?: string } | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: { id: string; name: string; email: string; default_currency?: string }) => void;
  updateUser: (user: { id: string; name: string; email: string; default_currency?: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [isReady, setIsReady] = useState(false);

  const login = (token: string, user: { id: string; name: string; email: string; default_currency?: string }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const updateUser = (user: { id: string; name: string; email: string; default_currency?: string }) => {
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const clearSessionState = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const syncSupabaseSessionUser = async (session: Session | null) => {
    const accessToken = session?.access_token ?? null;

    if (!accessToken) {
      return;
    }

    const response = await fetch(`${API_BASE}/auth/me/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: session?.user.email,
        name: String(session?.user.user_metadata?.name ?? '').trim() || undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Sync failed (${response.status})`);
    }

    const syncedUser = (await response.json()) as AuthContextType['user'];
    localStorage.setItem('user', JSON.stringify(syncedUser));
    setUser(syncedUser);
  };
  const logout = async () => {
    await supabase.auth.signOut();
    clearSessionState();
  };

  useEffect(() => {
    const applySession = async (session: Session | null, errorLabel: string) => {
      const accessToken = session?.access_token ?? null;

      if (!accessToken) {
        clearSessionState();
        setIsReady(true);
        return;
      }

      localStorage.setItem('token', accessToken);
      setToken(accessToken);

      try {
        await syncSupabaseSessionUser(session);
      } catch (error) {
        console.error(errorLabel, error);
        clearSessionState();
        await supabase.auth.signOut();
      } finally {
        setIsReady(true);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session, 'Auth session sync error:');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session, 'Auth state sync error:');
    });

    // Sync state if localStorage changes in another tab
    const handle = () => {
      setToken(localStorage.getItem('token'));
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener('storage', handle);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handle);
    };
  }, []);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{ token, user, isReady, isAuthenticated, login, updateUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
