CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Viewer','Analyst','Admin')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PROCESSED', -- PROCESSED | REJECTED
  reject_reason TEXT,
  af_subscore REAL,
  ff_subscore REAL,
  ph_subscore REAL,
  consolidated_score REAL,
  risk_band TEXT,
  recommended_actions TEXT, -- JSON array
  explanations TEXT,        -- JSON array
  raw_af TEXT,               -- JSON
  raw_ff TEXT,                -- JSON
  raw_ph TEXT,                -- JSON
  str_generated INTEGER DEFAULT 0,
  str_path TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,      -- INGEST | SCORE | REJECT | ACTION | EXPORT | LOGIN | STR_GENERATED
  actor TEXT,                    -- user email or 'system'
  transaction_id TEXT,
  details TEXT,                  -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scoring_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_json TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ingestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT,
  file_type TEXT, -- AF | FF | PH
  record_count INTEGER,
  uploaded_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
