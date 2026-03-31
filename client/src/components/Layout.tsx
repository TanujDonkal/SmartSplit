import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/78 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,_#0f8bff,_#66c4ff)] text-lg font-bold text-white shadow-lg shadow-sky-200/70">
              S
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[0.02em] text-slate-900">SmartSplit</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Shared expenses, simplified
              </p>
            </div>
          </Link>
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-2 text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="secondary-button px-4 py-2 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          )}
          {!user && (
            <div className="flex items-center gap-3">
              <Link className="secondary-button px-4 py-2 text-sm font-medium" to="/login">
                Log in
              </Link>
              <Link className="primary-button px-4 py-2 text-sm" to="/register">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
