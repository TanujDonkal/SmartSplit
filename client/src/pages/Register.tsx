import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="glass-card order-2 rounded-[2rem] p-6 sm:p-8 lg:order-1">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-sky-700">Create account</p>
            <h1 className="text-3xl font-semibold text-slate-900">Start your next shared plan on the right footing</h1>
            <p className="text-sm leading-6 text-slate-600">
              Set up your account, invite the group, and keep payments transparent from the first expense onward.
            </p>
          </div>

          {token ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              You are already signed in. You can create another account here for testing, or go back to your{' '}
              <Link className="font-semibold underline" to="/dashboard">
                dashboard
              </Link>
              .
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-700">Full name</span>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="form-input"
                placeholder="Taylor Morgan"
              />
            </label>

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

            <div className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-700">Confirm password</span>
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
                  className="form-input"
                  placeholder="Repeat password"
                />
              </label>
            </div>

            <button type="submit" disabled={isSubmitting} className="primary-button w-full px-4 py-3">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{' '}
            <Link className="font-medium text-sky-700 hover:text-sky-800" to="/login">
              Log in
            </Link>
          </p>
        </section>

        <section className="order-1 space-y-6 lg:order-2 lg:pl-8">
          <p className="inline-flex rounded-full border border-sky-200 bg-white/70 px-4 py-1 text-sm tracking-[0.2em] text-sky-700 uppercase">
            SmartSplit account
          </p>
          <h2 className="max-w-xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Keep every trip, team lunch, and roommate plan clear from day one.
          </h2>
          <p className="max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
            SmartSplit makes it easy to spin up a group, invite members, and stay aligned as expenses start rolling in.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Fast setup</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Create your account in under a minute</p>
            </div>
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Clear records</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Every payment and split stays easy to follow</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
