import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './TopBar.module.css';

export default function TopBar({ active }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.mark}>UFDE</span>
          <span className={styles.brandSub}>Unified Fraud Detection Engine</span>
        </div>

        <nav className={styles.nav}>
          <Link className={active === 'dashboard' ? styles.linkActive : styles.link} to="/dashboard">
            Alerts
          </Link>
          {hasRole('Admin') && (
            <Link className={active === 'admin' ? styles.linkActive : styles.link} to="/admin">
              Administration
            </Link>
          )}
        </nav>

        <div className={styles.account}>
          <span className={styles.name}>{user?.name}</span>
          <span className={styles.role}>{user?.role}</span>
          <button type="button" className={styles.signOut} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
