const db = require('../config/database');

const Ingestion = {
  record({ fileName, fileType, recordCount, uploadedBy }) {
    return db
      .prepare('INSERT INTO ingestions (file_name, file_type, record_count, uploaded_by) VALUES (?, ?, ?, ?)')
      .run(fileName, fileType, recordCount, uploadedBy);
  },
  list() {
    return db.prepare('SELECT * FROM ingestions ORDER BY id DESC').all();
  },
};

module.exports = Ingestion;
