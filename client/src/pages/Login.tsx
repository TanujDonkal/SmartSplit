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
      navigate('/dashboard?tab=friends');
    } catch (err) {
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

        {token ? (
          <div className="mb-4 rounded-2xl border border-[#c6e7dd] bg-[#eef9f5] px-4 py-3 text-sm text-[#116e54]">
            You are already signed in. Go to your{' '}
            <Link className="font-semibold underline" to="/dashboard?tab=friends">
              dashboard
            </Link>
            .
          </div>
        ) : null}

        {state?.message ? (
          <div className="mb-4 rounded-2xl border border-[#c6e7dd] bg-[#eef9f5] px-4 py-3 text-sm text-[#116e54]">
            {state.message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
            {error}
          </div>
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
