CREATE TABLE IF NOT EXISTS competition_weeks (
 week TEXT PRIMARY KEY, opened_at TEXT NOT NULL, opened_by TEXT NOT NULL,
 published_at TEXT, final_json TEXT
);
CREATE TABLE IF NOT EXISTS competition_attempts (
 uid TEXT NOT NULL, day TEXT NOT NULL, week TEXT NOT NULL, name TEXT NOT NULL,
 program TEXT NOT NULL, paper TEXT NOT NULL, choices TEXT, score INTEGER CHECK(score BETWEEN 0 AND 10),
 submitted_at TEXT, PRIMARY KEY(uid,day)
);
CREATE INDEX IF NOT EXISTS competition_scores ON competition_attempts(week,uid,submitted_at);
