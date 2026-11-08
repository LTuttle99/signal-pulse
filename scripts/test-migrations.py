import sqlite3
from pathlib import Path
con=sqlite3.connect(':memory:')
for p in sorted(Path('migrations').glob('*.sql')):
    con.executescript(p.read_text())
# Verify legacy tables survive and quote-persistence permissions are enforced.
assert con.execute("SELECT count(*) FROM sqlite_master WHERE name='races'").fetchone()[0]==1
con.execute("INSERT INTO companies VALUES('TEST','Test',NULL,'Fixture','{}','2026-11-05')")
con.execute("INSERT INTO stock_symbols VALUES('TEST','TEST','NYSE','stock')")
try:
    con.execute("INSERT INTO market_observations VALUES('test','TEST','tradingview','2026-11-05','{}')")
    raise AssertionError('Unauthorized market persistence accepted')
except sqlite3.IntegrityError as error:
    assert 'not authorized' in str(error)
con.execute("INSERT INTO market_sources VALUES('fixture','Authorized fixture','Tests only',1,'https://example.org')")
con.execute("INSERT INTO market_observations VALUES('allowed','TEST','fixture','2026-11-05','{}')")
try:
    con.execute("UPDATE market_observations SET source_id='tradingview' WHERE id='allowed'")
    raise AssertionError('Unauthorized market update accepted')
except sqlite3.IntegrityError as error:
    assert 'not authorized' in str(error)
assert not con.execute('PRAGMA foreign_key_check').fetchall()
plan=con.execute("EXPLAIN QUERY PLAN SELECT data FROM pulse_cache WHERE key >= (? || ':' || (SELECT data FROM pulse_cache WHERE key='active') || ':') AND key < (? || ':' || (SELECT data FROM pulse_cache WHERE key='active') || ':~') ORDER BY key LIMIT 100",('dashboard','dashboard')).fetchall()
assert any('SEARCH pulse_cache USING INDEX' in row[3] and 'key>?' in row[3] for row in plan), plan
print('All 6 additive migrations passed; legacy tables retained, market rights guard enforced, foreign keys valid.')
