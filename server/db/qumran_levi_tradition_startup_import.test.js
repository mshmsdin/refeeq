import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-levi-apocrypha-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumranLeviTraditionImported } = await import('./qumran_levi_tradition_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and repairs the Qumran Levi tradition witnesses without merging them', async () => {
  assert.equal(await ensureQumranLeviTraditionImported(), true);
  const db = getDb();
  const expected = [
    { slug: 'arc-qdr-apocryphon-levi-a-2026', book: 'APLEV540', units: 9, chapters: 3 },
    { slug: 'arc-qdr-apocryphon-levi-b-2026', book: 'APLEV541', units: 118, chapters: 31 },
    { slug: 'arc-qdr-testament-qahat-2026', book: 'QAHAT', units: 39, chapters: 5 }
  ];
  for (const item of expected) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(item.slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type
    }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, item.book);
    assert.equal(rows.length, item.units);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, item.chapters);
    assert.equal(new Set(rows.map(({ source_url }) => source_url)).size, item.units);
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get(item.book).text_status, 'partial');
  }

  const stale = db.prepare(`
    SELECT bv.id, bv.translation_id FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug='arc-qdr-apocryphon-levi-b-2026' ORDER BY bv.chapter DESC, bv.verse DESC LIMIT 1
  `).get();
  db.prepare('UPDATE bible_verses SET text=? WHERE id=?').run('stale', stale.id);
  const sourceDefinition = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'arc-qdr-apocryphon-levi-a-2026');
  const qahatSource = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'arc-qdr-testament-qahat-2026');
  db.prepare("UPDATE bible_book_metadata SET source_notes='stale' WHERE book_code='APLEV540'").run();
  db.prepare("UPDATE bible_book_sources SET notes='stale' WHERE book_code='APLEV540' AND source_url=?").run(sourceDefinition.url);
  db.prepare("UPDATE bible_book_metadata SET source_notes='stale' WHERE book_code='QAHAT'").run();
  assert.equal(await ensureQumranLeviTraditionImported(), true);
  assert.notEqual(db.prepare('SELECT text FROM bible_verses WHERE id=?').get(stale.id).text, 'stale');
  assert.equal(db.prepare("SELECT source_notes FROM bible_book_metadata WHERE book_code='APLEV540'").get().source_notes, sourceDefinition.notes);
  assert.equal(db.prepare("SELECT notes FROM bible_book_sources WHERE book_code='APLEV540' AND source_url=?").get(sourceDefinition.url).notes, sourceDefinition.notes);
  assert.equal(db.prepare("SELECT source_notes FROM bible_book_metadata WHERE book_code='QAHAT'").get().source_notes, qahatSource.notes);
  assert.equal(await ensureQumranLeviTraditionImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code IN ('APLEV540','APLEV541','QAHAT')").get().count, 166);
});
