import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import NoticeBanner from '../components/NoticeBanner';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';

export default function Register() {
  const { isAuthenticated, isReady, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isReady && isAuthenticated) {
    return <Navigate to="/dashboard?tab=friends" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    let signedIn = false;

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            name: form.name.trim(),
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (data.session?.access_token && data.user?.email) {
        signedIn = true;
        const syncedUser = await api.syncCurrentUser({
          email: data.user.email,
          name: form.name.trim(),
        }, data.session.access_token);
        login(data.session.access_token, syncedUser);
        navigate('/dashboard?tab=friends', { replace: true });
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          message:
            'Account created. Check your email to confirm your account, then log in.',
        },
      });
    } catch (err) {
      if (signedIn) {
        await supabase.auth.signOut();
      }
      setError(err instanceof Error ? err.message : 'Unable to create account');
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
              Join SmartSplit
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">
              Create one account for direct splits, group trips, receipts, and account control.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              The same account gives you friend balances, group expenses, AI-assisted receipts, and clean account management across all screen sizes.
            </p>
          </div>

          <div className="space-y-4">
            <img
              src="/smartsplit-logo.png"
              alt="SmartSplit"
              className="h-auto w-full max-w-[18rem] object-contain"
            />
            <div className="rounded-[1.5rem] bg-white/85 px-4 py-4 text-sm text-slate-500">
              Sign up once, then move between desktop, tablet, and mobile without changing the flow.
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
            <h1 className="mb-8 text-4xl font-semibold text-slate-900">Sign up</h1>

            {!isReady ? (
              <NoticeBanner tone="info" message="Checking your session..." />
            ) : null}

            {error ? (
              <NoticeBanner tone="error" message={error} onClose={() => setError('')} />
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="form-input"
                />
              </label>

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
                  autoComplete="new-password"
                  minLength={6}
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  className="form-input"
                />
                <p className="text-sm text-slate-500">Minimum 6 characters</p>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Confirm password</span>
                <input
                  required
                  autoComplete="new-password"
                  minLength={6}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="primary-button w-full px-4 py-4 text-lg"
              >
                {isSubmitting ? 'Creating account...' : 'Next'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
