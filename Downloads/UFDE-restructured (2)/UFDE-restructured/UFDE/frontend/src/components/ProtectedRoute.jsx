import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './ProtectedRoute.module.css';

/**
 * Route gate. Mirrors the backend roleGuard hierarchy so a Viewer cannot open
 * an Analyst/Admin view; the API still enforces it independently.
 */
export default function ProtectedRoute({ minRole = 'Viewer', children }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <p className={styles.pending}>Checking your session…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!hasRole(minRole)) {
    return (
      <div className={styles.denied}>
        <h1 className={styles.deniedTitle}>You don’t have access to this page</h1>
        <p className={styles.deniedBody}>
          This page needs the {minRole} role. You’re signed in as {user.role}.
        </p>
      </div>
    );
  }

  return children;
}
