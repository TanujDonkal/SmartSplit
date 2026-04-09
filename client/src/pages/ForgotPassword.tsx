import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/update-password`,
        },
      );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        'If that account exists, a password reset link has been sent to your email.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[30rem] flex-col px-4 py-6">
      <div className="mb-8 flex items-center">
        <Link to="/login" className="text-3xl leading-none text-slate-700">
          &lsaquo;
        </Link>
      </div>

      <div className="mx-auto w-full max-w-md">
        <img
          src="/smartsplit-logo.png"
          alt="SmartSplit"
          className="mx-auto mb-10 h-auto w-full max-w-[14rem] object-contain"
        />
        <h1 className="mb-3 text-4xl font-semibold text-slate-900">Forgot password</h1>
        <p className="mb-8 text-sm text-slate-500">
          Enter your registered email and we will send you a secure reset link.
        </p>

        {message ? (
          <div className="mb-4 rounded-2xl border border-[#c6e7dd] bg-[#eef9f5] px-4 py-3 text-sm text-[#116e54]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-[#f1c5b8] bg-[#fff1ec] px-4 py-3 text-sm text-[#bf5b37]">
            {error}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleRequestReset}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Registered email</span>
            <input
              required
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="form-input"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-button w-full px-4 py-4 text-lg"
          >
            {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );
}
