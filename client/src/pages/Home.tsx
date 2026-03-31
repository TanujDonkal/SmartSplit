import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[30rem] flex-col items-center justify-between px-6 py-10 text-center">
      <div className="pt-12" />

      <section className="flex flex-col items-center">
        <img
          src="/smartsplit-logo.png"
          alt="SmartSplit"
          className="mx-auto mb-5 h-auto w-full max-w-[19rem] object-contain"
        />
        <p className="mt-3 max-w-xs text-base leading-7 text-slate-500">
          Track shared bills, split group expenses, and settle up with a flow that feels clear on mobile first.
        </p>
      </section>

      <section className="w-full max-w-sm space-y-4">
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

        <div className="pt-4 text-sm text-slate-400">
          <p>Groups | Activity | Account</p>
        </div>
      </section>

      <div className="w-full overflow-hidden pt-10">
        <div className="flex h-16 items-end gap-2">
          <div className="h-8 flex-1 rounded-t-[1.6rem] bg-[#355d74]" />
          <div className="h-12 flex-1 rounded-t-[1.6rem] bg-[#c7d579]" />
          <div className="h-10 flex-1 rounded-t-[1.6rem] bg-[#36b5ac]" />
          <div className="h-14 flex-1 rounded-t-[1.6rem] bg-[#f6b93f]" />
        </div>
      </div>
    </div>
  );
}
