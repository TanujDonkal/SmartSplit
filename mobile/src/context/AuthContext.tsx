import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { api, type AuthUser } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(token: string | null, user: AuthUser | null) {
  if (token) {
    await AsyncStorage.setItem('token', token);
  } else {
    await AsyncStorage.removeItem('token');
  }

  if (user) {
    await AsyncStorage.setItem('user', JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem('user');
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  async function applyLocalState(nextToken: string | null, nextUser: AuthUser | null) {
    setToken(nextToken);
    setUser(nextUser);
    await persistSession(nextToken, nextUser);
  }

  async function syncSupabaseSessionUser(session: Session | null) {
    const accessToken = session?.access_token ?? null;
    if (!accessToken) {
      return null;
    }

    return await api.syncCurrentUser(
      {
        email: session?.user.email,
        name: String(session?.user.user_metadata?.name ?? '').trim() || undefined,
        username: String(session?.user.user_metadata?.username ?? '').trim() || undefined,
      },
      accessToken,
    );
  }

  useEffect(() => {
    async function bootstrap() {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.access_token) {
        setIsReady(true);
        return;
      }

      try {
        const syncedUser = await syncSupabaseSessionUser(session);
        await applyLocalState(session.access_token, syncedUser);
      } catch {
        await applyLocalState(null, null);
      } finally {
        setIsReady(true);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session?.access_token) {
          await applyLocalState(null, null);
          setIsReady(true);
          return;
        }

        try {
          const syncedUser = await syncSupabaseSessionUser(session);
          await applyLocalState(session.access_token, syncedUser);
        } catch {
          await applyLocalState(null, null);
        } finally {
          setIsReady(true);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isReady,
      isAuthenticated: Boolean(token && user),
      login: async (nextToken, nextUser) => {
        await applyLocalState(nextToken, nextUser);
      },
      updateUser: async (nextUser) => {
        await applyLocalState(token, nextUser);
      },
      logout: async () => {
        await supabase.auth.signOut();
        await applyLocalState(null, null);
      },
    }),
    [isReady, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
