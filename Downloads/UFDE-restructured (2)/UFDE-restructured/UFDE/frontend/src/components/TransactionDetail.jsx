import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PhishingVerdict from './PhishingVerdict';
import Alert from './Alert';
import styles from './TransactionDetail.module.css';

/**
 * Expanded case view. What is shown depends on the signed-in role:
 * Viewers get the verdict and the plain-language explanation only, while
 * Analysts and Admins also get the AF/FF/PH sub-score breakdown.
 */
export default function TransactionDetail({ transactionId }) {
  const { hasRole } = useAuth();
  const [txn, setTxn] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setTxn(null);
    setError('');
    api
      .getTransaction(transactionId)
      .then((data) => !cancelled && setTxn(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!txn) return <p className={styles.loading}>Loading case detail…</p>;

  if (txn.status === 'REJECTED') {
    return (
      <div className={styles.detail}>
        <h3 className={styles.heading}>Rejected at validation</h3>
        <p className={styles.rejected}>{txn.reject_reason}</p>
      </div>
    );
  }

  return (
    <div className={styles.detail}>
      {hasRole('Analyst') ? (
        <div className={styles.block}>
          <h3 className={styles.heading}>Sub-score breakdown</h3>
          <dl className={styles.subscores}>
            <div className={styles.subscore}>
              <dt className={styles.subLabel}>Adaptive friction</dt>
              <dd className={styles.subValue}>{txn.af_subscore ?? '—'}</dd>
            </div>
            <div className={styles.subscore}>
              <dt className={styles.subLabel}>Fund flow</dt>
              <dd className={styles.subValue}>{txn.ff_subscore ?? '—'}</dd>
            </div>
            <div className={styles.subscore}>
              <dt className={styles.subLabel}>Phishing site</dt>
              <dd className={styles.subValue}>{txn.ph_subscore ?? '—'}</dd>
            </div>
            <div className={styles.subscore}>
              <dt className={styles.subLabel}>Consolidated</dt>
              <dd className={styles.subValue}>{txn.consolidated_score ?? '—'}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className={styles.block}>
          <h3 className={styles.heading}>Phishing check</h3>
          <PhishingVerdict transaction={txn} />
        </div>
      )}

      {!!txn.explanations?.length && (
        <div className={styles.block}>
          <h3 className={styles.heading}>Why this scored the way it did</h3>
          <ul className={styles.list}>
            {txn.explanations.map((line) => (
              <li key={line} className={styles.listItem}>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!txn.recommended_actions?.length && (
        <div className={styles.block}>
          <h3 className={styles.heading}>Recommended actions</h3>
          <ol className={styles.list}>
            {txn.recommended_actions.map((line) => (
              <li key={line} className={styles.listItem}>
                {line}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
