CREATE TABLE IF NOT EXISTS subscribers (
 id TEXT PRIMARY KEY, token TEXT NOT NULL, management_hash TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, path TEXT NOT NULL,
 created_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
 campaign_id TEXT NOT NULL, subscriber_id TEXT NOT NULL,
 state TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY (campaign_id, subscriber_id)
);
CREATE TABLE IF NOT EXISTS website_metrics (
 day TEXT PRIMARY KEY,
 page_views INTEGER NOT NULL DEFAULT 0,
 last_seen TEXT NOT NULL
);
