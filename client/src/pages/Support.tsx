import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../lib/legal';

const helpTopics = [
  'Login, password reset, and sign-up issues',
  'Friend and group expense sync problems',
  'Receipt upload or parsing questions',
  'AI assistant responses that need review',
  'Account deletion or privacy requests',
];

export default function Support() {
  return (
    <div className="min-h-screen bg-[#fffdfa] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Link
          to="/"
          className="w-fit rounded-full border border-[#d6d7d2] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Back to SmartSplit
        </Link>

        <section className="rounded-[2rem] border border-[#d6d7d2]/80 bg-white px-6 py-8 shadow-[0_18px_55px_rgba(31,41,55,0.08)] md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#36b5ac]">
            Support
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
            Help for SmartSplit users on Android, web, and future app-store builds.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            If you need help with account access, expense data, receipts, AI assistance, or
            deletion requests, contact SmartSplit support using the details below.
          </p>
          <div className="mt-6 rounded-[1.5rem] bg-[#f6f7f3] px-5 py-5">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
              Support email
            </p>
            <a href={SUPPORT_MAILTO} className="mt-2 block text-xl font-semibold text-[#2b938c]">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[#e4e5df] bg-white px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-900">What to include in your message</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            <li>Device type and Android version</li>
            <li>What screen or workflow you were using</li>
            <li>Any error message shown in the app</li>
            <li>Whether the issue happened on web, mobile, or both</li>
          </ul>
        </section>

        <section className="rounded-[1.8rem] border border-[#e4e5df] bg-white px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-900">Common help topics</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            {helpTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link
            to="/privacy"
            className="rounded-full border border-[#d6d7d2] bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Privacy policy
          </Link>
          <Link
            to="/delete-account"
            className="rounded-full bg-[#36b5ac] px-5 py-3 text-sm font-semibold text-white"
          >
            Delete account help
          </Link>
        </section>
      </div>
    </div>
  );
}
