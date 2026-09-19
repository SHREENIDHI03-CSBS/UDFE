import styles from './PhishingVerdict.module.css';

/**
 * Plain-language phishing outcome. Viewers see only this verdict rather than
 * the numeric PH sub-score.
 */
export function phishingVerdict(transaction) {
  const listing = transaction?.raw_ph?.localListing;
  if (listing === 'blacklist') return { key: 'confirmed', label: 'Known phishing site' };
  if (transaction?.ph_subscore === null || transaction?.ph_subscore === undefined) {
    return { key: 'unknown', label: 'Not assessed' };
  }
  if (transaction.ph_subscore >= 70) return { key: 'suspected', label: 'Likely phishing' };
  if (transaction.ph_subscore >= 40) return { key: 'inconclusive', label: 'Inconclusive' };
  return { key: 'clear', label: 'No phishing indicators' };
}

export default function PhishingVerdict({ transaction }) {
  const verdict = phishingVerdict(transaction);
  return <span className={`${styles.verdict} ${styles[verdict.key]}`}>{verdict.label}</span>;
}
