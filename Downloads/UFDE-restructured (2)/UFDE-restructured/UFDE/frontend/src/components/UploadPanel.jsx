import { useRef, useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';
import styles from './UploadPanel.module.css';

/** Admin-only batch ingestion against POST /api/upload. */
export default function UploadPanel({ onIngested }) {
  const formRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const form = formRef.current;
    const payload = new FormData();
    ['af', 'ff', 'ph'].forEach((field) => {
      const file = form.elements[field].files[0];
      if (file) payload.append(field, file);
    });

    if (![...payload.keys()].length) {
      setStatus({ tone: 'warning', text: 'Choose at least one file before processing.' });
      return;
    }

    setBusy(true);
    setStatus({ tone: 'info', text: 'Processing batch…' });
    try {
      const result = await api.upload(payload);
      setStatus({
        tone: 'success',
        text: `Processed ${result.processedCount} transaction(s), rejected ${result.rejectedCount}.`,
      });
      form.reset();
      onIngested?.();
    } catch (err) {
      setStatus({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Ingest a transaction batch</h2>
      <form ref={formRef} onSubmit={submit}>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.label}>Adaptive friction (.json)</span>
            <input className={styles.file} type="file" name="af" accept=".json" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Fund-flow ledger (.csv)</span>
            <input className={styles.file} type="file" name="ff" accept=".csv" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Phishing sites (.json)</span>
            <input className={styles.file} type="file" name="ph" accept=".json" />
          </label>
        </div>
        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? 'Processing…' : 'Upload and score'}
        </button>
      </form>
      {status && <Alert tone={status.tone}>{status.text}</Alert>}
    </section>
  );
}
