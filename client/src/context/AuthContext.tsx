import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const accessToken = data.session?.access_token ?? null;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        setToken(accessToken);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token ?? null;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
