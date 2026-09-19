import styles from './StatCard.module.css';

export default function StatCard({
  value,
  label,
  subtext,
  icon,
  tone = 'neutral',
}) {
  return (
    <div className={`${styles.card} ${styles[tone] || ''}`}>
      <div className={styles.icon}>
        {icon}
      </div>

      <div className={styles.content}>
        <div className={styles.value}>
          {value}
        </div>

        <div className={styles.label}>
          {label}
        </div>

        {subtext && (
          <div className={styles.subtext}>
            {subtext}
          </div>
        )}
      </div>

      <span className={styles.chevron}>
        ›
      </span>
    </div>
  );
}