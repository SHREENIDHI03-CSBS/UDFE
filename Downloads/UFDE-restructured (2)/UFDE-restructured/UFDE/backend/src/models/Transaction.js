const db = require('../config/database');

function parseRow(row) {
  if (!row) return row;
  return {
    ...row,
    recommended_actions: row.recommended_actions ? JSON.parse(row.recommended_actions) : null,
    explanations: row.explanations ? JSON.parse(row.explanations) : null,
    raw_af: row.raw_af ? JSON.parse(row.raw_af) : null,
    raw_ff: row.raw_ff ? JSON.parse(row.raw_ff) : null,
    raw_ph: row.raw_ph ? JSON.parse(row.raw_ph) : null,
  };
}

const Transaction = {
  findByTransactionId(transactionId) {
    return parseRow(db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(transactionId));
  },
  list({ limit = 100, band = null, status = null } = {}) {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    if (band) {
      query += ' AND risk_band = ?';
      params.push(band);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);
    return db.prepare(query).all(...params).map(parseRow);
  },
  all() {
    return db.prepare('SELECT * FROM transactions ORDER BY id DESC').all().map(parseRow);
  },
};

module.exports = Transaction;
