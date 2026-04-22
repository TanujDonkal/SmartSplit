import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../lib/legal';

const steps = [
  'Log in to SmartSplit.',
  'Open the Account tab.',
  'Review the deletion warning.',
  'Use the in-app Delete account action to permanently remove your account.',
];

export default function DeleteAccountInfo() {
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
            Account Deletion
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
            How to delete a SmartSplit account and remove app data.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            SmartSplit supports account deletion directly inside the app. This page exists so users
            and Google Play reviewers can also verify the deletion flow outside the app.
          </p>
        </section>

        <section className="rounded-[1.8rem] border border-[#e4e5df] bg-white px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-900">Delete your account in the app</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
            {steps.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[1.8rem] border border-[#e4e5df] bg-white px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-900">If you cannot access the app</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Email SmartSplit support from the address associated with your account and request
            deletion assistance. Use the subject line <span className="font-semibold">Delete my SmartSplit account</span>.
          </p>
          <a href={SUPPORT_MAILTO} className="mt-4 inline-block text-base font-semibold text-[#2b938c]">
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section className="rounded-[1.8rem] border border-[#e4e5df] bg-[#f9faf8] px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-900">What gets removed</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Deletion is intended to remove the user account and related SmartSplit application data
            from active use. Residual copies may remain temporarily in backups or operational logs
            until standard retention windows complete.
          </p>
        </section>
      </div>
    </div>
  );
}
