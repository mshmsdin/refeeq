import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-noah-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureNoahQumranImported } = await import('./noah_qumran_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the two licensed Noah-related Qumran witnesses as separate partial Hebrew sources', async () => {
  assert.equal(await ensureNoahQumranImported(), true);
  const db = getDb();
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books
    WHERE code IN ('ENO2', 'NOAH', 'GIANTS') ORDER BY canonical_order
  `).all(), [
    { code: 'ENO2', canonical_order: 8 },
    { code: 'NOAH', canonical_order: 8.5 },
    { code: 'GIANTS', canonical_order: 9 }
  ]);

  const expected = [
    ['1Q19', 'he-qdr-1q19-noah-fragments-2026', 42, 19],
    ['1Q19bis', 'he-qdr-1q19bis-noah-fragments-2024', 6, 1]
  ];
  for (const [witness, slug, unitCount, sectionCount] of expected) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual(translation && {
      language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type
    }, { language: 'he', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const rows = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='NOAH' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(rows.length, unitCount);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, sectionCount);
    assert.equal(new Set(rows.map(({ source_url }) => source_url)).size, unitCount);
    assert.ok(rows.every(({ text, source_url }) => text.startsWith(`‹${witness} frg. `)
      && source_url.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${witness}/`)
      && source_url.includes('#')));
  }
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='NOAH'").get().text_status, 'partial');

  const first = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(expected[0][1]);
  db.prepare("UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='NOAH' AND chapter=1 AND verse=1").run(first.id);
  assert.equal(await ensureNoahQumranImported(), true);
  assert.match(db.prepare("SELECT text FROM bible_verses WHERE translation_id=? AND book_code='NOAH' AND chapter=1 AND verse=1").get(first.id).text, /^‹1Q19 frg\./u);
  assert.equal(await ensureNoahQumranImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='NOAH'").get().count, 48);
  assert.equal(ADDITIONAL_SOURCES.filter(({ slug }) => slug.startsWith('he-qdr-1q19')).length, 2);
});
