const db = require('../config/database');

const User = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },
  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  create({ name, email, passwordHash, role }) {
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, email, passwordHash, role);
    return User.findById(info.lastInsertRowid);
  },
  list() {
    return db.prepare('SELECT id, name, email, role, created_at FROM users').all();
  },
};

module.exports = User;
