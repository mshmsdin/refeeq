import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q537-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumran4Q537Imported } = await import('./qumran_4q537_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all licensed 4Q537 lines as a separate, partial Aramaic witness', async () => {
  const db = getDb();
  const copticJacobMetadata = db.prepare("SELECT * FROM bible_book_metadata WHERE book_code='TAJACOB'").get();
  assert.ok(copticJacobMetadata);
  assert.equal(await ensureQumran4Q537Imported(), true);
  assert.deepEqual(db.prepare("SELECT * FROM bible_book_metadata WHERE book_code='TAJACOB'").get(), copticJacobMetadata);
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books WHERE code IN ('TAJACOB', 'QJACOB', 'ARL')
    ORDER BY canonical_order
  `).all(), [
    { code: 'TAJACOB', canonical_order: 15 },
    { code: 'QJACOB', canonical_order: 15.5 },
    { code: 'ARL', canonical_order: 16 }
  ]);
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='arc-qdr-4q537-testament-jacob-2026'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='QJACOB' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 62);
  assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, 23);
  assert.ok(rows.every(({ text, source_url }) => text.startsWith('‹4Q537 frg. ')
    && source_url.startsWith('https://lexicon.qumran-digital.org/transcriptions/4Q537/2026-10-06/index.html')
    && source_url.includes('#')));
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='QJACOB'").get().text_status, 'partial');
  const first = rows[0];
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='QJACOB' AND chapter=? AND verse=?`)
    .run(translation.id, first.chapter, first.verse);
  assert.equal(await ensureQumran4Q537Imported(), true);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='QJACOB' ORDER BY chapter, verse`).all(translation.id), rows);
  assert.equal(await ensureQumran4Q537Imported(), false);
  assert.equal(ADDITIONAL_SOURCES.filter(({ slug }) => slug === 'arc-qdr-4q537-testament-jacob-2026').length, 1);
});
