CREATE TABLE forecast_versions(id TEXT PRIMARY KEY,model_version TEXT NOT NULL,generated_at TEXT NOT NULL,cutoff TEXT NOT NULL,input_hash TEXT NOT NULL,data TEXT NOT NULL);
CREATE INDEX forecast_date ON forecast_versions(generated_at DESC);
CREATE TABLE published_picks(version_id TEXT NOT NULL REFERENCES forecast_versions(id),race_id TEXT NOT NULL,candidate_id TEXT NOT NULL,margin REAL,authored_by TEXT NOT NULL,published_at TEXT NOT NULL,PRIMARY KEY(version_id,race_id));
CREATE TABLE forecast_metrics(version_id TEXT NOT NULL REFERENCES forecast_versions(id),race_id TEXT NOT NULL,certified_source TEXT NOT NULL,certified_at TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(version_id,race_id));
