CREATE TABLE race_aliases(old_id TEXT PRIMARY KEY,new_id TEXT NOT NULL REFERENCES races(id),reason TEXT NOT NULL,source_url TEXT NOT NULL);
CREATE INDEX race_alias_target ON race_aliases(new_id);
