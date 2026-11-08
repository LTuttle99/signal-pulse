CREATE TABLE poll_race_links(poll_id TEXT NOT NULL REFERENCES polls(id),race_id TEXT REFERENCES races(id),confidence TEXT NOT NULL,reason TEXT NOT NULL,choices TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(poll_id));
CREATE INDEX poll_links_race ON poll_race_links(race_id);
CREATE TABLE ingestion_alerts(id TEXT PRIMARY KEY,checked_at TEXT NOT NULL,severity TEXT NOT NULL,detail TEXT NOT NULL);
