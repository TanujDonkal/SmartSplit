import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/useAuth';

interface LocationState {
  message?: string;
}

export default function Login() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.login(form);
      login(response.token, response.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-sky-200 bg-white/70 px-4 py-1 text-sm tracking-[0.22em] text-sky-700 uppercase shadow-sm">
            SmartSplit
          </p>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              A bright, calm way to split every shared expense without awkward follow-ups.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Create a group, add your friends, log what you paid, and let SmartSplit handle balances and settlements with clarity.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Shared groups</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Organized</p>
            </div>
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Equal splits</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Automatic</p>
            </div>
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Settlements</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Minimal</p>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-700">Welcome back</p>
            <h2 className="text-3xl font-semibold text-slate-900">Log in to your account</h2>
            <p className="text-sm leading-6 text-slate-600">
              Use the account you created for SmartSplit and we&apos;ll take you straight to your groups.
            </p>
          </div>

          {token ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              You are already signed in. You can still log in with another account or go back to your{' '}
              <Link className="font-semibold underline" to="/dashboard">
                dashboard
              </Link>
              .
            </div>
          ) : null}

          {state?.message ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {state.message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-700">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="form-input"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-700">Password</span>
              <input
                required
                minLength={6}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                className="form-input"
                placeholder="Enter your password"
              />
            </label>

            <button type="submit" disabled={isSubmitting} className="primary-button w-full px-4 py-3">
              {isSubmitting ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New to SmartSplit?{' '}
            <Link className="font-medium text-sky-700 hover:text-sky-800" to="/register">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
