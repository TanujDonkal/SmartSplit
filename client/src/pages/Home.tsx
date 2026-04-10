import { Link } from 'react-router-dom';

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
            <div className="mt-2 flex h-16 items-end gap-3 lg:h-14">
              <div className="h-7 flex-1 rounded-t-[1.8rem] bg-[#355d74] lg:h-6" />
              <div className="h-12 flex-1 rounded-t-[1.8rem] bg-[#c7d579] lg:h-10" />
              <div className="h-10 flex-1 rounded-t-[1.8rem] bg-[#36b5ac] lg:h-9" />
              <div className="h-14 flex-1 rounded-t-[1.8rem] bg-[#f6b93f] lg:h-12" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-8 rounded-[2rem] border border-[#d6d7d2]/80 bg-[#fffdfa] px-6 py-8 shadow-[0_18px_55px_rgba(31,41,55,0.08)] md:px-8 md:py-10 lg:justify-center lg:gap-6 lg:px-7 lg:py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#36b5ac]">
              Get Started
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 lg:text-[2.5rem] lg:leading-tight">
              Sign in from any screen size without losing clarity.
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

            <div className="rounded-[1.4rem] bg-[#f6f7f3] px-4 py-4 text-sm text-slate-500">
              Friends | Groups | Activity | Account
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
