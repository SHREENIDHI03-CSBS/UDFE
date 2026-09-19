import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';
import styles from './UsersTable.module.css';

export default function UsersTable() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listUsers().then(setUsers).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!users) return <p className={styles.loading}>Loading users…</p>;

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Name</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th}>Role</th>
            <th className={styles.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={styles.row}>
              <td className={styles.td}>{u.name}</td>
              <td className={styles.td}>{u.email}</td>
              <td className={styles.td}>
                <span className={styles.role}>{u.role}</span>
              </td>
              <td className={styles.td}>{u.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
