import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/useAuth';

export default function Register() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Account created. You can log in now.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.22),_transparent_30%),linear-gradient(135deg,_#111827,_#0f172a_55%,_#020617)] px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="order-2 rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-8 lg:order-1">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-200">Create account</p>
            <h1 className="text-3xl font-semibold">Start your next shared plan on the right footing</h1>
            <p className="text-sm leading-6 text-slate-300">
              Set up your account, invite the group, and keep payments transparent from the first expense onward.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Full name</span>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/30"
                placeholder="Taylor Morgan"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-200">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/30"
                placeholder="you@example.com"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
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
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/30"
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-200">Confirm password</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/30"
                  placeholder="Repeat password"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-300">
            Already have an account?{' '}
            <Link className="font-medium text-emerald-200 hover:text-emerald-100" to="/login">
              Log in
            </Link>
          </p>
        </section>

        <section className="order-1 space-y-6 lg:order-2 lg:pl-8">
          <p className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-1 text-sm tracking-[0.2em] text-emerald-200 uppercase">
            Week 3 Frontend
          </p>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
            Keep every trip, team lunch, and roommate expense clear from day one.
          </h2>
          <p className="max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
            SmartSplit makes it easy to spin up a group, invite members, and stay aligned as expenses start rolling in.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p className="text-sm text-slate-300">Fast setup</p>
              <p className="mt-2 text-xl font-semibold">Create your account in under a minute</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p className="text-sm text-slate-300">Clear records</p>
              <p className="mt-2 text-xl font-semibold">Every payment and split stays easy to follow</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
