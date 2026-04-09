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
    username: '',
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
      const resolved = await api.resolveUsername({
        username: form.username.trim().toLowerCase(),
      });

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
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
      const syncedUser = await api.syncCurrentUser(
        {
          email: data.user.email ?? resolved.email,
          name: String(data.user.user_metadata?.name ?? '').trim() || undefined,
          username:
            String(data.user.user_metadata?.username ?? '').trim() ||
            form.username.trim().toLowerCase(),
        },
        accessToken,
      );

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
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#36b5ac]">
              Welcome Back
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">
              Pick up your friends, groups, and balances exactly where you left them.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              SmartSplit keeps everyday direct splits and group workflows in one clean space,
              whether you are logging in from mobile, tablet, or desktop.
            </p>
          </div>

          <div>
            <img
              src="/smartsplit-logo.png"
              alt="SmartSplit"
              className="h-auto w-full max-w-[18rem] object-contain"
            />
            <div className="mt-6 rounded-[1.5rem] bg-white/85 px-4 py-4 text-sm text-slate-500">
              Friends, groups, receipts, and settlements stay synced across screen sizes.
            </div>
          </div>
        </section>

        <div className="auth-card auth-form-panel px-4 py-6 md:px-0 md:py-0">
          <div className="auth-back-link">
            <Link to="/" className="text-3xl leading-none text-slate-700">
              &lsaquo;
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <img
              src="/smartsplit-logo.png"
              alt="SmartSplit"
              className="mx-auto mb-10 h-auto w-full max-w-[14rem] object-contain md:mx-0"
            />
            <h1 className="mb-8 text-4xl font-semibold text-slate-900">Log in</h1>

            {!isReady ? <NoticeBanner tone="info" message="Checking your session..." /> : null}

            {infoMessage ? (
              <NoticeBanner
                tone="success"
                message={infoMessage}
                onClose={() => setInfoMessage('')}
              />
            ) : null}

            {error ? (
              <NoticeBanner tone="error" message={error} onClose={() => setError('')} />
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Username</span>
                <input
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, username: event.target.value }))
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

            <p className="mt-6 text-center text-sm font-medium text-[#2b938c] md:text-left">
              <Link to="/forgot-password" className="underline underline-offset-2">
                Forgot your password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
