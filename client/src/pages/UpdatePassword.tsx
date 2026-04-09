import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NoticeBanner from '../components/NoticeBanner';
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

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

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
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-brand-panel">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#36b5ac]">
              Secure Update
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">
              Finish recovery and get back into SmartSplit with a new password.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Once your reset link opens this page with a valid recovery session, you can set a
              new password and continue using the app normally on any screen.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white/85 px-5 py-5 text-sm leading-7 text-slate-500">
            Use a password you have not used before and keep it at least 6 characters long so your
            sign-in stays consistent across devices.
          </div>
        </section>

        <div className="auth-card auth-form-panel px-4 py-6 md:px-0 md:py-0">
          <div className="auth-back-link">
            <Link to="/login" className="text-3xl leading-none text-slate-700">
              &lsaquo;
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <img
              src="/smartsplit-logo.png"
              alt="SmartSplit"
              className="mx-auto mb-10 h-auto w-full max-w-[14rem] object-contain md:mx-0"
            />
            <h1 className="mb-3 text-4xl font-semibold text-slate-900">Set new password</h1>
            <p className="mb-8 text-sm text-slate-500">
              Choose a new password for your SmartSplit account.
            </p>

            {message ? (
              <NoticeBanner tone="success" message={message} onClose={() => setMessage('')} />
            ) : null}

            {error ? (
              <NoticeBanner tone="error" message={error} onClose={() => setError('')} />
            ) : null}

            {!hasRecoverySession ? (
              <div className="rounded-2xl border border-[#e8e8e0] bg-white px-4 py-4 text-sm text-slate-600 shadow-[0_12px_30px_rgba(31,41,55,0.05)]">
                Open the password reset link from your email first. That link will bring you back
                here with a secure recovery session.
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
      </div>
    </div>
  );
}
