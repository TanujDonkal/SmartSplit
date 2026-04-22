import { Link } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../lib/legal';

const sections = [
  {
    title: 'What SmartSplit Collects',
    body:
      'SmartSplit stores the account details you provide, including your name, username, email address, authentication identifiers, group and friend relationships, balances, expenses, comments, receipts, and AI prompts that you submit inside the app.',
  },
  {
    title: 'How SmartSplit Uses Data',
    body:
      'We use your data to create and secure your account, sync shared expenses, calculate balances and settlements, store receipts, answer AI assistant requests, and keep the app working across web and mobile devices.',
  },
  {
    title: 'Where Data May Be Processed',
    body:
      'SmartSplit may rely on third-party services for hosting, authentication, storage, and AI processing. Those providers only receive the data needed to deliver the specific feature you are using.',
  },
  {
    title: 'Your Controls',
    body:
      'You can update your profile in the app, delete receipts and expenses as part of normal product use, and permanently delete your account from the account screen. If you cannot access the app, you can also use the delete-account page to request deletion support.',
  },
];

export default function PrivacyPolicy() {
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
            Privacy Policy
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
            How SmartSplit handles account, expense, receipt, and AI data.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            This page explains the information SmartSplit collects, how the app uses it, and what
            controls users have before installing from Google Play or using the app on Android.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Contact: <a className="font-semibold text-[#2b938c]" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </section>

        <section className="grid gap-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[1.6rem] border border-[#e4e5df] bg-[#f9faf8] px-5 py-5"
            >
              <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[1.8rem] border border-[#d6d7d2]/80 bg-[linear-gradient(145deg,rgba(54,181,172,0.10),rgba(246,185,63,0.10))] px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-900">Data deletion and retention</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Deleting your account removes your SmartSplit profile and related application data from
            active use. Limited operational records may remain temporarily in logs or backups until
            they expire in the normal course of service maintenance.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/delete-account"
              className="rounded-full bg-[#36b5ac] px-5 py-3 text-sm font-semibold text-white"
            >
              View account deletion steps
            </Link>
            <Link
              to="/support"
              className="rounded-full border border-[#d6d7d2] bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Contact support
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
