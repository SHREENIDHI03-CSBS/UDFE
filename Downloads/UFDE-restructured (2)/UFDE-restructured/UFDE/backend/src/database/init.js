const fs = require('fs');
const path = require('path');
const db = require('../config/database');

function initDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  return db;
}

module.exports = { initDatabase };
