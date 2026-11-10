-- Additive upgrade: existing marketplace data and historical auth tables are preserved.
CREATE TABLE local_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created TEXT NOT NULL
);
CREATE TABLE local_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('member','admin')),
  credential_version TEXT NOT NULL,
  expires INTEGER NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX local_sessions_user ON local_sessions(user_id);
CREATE INDEX local_sessions_expiry ON local_sessions(expires);
CREATE TABLE local_auth_limits (key TEXT PRIMARY KEY NOT NULL,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE local_password_resets (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES local_accounts(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
