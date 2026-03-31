import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-sky-200 bg-white/70 px-4 py-1 text-sm tracking-[0.22em] text-sky-700 uppercase shadow-sm">
            Welcome to SmartSplit
          </p>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Split trips, dinners, and shared bills in a way that feels effortless.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              SmartSplit gives your group one place to track expenses, see who owes what, and settle up with confidence on desktop or mobile.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="primary-button inline-flex items-center justify-center px-6 py-3" to="/register">
              Sign up
            </Link>
            <Link
              className="secondary-button inline-flex items-center justify-center px-6 py-3 font-medium"
              to="/login"
            >
              Log in
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Groups</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Trips, homes, events</p>
            </div>
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Expense flow</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Fast and clear</p>
            </div>
            <div className="glass-card rounded-[1.75rem] p-5">
              <p className="text-sm text-slate-500">Settlement</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Minimal payments</p>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-4">
            <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,_#0f8bff,_#6dd3ff)] p-6 text-white shadow-lg shadow-sky-200/70">
              <p className="text-sm uppercase tracking-[0.24em] text-sky-50/90">Professional overview</p>
              <h2 className="mt-3 text-3xl font-semibold">Everything your group needs in one polished workspace</h2>
              <p className="mt-3 text-sm leading-6 text-sky-50/90">
                Create accounts, organize groups, add members, track shared expenses, and instantly review balances and settlement suggestions.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="soft-panel rounded-[1.5rem] p-5">
                <p className="text-sm text-slate-500">For new users</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Start with Sign up</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Create your account first, then invite friends by email from inside a group.
                </p>
              </div>
              <div className="soft-panel rounded-[1.5rem] p-5">
                <p className="text-sm text-slate-500">For returning users</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Jump back in with Log in</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You’ll land in your dashboard and can open any group you already belong to.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
