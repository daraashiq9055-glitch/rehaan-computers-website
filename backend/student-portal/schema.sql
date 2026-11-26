CREATE TABLE IF NOT EXISTS question_bank (
  id TEXT PRIMARY KEY, program TEXT NOT NULL, question TEXT NOT NULL,
  options_json TEXT NOT NULL, answer INTEGER NOT NULL CHECK(answer BETWEEN 0 AND 3),
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, author_uid TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS question_bank_program ON question_bank(program,active);
CREATE TABLE IF NOT EXISTS attempts (
  uid TEXT NOT NULL, day TEXT NOT NULL, cycle TEXT NOT NULL, program TEXT NOT NULL,
  questions_json TEXT NOT NULL, key_json TEXT NOT NULL, answers_json TEXT,
  score INTEGER, points INTEGER, completed_at TEXT,
  PRIMARY KEY(uid,day)
);
CREATE INDEX IF NOT EXISTS attempts_cycle ON attempts(cycle,completed_at);
CREATE TABLE IF NOT EXISTS visits (uid TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY(uid,day));
CREATE TABLE IF NOT EXISTS student_profiles (
  uid TEXT PRIMARY KEY, display_name TEXT NOT NULL, admission TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS league_entries (
  period TEXT NOT NULL, period_key TEXT NOT NULL, uid TEXT NOT NULL,
  rank INTEGER NOT NULL, display_name TEXT NOT NULL, score INTEGER NOT NULL,
  quiz_days INTEGER NOT NULL, published_at TEXT NOT NULL,
  PRIMARY KEY(period,period_key,uid)
);
CREATE INDEX IF NOT EXISTS league_order ON league_entries(period,period_key,rank);
CREATE TABLE IF NOT EXISTS league_awards (
  cycle TEXT NOT NULL, uid TEXT NOT NULL, bonus INTEGER NOT NULL,
  rank INTEGER NOT NULL, PRIMARY KEY(cycle,uid)
);
