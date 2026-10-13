import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
export default function ProtectedRoute({ children }) {
  const { user, loading, sessionEnded } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="page-loading">
        <span className="orbit-loader" />
        Opening your workspace…
      </div>
    );
  if (!user)
    return (
      <Navigate
        to="/auth/login"
        state={sessionEnded ? undefined : { from: location.pathname }}
        replace
      />
    );
  return children;
}
