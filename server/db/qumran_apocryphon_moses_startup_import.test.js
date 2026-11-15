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

  const english = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-project-4q375-apocryphon-moses-2026'
  `).get();
  assert.deepEqual(english && {
    language: english.language, is_active: english.is_active,
    site_scope: english.site_scope, source_type: english.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const englishRows = db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='APM4Q375' ORDER BY chapter, verse`).all(english.id);
  assert.equal(englishRows.length, 16);
  assert.deepEqual(englishRows.reduce((counts, { chapter }) => {
    counts[chapter - 1] += 1;
    return counts;
  }, [0, 0]), [9, 7]);
  assert.ok(englishRows.every(({ source_url }) => source_url.startsWith(
    'https://lexicon.qumran-digital.org/transcriptions/4Q375/2026-05-21/index.html?v=2026-05-21#')));
  const hebrewId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(expected[1][1]).id;
  const hebrewRows = db.prepare(`SELECT chapter, verse, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='APM4Q375' ORDER BY chapter, verse`).all(hebrewId);
  assert.deepEqual(englishRows.map(({ chapter, verse, source_url }) => ({ chapter, verse, source_url })), hebrewRows);
  assert.match(englishRows[0].text, /prophet/);
  assert.match(englishRows[14].text, /hidden|concealed/i);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='APM4Q375'").get().text_status,
    'partial');

  const translation376 = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-project-4q376-apocryphon-moses-2026'
  `).get();
  assert.deepEqual(translation376 && {
    language: translation376.language, is_active: translation376.is_active,
    site_scope: translation376.site_scope, source_type: translation376.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const english376Rows = db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='APM4Q376' ORDER BY chapter, verse`).all(translation376.id);
  assert.equal(english376Rows.length, 12);
  assert.deepEqual(english376Rows.reduce((counts, { chapter }) => {
    counts[chapter - 1] += 1;
    return counts;
  }, [0, 0, 0, 0]), [3, 4, 3, 2]);
  const hebrew376Id = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(expected[2][1]).id;
  const hebrew376Rows = db.prepare(`SELECT chapter, verse, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='APM4Q376' ORDER BY chapter, verse`).all(hebrew376Id);
  assert.deepEqual(english376Rows.map(({ chapter, verse, source_url }) => ({ chapter, verse, source_url })),
    hebrew376Rows);
  assert.ok(english376Rows.every(({ text }) => text.length > 0));
  assert.match(english376Rows[0].text, /fragmentary|anointed priest/i);
  assert.match(english376Rows[3].text, /fire|stone|ephod/i);
  assert.match(english376Rows[11].text, /too little survives/i);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='APM4Q376'").get().text_status,
    'partial');

  const first = db.prepare(`SELECT id FROM bible_translations WHERE slug=?`).get(expected[0][1]);
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code=? AND chapter=1 AND verse=1`)
    .run(first.id, expected[0][0]);
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='APM4Q375' AND chapter=1 AND verse=1`)
    .run(english.id);
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='APM4Q376' AND chapter=1 AND verse=1`)
    .run(translation376.id);
  assert.equal(await ensureApocryphonMosesImported(), true);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='APM4Q375' ORDER BY chapter, verse`).all(english.id), englishRows);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='APM4Q376' ORDER BY chapter, verse`).all(translation376.id), english376Rows);
  assert.equal(await ensureApocryphonMosesImported(), false);
  assert.deepEqual(db.prepare(`SELECT bt.language, COUNT(bv.id) AS count
    FROM bible_translations bt JOIN bible_verses bv ON bv.translation_id=bt.id
    WHERE bv.book_code LIKE 'APM%' GROUP BY bt.language ORDER BY bt.language`).all(), [
    { language: 'en', count: 28 },
    { language: 'hbo', count: 115 }
  ]);
});
