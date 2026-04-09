import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface AuthContextType {
  token: string | null;
  user: { id: string; name: string; email: string; default_currency?: string } | null;
  login: (token: string, user: { id: string; name: string; email: string; default_currency?: string }) => void;
  updateUser: (user: { id: string; name: string; email: string; default_currency?: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<AuthContextType['user']>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

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
    void supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token ?? null;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        setToken(accessToken);
        void syncSupabaseSessionUser(data.session).catch((error) => {
          console.error('Auth session sync error:', error);
          clearSessionState();
          void supabase.auth.signOut();
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token ?? null;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        void syncSupabaseSessionUser(session).catch((error) => {
          console.error('Auth state sync error:', error);
          clearSessionState();
          void supabase.auth.signOut();
        });
      } else {
        clearSessionState();
      }

      setToken(accessToken);
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

  return (
    <AuthContext.Provider value={{ token, user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
