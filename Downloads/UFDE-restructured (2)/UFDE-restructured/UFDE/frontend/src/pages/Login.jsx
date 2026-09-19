import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);

    // Demo accounts
    if (selectedRole === 'admin') {
      setEmail('admin@ufde.demo');
      setPassword('Admin@123');
    } else if (selectedRole === 'analyst') {
      setEmail('analyst@ufde.demo');
      setPassword('Analyst@123');
    } else if (selectedRole === 'viewer') {
      setEmail('viewer@ufde.demo');
      setPassword('Viewer@123');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setBusy(true);

    try {
      const user = await login(email.trim(), password);

      /*
       * Redirect based on the authenticated user's role.
       */
      if (user?.role === 'Admin' || user?.role === 'admin') {
        navigate('/admin');
      } else if (
        user?.role === 'Analyst' ||
        user?.role === 'analyst'
      ) {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      {/* Decorative background */}
      <div className={styles.backgroundShapeOne}></div>
      <div className={styles.backgroundShapeTwo}></div>

      <section className={styles.loginCard}>
        {/* UFDE Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <svg
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <path
                d="M32 5L52 13V29C52 42 44 53 32 59C20 53 12 42 12 29V13L32 5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />

              <path
                d="M21 33L28 40L44 23"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className={styles.logo}>UFDE</h1>

          <div className={styles.logoLine}></div>
        </div>

        {/* Login Form */}
        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          {/* Role */}
          <div className={styles.field}>
            <label htmlFor="role">Role</label>

            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <svg viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M4 21C4 16.6 7.6 14 12 14C16.4 14 20 16.6 20 21"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <select
                id="role"
                value={role}
                onChange={handleRoleChange}
                className={styles.select}
              >
                <option value="">Select a role</option>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email">Work email</label>

            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <svg viewBox="0 0 24 24">
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />

                  <path
                    d="M4 7L12 13L20 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <svg viewBox="0 0 24 24">
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />

                  <path
                    d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>

              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? '◉' : '◌'}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className={styles.options}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) =>
                  setRemember(e.target.checked)
                }
              />

              <span>Remember me</span>
            </label>

            <button
              type="button"
              className={styles.forgot}
              onClick={() =>
                setError(
                  'Please contact your UFDE administrator to reset your password.'
                )
              }
            >
              Forgot password?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Sign In */}
          <button
            type="submit"
            className={styles.signInButton}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={styles.spinner}></span>
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <span className={styles.arrow}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Security divider */}
        <div className={styles.security}>
          <div className={styles.securityLine}></div>

          <div className={styles.securityIcon}>
            <svg viewBox="0 0 24 24">
              <path
                d="M12 3L19 6V11C19 15.5 16.2 19 12 21C7.8 19 5 15.5 5 11V6L12 3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />

              <path
                d="M9 12L11 14L15 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className={styles.securityLine}></div>
        </div>

        <p className={styles.securityText}>
          Secure UFDE authentication
        </p>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        © 2026 UFDE
      </footer>
    </main>
  );
}