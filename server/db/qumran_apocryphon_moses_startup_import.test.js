import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-apocryphon-moses-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup import installs each partial Apocryphon of Moses witness once and repairs drift', async () => {
  let ensureApocryphonMosesImported;
  try {
    ({ ensureApocryphonMosesImported } = await import('./qumran_apocryphon_moses_startup_import.js'));
  } catch (error) {
    assert.fail(`startup importer is missing: ${error.message}`);
  }

  assert.equal(await ensureApocryphonMosesImported(), true);
  const db = getDb();
  const expected = [
    ['APM1Q29', 'heb-qdr-1q29-apocryphon-moses-2026', 30, 8, 23.1],
    ['APM4Q375', 'heb-qdr-4q375-apocryphon-moses-2026', 16, 2, 23.2],
    ['APM4Q376', 'heb-qdr-4q376-apocryphon-moses-2026', 12, 4, 23.3],
    ['APM4Q408', 'heb-qdr-4q408-apocryphon-moses-2026', 57, 17, 23.4]
  ];
  for (const [bookCode, slug, unitCount, groupCount, order] of expected) {
    const source = ADDITIONAL_SOURCES.find(({ slug: candidate }) => candidate === slug);
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.deepEqual({ language: translation.language, is_active: translation.is_active,
      site_scope: translation.site_scope, source_type: translation.source_type },
    { language: 'hbo', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    assert.deepEqual(db.prepare(`SELECT canonical_order FROM bible_books WHERE code=?`).get(bookCode),
      { canonical_order: order });
    const rows = db.prepare(`SELECT chapter, verse, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse`).all(translation.id, bookCode);
    assert.equal(rows.length, unitCount);
    assert.equal(new Set(rows.map(({ chapter }) => chapter)).size, groupCount);
    assert.ok(rows.every(({ source_url }) => source_url.startsWith(source.url) && source_url.includes('#')));
    assert.equal(db.prepare(`SELECT text_status FROM bible_book_metadata WHERE book_code=?`).get(bookCode).text_status,
      'partial');
  }

  const first = db.prepare(`SELECT id FROM bible_translations WHERE slug=?`).get(expected[0][1]);
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code=? AND chapter=1 AND verse=1`)
    .run(first.id, expected[0][0]);
  assert.equal(await ensureApocryphonMosesImported(), true);
  assert.equal(await ensureApocryphonMosesImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code LIKE 'APM%'").get().count, 115);
});
