import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const tabs = [
  { key: 'friends', label: 'Friends', icon: 'o' },
  { key: 'groups', label: 'Groups', icon: 'oo' },
  { key: 'activity', label: 'Activity', icon: '[]' },
  { key: 'account', label: 'Account', icon: '@' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    location.pathname.startsWith('/groups/')
      ? 'groups'
      : location.pathname.startsWith('/friends/')
        ? 'friends'
      : new URLSearchParams(location.search).get('tab') ?? 'groups';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <div className="mobile-shell flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[#e8e8e0] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Link to="/dashboard?tab=groups" className="flex items-center gap-3">
              <img
                src="/smartsplit-logo.png"
                alt="SmartSplit logo"
                className="h-11 w-auto object-contain"
              />
              <div>
                <p className="text-lg font-semibold text-slate-900">SmartSplit</p>
                <p className="mini-label">Split bills simply</p>
              </div>
            </Link>

            {user ? (
              <button
                onClick={() => void handleLogout()}
                className="rounded-full border border-[#d6d7d2] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Log out
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-full border border-[#d6d7d2] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-[#36b5ac] px-4 py-2 text-sm font-semibold text-white"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4">
          <Outlet />
        </main>

        <nav className="bottom-tab-shadow fixed bottom-0 left-0 right-0 z-30 border-t border-[#e4e5df] bg-white/96 backdrop-blur">
          <div className="mx-auto grid w-full max-w-[30rem] grid-cols-4 px-3 py-2">
            {tabs.map((tab) => {
              const active = currentTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  to={`/dashboard?tab=${tab.key}`}
                  className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center"
                >
                  <span
                    className={`text-sm font-semibold ${
                      active ? 'text-[#36b5ac]' : 'text-slate-400'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      active ? 'text-[#36b5ac]' : 'text-slate-500'
                    }`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`mt-1 h-0.5 w-8 rounded-full ${
                      active ? 'bg-[#36b5ac]' : 'bg-transparent'
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
