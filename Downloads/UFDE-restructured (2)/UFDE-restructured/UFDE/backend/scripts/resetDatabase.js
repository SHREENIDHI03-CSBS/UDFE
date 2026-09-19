require('dotenv').config();
import { existsSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';

const dbPath = process.env.DB_PATH
  ? resolve(process.cwd(), process.env.DB_PATH)
  : join(__dirname, '..', 'database', 'ufde.db');

['', '-wal', '-shm'].forEach((suffix) => {
  const p = dbPath + suffix;
  if (existsSync(p)) {
    unlinkSync(p);
    console.log(`Removed ${p}`);
  }
});

console.log('Database files removed. Run "npm run init-db" and "npm run seed-admin" to recreate.');
