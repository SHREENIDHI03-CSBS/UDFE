import styles from './RiskScoreMeter.module.css';

/**
 * Traffic-light score readout carried over from the original dashboard:
 * green below 21, amber up to 60, red above 60.
 */
export default function RiskScoreMeter({ score }) {
  if (score === null || score === undefined) return <span className={styles.na}>not scored</span>;

  const level = score > 60 ? 'red' : score > 20 ? 'amber' : 'green';

  return (
    <span className={styles.meter} title={`Consolidated risk score ${score} of 100`}>
      <span className={`${styles.dot} ${level === 'green' ? styles.green : ''}`} />
      <span className={`${styles.dot} ${level === 'amber' ? styles.amber : ''}`} />
      <span className={`${styles.dot} ${level === 'red' ? styles.red : ''}`} />
      <b className={styles.value}>{score}</b>
    </span>
  );
}
