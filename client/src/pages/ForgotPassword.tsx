import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import NoticeBanner from '../components/NoticeBanner';
import { supabase } from '../lib/supabase';

const RESET_COOLDOWN_SECONDS = 60;
const RESET_COOLDOWN_KEY = 'forgot-password-cooldown-until';

function getRateLimitMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : 'Unable to send reset email';
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes('rate limit') ||
    normalized.includes('over_email_send_rate_limit')
  ) {
    return 'A reset email was sent recently. Supabase free projects usually allow one reset request per 60 seconds, so please wait a minute and try again.';
  }

  return rawMessage;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    const updateCooldown = () => {
      const storedUntil = Number(localStorage.getItem(RESET_COOLDOWN_KEY) ?? '0');
      const secondsLeft = Math.max(0, Math.ceil((storedUntil - Date.now()) / 1000));
      setCooldownRemaining(secondsLeft);
    };

    updateCooldown();
    const timer = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || cooldownRemaining > 0) {
      return;
    }

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

      localStorage.setItem(
        RESET_COOLDOWN_KEY,
        String(Date.now() + RESET_COOLDOWN_SECONDS * 1000),
      );
      setCooldownRemaining(RESET_COOLDOWN_SECONDS);
      setMessage(
        'If that account exists, a password reset link has been sent to your email. Please wait a minute before requesting another one.',
      );
    } catch (err) {
      const nextMessage = getRateLimitMessage(err);
      if (nextMessage !== (err instanceof Error ? err.message : '')) {
        localStorage.setItem(
          RESET_COOLDOWN_KEY,
          String(Date.now() + RESET_COOLDOWN_SECONDS * 1000),
        );
        setCooldownRemaining(RESET_COOLDOWN_SECONDS);
      }
      setError(nextMessage);
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
              Recovery
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-900">
              Regain access securely without breaking your account flow.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              SmartSplit uses Supabase password reset links, so you can request recovery safely
              and continue on any device once the email arrives.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white/85 px-5 py-5 text-sm leading-7 text-slate-500">
            To stay within the Supabase free-plan email limit, reset requests are cooled down for
            60 seconds before another email can be sent.
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
            <h1 className="mb-3 text-4xl font-semibold text-slate-900">Forgot password</h1>
            <p className="mb-8 text-sm text-slate-500">
              Enter your registered email and we will send you a secure reset link.
            </p>

            {message ? (
              <NoticeBanner tone="success" message={message} onClose={() => setMessage('')} />
            ) : null}

            {error ? (
              <NoticeBanner tone="error" message={error} onClose={() => setError('')} />
            ) : null}

            {cooldownRemaining > 0 ? (
              <NoticeBanner
                tone="info"
                message={`You can request another reset email in ${cooldownRemaining}s.`}
              />
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
                disabled={isSubmitting || cooldownRemaining > 0}
                className="primary-button w-full px-4 py-4 text-lg"
              >
                {isSubmitting
                  ? 'Sending reset link...'
                  : cooldownRemaining > 0
                    ? `Wait ${cooldownRemaining}s`
                    : 'Send reset link'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
