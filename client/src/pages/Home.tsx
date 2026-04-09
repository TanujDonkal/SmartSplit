import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(22rem,26rem)]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-[#d6d7d2]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,248,247,0.92))] px-6 py-8 shadow-[0_18px_55px_rgba(31,41,55,0.08)] md:px-8 md:py-10">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_10px_24px_rgba(31,41,55,0.05)]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef8f7] text-[#36b5ac]">
                S
              </span>
              SmartSplit
            </div>

            <div className="mt-8 max-w-2xl">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
                Split bills simply across friends, trips, and shared groups.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
                SmartSplit keeps direct expenses, group balances, receipts, settlements, and AI helpers together in one polished flow that feels good on mobile and confident on desktop.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                'Direct friend expenses',
                'Groups, balances, and settle up',
                'Receipts, AI parsing, and insights',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-white/80 bg-white/80 px-4 py-4 text-sm font-medium text-slate-600 shadow-[0_10px_26px_rgba(31,41,55,0.05)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <img
              src="/smartsplit-logo.png"
              alt="SmartSplit"
              className="h-auto w-full max-w-[20rem] object-contain md:max-w-[23rem]"
            />
            <div className="mt-8 flex h-20 items-end gap-3">
              <div className="h-9 flex-1 rounded-t-[1.8rem] bg-[#355d74]" />
              <div className="h-14 flex-1 rounded-t-[1.8rem] bg-[#c7d579]" />
              <div className="h-12 flex-1 rounded-t-[1.8rem] bg-[#36b5ac]" />
              <div className="h-16 flex-1 rounded-t-[1.8rem] bg-[#f6b93f]" />
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-[2rem] border border-[#d6d7d2]/80 bg-[#fffdfa] px-6 py-8 shadow-[0_18px_55px_rgba(31,41,55,0.08)] md:px-8 md:py-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#36b5ac]">
              Get Started
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">
              Sign in from any screen size without losing clarity.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Use SmartSplit on your phone, tablet, or laptop with the same core workflow for friends, groups, activity, and account management.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Link
              className="primary-button block w-full px-6 py-4 text-center text-lg"
              to="/register"
            >
              Sign up
            </Link>
            <Link
              className="secondary-button block w-full px-6 py-4 text-center text-lg"
              to="/login"
            >
              Log in
            </Link>

            <div className="rounded-[1.4rem] bg-[#f6f7f3] px-4 py-4 text-sm text-slate-500">
              Friends | Groups | Activity | Account
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
