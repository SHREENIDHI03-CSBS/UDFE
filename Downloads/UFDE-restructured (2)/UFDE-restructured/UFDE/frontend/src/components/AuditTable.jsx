import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';
import styles from './AuditTable.module.css';

const EVENT_LABELS = {
  LOGIN: 'Sign-in',
  INGEST: 'Batch ingested',
  SCORE: 'Transaction scored',
  REJECT: 'Validation rejected',
  ACTION: 'Analyst action',
  EXPORT: 'Data exported',
  STR_GENERATED: 'STR generated',
};

export default function AuditTable({ limit = 200 }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listAuditLog(limit).then(setRows).catch((err) => setError(err.message));
  }, [limit]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!rows) return <p className={styles.loading}>Loading the audit trail…</p>;
  if (!rows.length) return <p className={styles.loading}>No activity recorded yet.</p>;

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>When</th>
            <th className={styles.th}>Event</th>
            <th className={styles.th}>Actor</th>
            <th className={styles.th}>Transaction</th>
            <th className={styles.th}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={styles.row}>
              <td className={styles.tdTime}>{r.created_at}</td>
              <td className={styles.td}>{EVENT_LABELS[r.event_type] || r.event_type}</td>
              <td className={styles.td}>{r.actor || '—'}</td>
              <td className={styles.td}>{r.transaction_id || '—'}</td>
              <td className={styles.tdDetail}>
                <code className={styles.code}>{JSON.stringify(r.details)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
