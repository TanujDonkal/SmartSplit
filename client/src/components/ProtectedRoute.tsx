import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[30rem] items-center justify-center px-4 text-sm text-slate-500">
        Restoring your session...
      </div>
    );
  }

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate
      to="/login"
      replace
      state={{
        message: 'Please log in to continue with group actions.',
        from: location.pathname,
      }}
    />
  );
}
