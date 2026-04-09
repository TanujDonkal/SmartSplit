import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import NoticeBanner from '../components/NoticeBanner';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';

interface LocationState {
  message?: string;
}

export default function Login() {
  const { isAuthenticated, isReady, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [infoMessage, setInfoMessage] = useState(state?.message ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setInfoMessage(state?.message ?? '');
  }, [state?.message]);

  useEffect(() => {
    if (!infoMessage) {
      return;
    }

    const timer = window.setTimeout(() => setInfoMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

  if (isReady && isAuthenticated) {
    return <Navigate to="/dashboard?tab=friends" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    let signedIn = false;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (authError) {
        throw authError;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error('No authenticated session was returned');
      }

      signedIn = true;
      const syncedUser = await api.syncCurrentUser({
        email: data.user.email ?? form.email.trim().toLowerCase(),
        name: String(data.user.user_metadata?.name ?? '').trim() || undefined,
      }, accessToken);

      login(accessToken, syncedUser);
      navigate('/dashboard?tab=friends');
    } catch (err) {
      if (signedIn) {
        await supabase.auth.signOut();
      }
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[30rem] flex-col px-4 py-6">
      <div className="mb-8 flex items-center">
        <Link to="/" className="text-3xl leading-none text-slate-700">
          &lsaquo;
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md">
        <img
          src="/smartsplit-logo.png"
          alt="SmartSplit"
          className="mx-auto mb-10 h-auto w-full max-w-[14rem] object-contain"
        />
        <h1 className="mb-8 text-4xl font-semibold text-slate-900">Log in</h1>

        {!isReady ? (
          <div className="mb-4 rounded-2xl border border-[#e8e8e0] bg-white px-4 py-3 text-sm text-slate-500">
            Checking your session...
          </div>
        ) : null}

        {infoMessage ? (
          <NoticeBanner tone="success" message={infoMessage} onClose={() => setInfoMessage('')} />
        ) : null}

        {error ? (
          <NoticeBanner tone="error" message={error} onClose={() => setError('')} />
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email address</span>
            <input
              required
              autoComplete="email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              className="form-input"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              required
              autoComplete="current-password"
              minLength={6}
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              className="form-input"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-button w-full px-4 py-4 text-lg"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-[#2b938c]">
          <Link to="/forgot-password" className="underline underline-offset-2">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
