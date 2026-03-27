import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.login(form);
      login(response.token, response.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.24),_transparent_30%),linear-gradient(135deg,_#1f2937,_#0f172a_55%,_#111827)] px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm tracking-[0.2em] text-orange-200 uppercase">
            SmartSplit
          </p>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
              Split trips, dinners, and shared bills without the group-chat math.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Track who paid, keep everyone in the loop, and settle up with a clear summary your whole group can trust.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-sm text-slate-300">Shared groups</p>
              <p className="mt-2 text-2xl font-semibold text-white">One place</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-sm text-slate-300">Equal splits</p>
              <p className="mt-2 text-2xl font-semibold text-white">Built in</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <p className="text-sm text-slate-300">Settlements</p>
              <p className="mt-2 text-2xl font-semibold text-white">Simplified</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-orange-200">Welcome back</p>
            <h2 className="text-3xl font-semibold">Log in to your account</h2>
            <p className="text-sm leading-6 text-slate-300">
              Use the account you created for SmartSplit and we&apos;ll take you straight to your groups.
            </p>
          </div>

          {state?.message ? (
            <div className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {state.message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-orange-300/70 focus:ring-2 focus:ring-orange-300/30"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Password</span>
              <input
                required
                minLength={6}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-orange-300/70 focus:ring-2 focus:ring-orange-300/30"
                placeholder="Enter your password"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-orange-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-orange-200"
            >
              {isSubmitting ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-300">
            New to SmartSplit?{' '}
            <Link className="font-medium text-orange-200 hover:text-orange-100" to="/register">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
