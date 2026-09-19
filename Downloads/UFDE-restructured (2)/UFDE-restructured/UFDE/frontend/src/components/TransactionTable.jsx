import { Fragment, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BandPill from './BandPill';
import RiskScoreMeter from './RiskScoreMeter';
import PhishingVerdict from './PhishingVerdict';
import TransactionDetail from './TransactionDetail';
import Alert from './Alert';
import styles from './TransactionTable.module.css';

const RESOLVE_ACTIONS = {
  MEDIUM: [
    {
      action: 'CLEAR_FALSE_POSITIVE',
      label: 'Clear as false positive',
    },
    {
      action: 'TEMPORARY_HOLD',
      label: 'Place on hold',
    },
  ],

  HIGH: [
    {
      action: 'TEMPORARY_HOLD',
      label: 'Place on hold',
    },
    {
      action: 'ESCALATE_ADMIN',
      label: 'Escalate to admin',
    },
  ],

  CRITICAL: [
    {
      action: 'FREEZE',
      label: 'Freeze funds',
    },
    {
      action: 'ESCALATE_ADMIN',
      label: 'Escalate to admin',
    },
  ],
};

const SORT_OPTIONS = [
  {
    value: 'transaction-asc',
    label: 'Transaction ID (A-Z)',
    key: 'transaction_id',
    dir: 1,
  },
  {
    value: 'transaction-desc',
    label: 'Transaction ID (Z-A)',
    key: 'transaction_id',
    dir: -1,
  },
  {
    value: 'risk-desc',
    label: 'Risk score (High-Low)',
    key: 'consolidated_score',
    dir: -1,
  },
  {
    value: 'risk-asc',
    label: 'Risk score (Low-High)',
    key: 'consolidated_score',
    dir: 1,
  },
];

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M15 3v5h4M9 13h6M9 17h4" />
    </svg>
  );
}

function HoldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 20 6v5.5c0 4.6-3 7.8-8 9.5-5-1.7-8-4.9-8-9.5V6l8-3Z" />
      <path d="m8.7 12 2.1 2.1 4.5-4.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export default function TransactionTable({
  rows,
  totalCount,
  onActionApplied,
}) {
  const { hasRole } = useAuth();

  const [sort, setSort] = useState({
    key: 'transaction_id',
    dir: 1,
  });

  const [openId, setOpenId] = useState(null);
  const [message, setMessage] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const analyst = hasRole('Analyst');

  const sorted = useMemo(() => {
    const copy = [...rows];

    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];

      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;

      if (sort.key === 'consolidated_score') {
        return (
          (Number(av) - Number(bv)) *
          sort.dir
        );
      }

      return (
        String(av).localeCompare(
          String(bv),
          undefined,
          {
            numeric: true,
            sensitivity: 'base',
          }
        ) * sort.dir
      );
    });

    return copy;
  }, [rows, sort]);

  const selectedSort =
    SORT_OPTIONS.find(
      (option) =>
        option.key === sort.key &&
        option.dir === sort.dir
    )?.value || 'transaction-asc';

  const handleSortChange = (value) => {
    const selected = SORT_OPTIONS.find(
      (option) => option.value === value
    );

    if (selected) {
      setSort({
        key: selected.key,
        dir: selected.dir,
      });
    }
  };

  const runAction = async (
    id,
    action,
    label
  ) => {
    setPendingId(id + action);
    setMessage(null);

    try {
      await api.applyAction(id, action);

      setMessage({
        tone: 'success',
        text: `${label} recorded for ${id}.`,
      });

      onActionApplied?.();
    } catch (err) {
      setMessage({
        tone: 'error',
        text: err.message,
      });
    } finally {
      setPendingId(null);
    }
  };

  const downloadPdf = async (id) => {
    setMessage(null);

    try {
      await api.downloadStr(id, 'pdf');
    } catch (err) {
      setMessage({
        tone: 'error',
        text: err.message,
      });
    }
  };

  if (!rows.length) {
    return (
      <p className={styles.empty}>
        No transactions match the selected filters.
      </p>
    );
  }

  return (
    <div className={styles.wrap}>
      {message && (
        <Alert tone={message.tone}>
          {message.text}
        </Alert>
      )}

      <div className={styles.tableToolbar}>
        <span className={styles.resultCount}>
          Showing {rows.length}{' '}
          {totalCount
            ? `of ${totalCount}`
            : ''}{' '}
          transactions
        </span>

        <label className={styles.sortControl}>
          <span>Sort by</span>

          <select
            value={selectedSort}
            onChange={(e) =>
              handleSortChange(e.target.value)
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>
                Transaction
              </th>

              <th className={styles.th}>
                Risk score
              </th>

              <th className={styles.th}>
                Band
              </th>

              <th className={styles.th}>
                Phishing
              </th>

              <th className={styles.th}>
                Status
              </th>

              {analyst && (
                <th className={styles.th}>
                  STR
                </th>
              )}

              <th className={styles.th}>
                View detail
              </th>

              <th className={styles.th}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((row) => {
              const actions =
                analyst
                  ? RESOLVE_ACTIONS[
                      row.risk_band
                    ] || []
                  : [];

              const open =
                openId === row.transaction_id;

              return (
                <Fragment
                  key={row.transaction_id}
                >
                  <tr
                    className={
                      open
                        ? styles.rowOpen
                        : styles.row
                    }
                  >
                    <td className={styles.td}>
                      <div
                        className={
                          styles.transactionCell
                        }
                      >
                        <span
                          className={
                            styles.txnId
                          }
                        >
                          {row.transaction_id}
                        </span>

                        {row.created_at && (
                          <span
                            className={
                              styles.date
                            }
                          >
                            {new Date(
                              row.created_at
                            ).toLocaleString(
                              [],
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={styles.td}>
                      <RiskScoreMeter
                        score={
                          row.consolidated_score
                        }
                      />
                    </td>

                    <td className={styles.td}>
                      <BandPill
                        band={
                          row.risk_band
                        }
                      />
                    </td>

                    <td className={styles.td}>
                      <PhishingVerdict
                        transaction={row}
                      />
                    </td>

                    <td className={styles.td}>
                      <span
                        className={
                          row.status ===
                          'REJECTED'
                            ? styles.rejected
                            : styles.processed
                        }
                      >
                        {row.status ===
                        'REJECTED'
                          ? 'Rejected'
                          : 'Scored'}
                      </span>
                    </td>

                    {analyst && (
                      <td className={styles.td}>
                        {row.str_generated ? (
                          <button
                            type="button"
                            className={
                              styles.reportButton
                            }
                            onClick={() =>
                              downloadPdf(
                                row.transaction_id
                              )
                            }
                          >
                            <ReportIcon />
                            PDF
                          </button>
                        ) : (
                          <span
                            className={
                              styles.none
                            }
                          >
                            —
                          </span>
                        )}
                      </td>
                    )}

                    <td className={styles.td}>
                      <button
                        type="button"
                        className={
                          styles.secondary
                        }
                        aria-expanded={open}
                        onClick={() =>
                          setOpenId(
                            open
                              ? null
                              : row.transaction_id
                          )
                        }
                      >
                        <EyeIcon />

                        {open
                          ? 'Hide detail'
                          : 'View detail'}
                      </button>
                    </td>

                    <td className={styles.td}>
                      <span
                        className={
                          styles.actions
                        }
                      >
                        {actions.length > 0 ? (
                          actions.map((a) => {
                            const pending =
                              pendingId ===
                              row.transaction_id +
                                a.action;

                            return (
                              <button
                                key={
                                  a.action
                                }
                                type="button"
                                className={
                                  styles.action
                                }
                                disabled={
                                  pending
                                }
                                onClick={() =>
                                  runAction(
                                    row.transaction_id,
                                    a.action,
                                    a.label
                                  )
                                }
                              >
                                {a.action ===
                                  'TEMPORARY_HOLD' && (
                                  <HoldIcon />
                                )}

                                {(a.action ===
                                  'CLEAR_FALSE_POSITIVE' ||
                                  a.action ===
                                    'FREEZE') && (
                                  <ShieldIcon />
                                )}

                                {a.action ===
                                  'ESCALATE_ADMIN' && (
                                  <ArrowIcon />
                                )}

                                {pending
                                  ? 'Processing…'
                                  : a.label}
                              </button>
                            );
                          })
                        ) : (
                          <span
                            className={
                              styles.noActions
                            }
                          >
                            —
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>

                  {open && (
                    <tr>
                      <td
                        className={
                          styles.detailCell
                        }
                        colSpan={
                          analyst ? 8 : 7
                        }
                      >
                        <TransactionDetail
                          transactionId={
                            row.transaction_id
                          }
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}