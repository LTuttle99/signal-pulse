-- Enforce the same persistence restriction when an existing observation is updated.
CREATE TRIGGER market_rights_update_guard BEFORE UPDATE ON market_observations
WHEN COALESCE((SELECT persistence_allowed FROM market_sources WHERE id=NEW.source_id),0) != 1
BEGIN SELECT RAISE(ABORT,'Market persistence is not authorized for this source'); END;
