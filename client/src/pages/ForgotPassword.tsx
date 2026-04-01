import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await api.requestPasswordResetOtp({
        email: email.trim().toLowerCase(),
      });
      setMessage(response.message);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.resetPasswordWithOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });
      navigate('/login', {
        replace: true,
        state: { message: response.message },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
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
          {step === 'request'
            ? 'Enter your registered email to receive an OTP.'
            : 'Enter the OTP from your email and choose a new password.'}
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

        {step === 'request' ? (
          <form className="space-y-5" onSubmit={handleRequestOtp}>
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
              {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleResetPassword}>
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

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">OTP from email</span>
              <input
                required
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit code"
                className="form-input"
              />
            </label>

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
              {isSubmitting ? 'Resetting password...' : 'Reset password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('request');
                setOtp('');
                setPassword('');
                setConfirmPassword('');
                setError('');
                setMessage('');
              }}
              className="outline-button w-full px-4 py-3"
            >
              Request a new OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
