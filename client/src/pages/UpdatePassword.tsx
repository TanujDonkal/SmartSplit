import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setHasRecoverySession(Boolean(data.session));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(Boolean(session));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setMessage('Password updated successfully. You can log in now.');

      await supabase.auth.signOut();

      navigate('/login', {
        replace: true,
        state: { message: 'Password updated successfully. Please log in.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password');
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
        <h1 className="mb-3 text-4xl font-semibold text-slate-900">Set new password</h1>
        <p className="mb-8 text-sm text-slate-500">
          Choose a new password for your SmartSplit account.
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

        {!hasRecoverySession ? (
          <div className="rounded-2xl border border-[#e8e8e0] bg-white px-4 py-4 text-sm text-slate-600 shadow-[0_12px_30px_rgba(31,41,55,0.05)]">
            Open the password reset link from your email first. That link will bring you back here with a secure recovery session.
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                required
                autoComplete="new-password"
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="form-input"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Confirm new password</span>
              <input
                required
                autoComplete="new-password"
                minLength={6}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="form-input"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-button w-full px-4 py-4 text-lg"
            >
              {isSubmitting ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
