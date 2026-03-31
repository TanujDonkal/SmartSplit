import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation();

  return token ? (
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
