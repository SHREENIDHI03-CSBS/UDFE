import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import StatCard from '../components/StatCard';
import UploadPanel from '../components/UploadPanel';
import TransactionTable from '../components/TransactionTable';
import Alert from '../components/Alert';
import { phishingVerdict } from '../components/PhishingVerdict';
import styles from './Dashboard.module.css';

const BANDS = [
  { value: '', label: 'All bands' },
  { value: 'VERY_LOW', label: 'Very low' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'PROCESSED', label: 'Scored' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PHISHING_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'clear', label: 'No phishing indicators' },
  { value: 'inconclusive', label: 'Inconclusive' },
  { value: 'suspected', label: 'Likely phishing' },
  { value: 'confirmed', label: 'Known phishing site' },
  { value: 'unknown', label: 'Not assessed' },
];

const initialFilters = {
  search: '',
  band: '',
  status: '',
  phishing: '',
};

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16l-6.2 7.1V18l-3.6 1.8v-7.7L4 5Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M15 3v5h4M9 13h6M9 17h6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v4.5M12 17h.01" />
    </svg>
  );
}

function DangerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </svg>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();

  const [rows, setRows] = useState([]);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.listTransactions({});
      setRows(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        String(row.transaction_id || '')
          .toLowerCase()
          .includes(search);

      const matchesBand =
        !filters.band || row.risk_band === filters.band;

      const matchesStatus =
        !filters.status || row.status === filters.status;

      const phishing = phishingVerdict(row);

      const matchesPhishing =
        !filters.phishing || phishing.key === filters.phishing;

      return (
        matchesSearch &&
        matchesBand &&
        matchesStatus &&
        matchesPhishing
      );
    });
  }, [rows, filters]);

  const stats = useMemo(() => {
    const scored = rows.filter(
      (r) => r.status === 'PROCESSED'
    ).length;

    const rejected = rows.filter(
      (r) => r.status === 'REJECTED'
    ).length;

    const strs = rows.filter(
      (r) => r.str_generated
    ).length;

    const highOrCritical = rows.filter(
      (r) =>
        r.risk_band === 'HIGH' ||
        r.risk_band === 'CRITICAL'
    ).length;

    return {
      scored,
      rejected,
      strs,
      highOrCritical,
    };
  }, [rows]);

  const updateFilter = (key, value) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
  };

  return (
    <>
      <TopBar active="dashboard" />

      <main className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Alert queue</h1>

            <p className={styles.subtitle}>
              Review scored transactions and take appropriate actions.
            </p>
          </div>

          <div className={styles.motto}>
            <strong>
              Detect&nbsp; • &nbsp;Analyse&nbsp; • &nbsp;Prevent
            </strong>

            <span>Safer Transactions. Stronger Trust.</span>
          </div>
        </header>

        {hasRole('Admin') && (
          <div className={styles.block}>
            <UploadPanel onIngested={load} />
          </div>
        )}

        <div className={styles.statsRow}>
          <StatCard
            value={stats.scored}
            label="Scored"
            subtext="Transactions analyzed"
            icon={<DocumentIcon />}
          />

          <StatCard
            value={stats.highOrCritical}
            label="High or critical"
            subtext="Require attention"
            tone="warn"
            icon={<AlertIcon />}
          />

          <StatCard
            value={stats.rejected}
            label="Rejected at validation"
            subtext="Invalid or incomplete data"
            tone="danger"
            icon={<DangerIcon />}
          />

          {hasRole('Analyst') && (
            <StatCard
              value={stats.strs}
              label="STRs generated"
              subtext="Reports created"
              icon={<DocumentIcon />}
            />
          )}
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <section className={styles.contentGrid}>
          <aside className={styles.filterPanel}>
            <div className={styles.filterHeading}>
              <span className={styles.filterIcon}>
                <FilterIcon />
              </span>

              <h2>Filters</h2>
            </div>

            <label className={styles.field}>
              <span>Search transaction ID</span>

              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>⌕</span>

                <input
                  type="search"
                  placeholder="Search..."
                  value={draftFilters.search}
                  onChange={(e) =>
                    updateFilter('search', e.target.value)
                  }
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Risk band</span>

              <select
                className={styles.filterSelect}
                value={draftFilters.band}
                onChange={(e) =>
                  updateFilter('band', e.target.value)
                }
              >
                {BANDS.map((option) => (
                  <option
                    key={option.value || 'all'}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Status</span>

              <select
                className={styles.filterSelect}
                value={draftFilters.status}
                onChange={(e) =>
                  updateFilter('status', e.target.value)
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value || 'all'}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Phishing</span>

              <select
                className={styles.filterSelect}
                value={draftFilters.phishing}
                onChange={(e) =>
                  updateFilter('phishing', e.target.value)
                }
              >
                {PHISHING_OPTIONS.map((option) => (
                  <option
                    key={option.value || 'all'}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.filterButtons}>
              <button
                type="button"
                className={styles.applyButton}
                onClick={applyFilters}
              >
                Apply filters
              </button>

              <button
                type="button"
                className={styles.resetButton}
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>
          </aside>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div className={styles.panelTitleWrap}>
                <span className={styles.panelIcon}>
                  <DocumentIcon />
                </span>

                <div>
                  <h2 className={styles.panelTitle}>
                    All transactions
                  </h2>

                  <p className={styles.panelSubtitle}>
                    Every scored transaction with its sub-score
                    breakdown and the actions you can take.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <p className={styles.loading}>
                Loading the queue…
              </p>
            ) : (
              <TransactionTable
                rows={filteredRows}
                totalCount={rows.length}
                onActionApplied={load}
              />
            )}
          </section>
        </section>

        <p className={styles.signature}>
          Signed in as {user?.email}
        </p>
      </main>
    </>
  );
}