import styles from './Alert.module.css';

export default function Alert({ tone = 'info', children }) {
  if (!children) return null;
  return (
    <p className={`${styles.alert} ${styles[tone] || ''}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
