import styles from './BandPill.module.css';

const LABELS = {
  VERY_LOW: 'Very low',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export default function BandPill({ band }) {
  if (!band) return <span className={styles.none}>—</span>;
  return <span className={`${styles.pill} ${styles[band] || ''}`}>{LABELS[band] || band}</span>;
}
