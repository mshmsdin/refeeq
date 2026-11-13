import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-genesis-apocryphon-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureGenesisApocryphonImported } = await import('./genesis_apocryphon_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all licensed 1Q20 lines, keeps the missing column absent, and repairs stale data', async () => {
  assert.equal(await ensureGenesisApocryphonImported(), true);
  const db = getDb();
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books
    WHERE code IN ('ENO2', 'NOAH', 'BNOAH', 'GENAP', 'GIANTS') ORDER BY canonical_order
  `).all(), [
    { code: 'ENO2', canonical_order: 8 },
    { code: 'NOAH', canonical_order: 8.5 },
    { code: 'BNOAH', canonical_order: 8.6 },
    { code: 'GENAP', canonical_order: 8.7 },
    { code: 'GIANTS', canonical_order: 9 }
  ]);

  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'arc-qdr-1q20-genesis-apocryphon-2026');
  assert.ok(source);
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
  `).get(source.slug);
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });

  const expected = parseReviewedUnitText(await (await import('node:fs/promises')).readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const readRows = () => db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='GENAP' ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(readRows(), expected);
  assert.equal(readRows().length, 494);
  assert.equal(new Set(readRows().map(({ chapter }) => chapter)).size, 22);
  assert.equal(new Set(readRows().map(({ source_url }) => source_url)).size, 494);
  assert.equal(readRows().some(({ chapter }) => chapter === 19), false);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='GENAP'").get().text_status, 'partial');

  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='GENAP' AND chapter=1 AND verse=1").run(translation.id);
  assert.equal(await ensureGenesisApocryphonImported(), true);
  assert.deepEqual(readRows(), expected);
  assert.equal(await ensureGenesisApocryphonImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='GENAP'").get().count, 494);
});
