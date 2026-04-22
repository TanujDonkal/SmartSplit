import { Link } from 'react-router-dom';

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M16.37 12.17c.02 2.2 1.93 2.94 1.95 2.95-.02.05-.31 1.07-1.02 2.12-.62.91-1.27 1.81-2.28 1.83-.99.02-1.31-.59-2.45-.59-1.15 0-1.5.57-2.44.61-1 .04-1.76-.99-2.38-1.89-1.26-1.81-2.22-5.12-.93-7.36.64-1.11 1.79-1.82 3.04-1.84.95-.02 1.84.64 2.45.64.61 0 1.75-.79 2.96-.67.51.02 1.94.21 2.86 1.56-.08.05-1.71 1-1.69 2.64ZM14.6 5.35c.52-.64.87-1.53.77-2.42-.75.03-1.66.5-2.2 1.13-.48.56-.91 1.46-.79 2.32.84.07 1.7-.42 2.22-1.03Z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M7.39 8.15h9.22a6.1 6.1 0 0 0-2.05-2.29l1.1-1.92a.46.46 0 1 0-.8-.46l-1.12 1.95a6.74 6.74 0 0 0-3.48 0L9.14 3.48a.46.46 0 0 0-.8.46l1.1 1.92a6.1 6.1 0 0 0-2.05 2.29Zm6.4-2.16a.58.58 0 1 1 0 1.15.58.58 0 0 1 0-1.15Zm-3.58 0a.58.58 0 1 1 0 1.15.58.58 0 0 1 0-1.15ZM6.1 9.08v6.7c0 .55.44.99.99.99h.72v2.3a1 1 0 0 0 2 0v-2.3h1.2v2.3a1 1 0 0 0 2 0v-2.3h1.2v2.3a1 1 0 0 0 2 0v-2.3h.72c.55 0 .99-.44.99-.99v-6.7H6.1Zm-2.06.26a1 1 0 0 0-1 1v4.95a1 1 0 0 0 2 0v-4.95a1 1 0 0 0-1-1Zm15.92 0a1 1 0 0 0-1 1v4.95a1 1 0 0 0 2 0v-4.95a1 1 0 0 0-1-1Z" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <circle cx="12" cy="12" r="8.25" strokeWidth="1.75" />
      <path strokeWidth="1.75" strokeLinecap="round" d="M4.5 9h15M4.5 15h15M12 3.75c2.4 2.2 3.6 5 3.6 8.25S14.4 18.05 12 20.25M12 3.75C9.6 5.95 8.4 8.75 8.4 12S9.6 18.05 12 20.25" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="px-4 py-6 md:px-6 md:py-8 lg:flex lg:min-h-screen lg:items-center lg:py-5">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,24rem)] lg:items-stretch">
        <section className="flex flex-col gap-8 rounded-[2rem] border border-[#d6d7d2]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,248,247,0.92))] px-6 py-8 shadow-[0_18px_55px_rgba(31,41,55,0.08)] md:px-8 md:py-10 lg:gap-6 lg:px-8 lg:py-8">
          <div>
            <img
              src="/smartsplit-logo.png"
              alt="SmartSplit"
              className="h-auto w-full max-w-[14rem] object-contain md:max-w-[18rem] lg:max-w-[16rem]"
            />
            <div className="mt-8 max-w-2xl">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl lg:text-[3.6rem] lg:leading-[1.05]">
                Split bills simply across friends, trips, and shared groups.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 md:text-lg lg:text-[1.05rem] lg:leading-8">
                SmartSplit keeps direct expenses, group balances, receipts, settlements, and AI
                helpers together in one polished flow that feels good on mobile and confident on
                desktop.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:mt-7">
              {[
                'Direct friend expenses',
                'Groups, balances, and settle up',
                'Receipts, AI parsing, and insights',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.35rem] border border-white/80 bg-white/80 px-4 py-4 text-sm font-medium text-slate-600 shadow-[0_10px_26px_rgba(31,41,55,0.05)] lg:px-3.5 lg:py-3.5"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 text-sm text-slate-600 shadow-[0_10px_26px_rgba(31,41,55,0.05)]">
              <span className="font-medium text-slate-500">Free for</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f6f7f3] px-3 py-2 font-medium text-slate-700">
                <AppleIcon />
                iPhone
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f6f7f3] px-3 py-2 font-medium text-slate-700">
                <AndroidIcon />
                Android
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f6f7f3] px-3 py-2 font-medium text-slate-700">
                <WebIcon />
                Web
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-8 rounded-[2rem] border border-[#d6d7d2]/80 bg-[#fffdfa] px-6 py-8 shadow-[0_18px_55px_rgba(31,41,55,0.08)] md:px-8 md:py-10 lg:justify-center lg:gap-6 lg:px-7 lg:py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#36b5ac]">
              Get Started
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 lg:text-[2.5rem] lg:leading-tight">
              Create your SmartSplit account in seconds.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500 lg:text-[0.98rem] lg:leading-7">
              Use SmartSplit on your phone, tablet, or laptop with the same core workflow for
              friends, groups, activity, and account management.
            </p>
          </div>

          <div className="space-y-4">
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

            <div className="grid grid-cols-4 rounded-[1.4rem] bg-[#f6f7f3] px-2 py-3 text-center text-sm font-semibold text-slate-700">
              {['Friends', 'Groups', 'Activity', 'Account'].map((item, index) => (
                <span
                  key={item}
                  className={`px-2 py-1 ${index < 3 ? 'border-r border-[#c9cdc4]' : ''}`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
