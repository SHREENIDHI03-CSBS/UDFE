import { useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';
import styles from './ExportPanel.module.css';

export default function ExportPanel() {
  const [error, setError] = useState('');

  const download = async (format) => {
    setError('');
    try {
      await api.downloadExport(format);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Export case data</h2>
      <p className={styles.body}>
        Every scored transaction with its score, band and recommended actions.
      </p>
      <div className={styles.buttons}>
        <button type="button" className={styles.primary} onClick={() => download('json')}>
          Download JSON
        </button>
        <button type="button" className={styles.secondary} onClick={() => download('csv')}>
          Download CSV
        </button>
      </div>
      <Alert tone="error">{error}</Alert>
    </section>
  );
}
