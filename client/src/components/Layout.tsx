import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-400">SmartSplit</Link>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </nav>
      <main className="max-w-2xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
