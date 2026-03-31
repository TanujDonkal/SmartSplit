import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[30rem] flex-col items-center justify-between px-6 py-10 text-center">
      <div className="pt-12" />

      <section className="flex flex-col items-center">
        <div className="relative mb-5 h-24 w-24">
          <div className="absolute left-2 top-2 h-16 w-16 rotate-45 rounded-[1.3rem] bg-[#9be7d1]" />
          <div className="absolute right-1 top-8 h-14 w-14 rotate-45 rounded-[1rem] bg-[#2e343d]" />
          <div className="absolute bottom-0 left-7 h-11 w-11 rotate-45 rounded-[0.85rem] bg-[#159b75]" />
        </div>

        <h1 className="text-3xl font-semibold text-slate-900">SmartSplit</h1>
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
          <div className="h-8 flex-1 rounded-t-[1.6rem] bg-[#2f343d]" />
          <div className="h-12 flex-1 rounded-t-[1.6rem] bg-[#7a51d9]" />
          <div className="h-10 flex-1 rounded-t-[1.6rem] bg-[#2ad1b0]" />
          <div className="h-14 flex-1 rounded-t-[1.6rem] bg-[#ff6f4d]" />
        </div>
      </div>
    </div>
  );
}
