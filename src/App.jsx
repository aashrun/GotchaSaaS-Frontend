import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Suspense } from 'react';
import ProtectedRoute from './auth/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Layout from './components/layout/WorkspaceLayout';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Templates from './pages/Templates';
import Integrations from './pages/Integrations';
import Team from './pages/Team';
import Admin from './pages/Admin';
import Info from './pages/Info';
import ErrorBoundary from './components/ErrorBoundary';
function LegacyProjectLink() {
  const { id } = useParams();
  return <Navigate to={'/projects?chat=' + id} replace />;
}
export default function App() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="page-loading">
            <span className="orbit-loader" />
            Opening Gotcha SaaS…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/auth/:mode" element={<AuthPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<Dashboard />} />
            <Route path="/library" element={<Dashboard library />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/team" element={<Team />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/help" element={<Info type="help" />} />
            <Route path="/analytics" element={<Info type="analytics" />} />
            <Route path="/api-keys" element={<Info type="api-keys" />} />
          </Route>
          <Route path="/studio/:id" element={<LegacyProjectLink />} />
          <Route path="/privacy" element={<Info type="privacy" />} />
          <Route path="/terms" element={<Info type="terms" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
