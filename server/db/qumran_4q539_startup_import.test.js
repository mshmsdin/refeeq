import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q539-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureQumran4Q539Imported } = await import('./qumran_4q539_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports every preserved 4Q539 line and its partial, attributed English draft without claiming completeness', async () => {
  const db = getDb();
  const josephMetadata = db.prepare("SELECT * FROM bible_book_metadata WHERE book_code='JOSEPH'").get();
  assert.ok(josephMetadata);
  assert.equal(await ensureQumran4Q539Imported(), true);
  assert.deepEqual(db.prepare("SELECT * FROM bible_book_metadata WHERE book_code='JOSEPH'").get(), josephMetadata);
  assert.deepEqual(db.prepare("SELECT alias FROM bible_book_aliases WHERE book_code='Q539' ORDER BY alias").all(), [
    { alias: '4QApocryphon of Joseph B' },
    { alias: 'Qumran Aramaic Witness 4Q539' },
    { alias: 'أبوكريفون يوسف ب' },
    { alias: 'الشاهد القمراني الآرامي 4Q539' },
    { alias: 'وصية يوسف' }
  ]);
  assert.deepEqual(db.prepare(`
    SELECT code, canonical_order FROM bible_books WHERE code IN ('JOSEPH', 'Q539', 'TJOB')
    ORDER BY canonical_order
  `).all(), [
    { code: 'JOSEPH', canonical_order: 21 },
    { code: 'Q539', canonical_order: 21.5 },
    { code: 'TJOB', canonical_order: 22 }
  ]);
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='arc-qdr-4q539-qumran-digital-2025'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q539' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 19);
  assert.deepEqual(rows.reduce((counts, { chapter }) => {
    counts[chapter - 1] += 1;
    return counts;
  }, [0, 0, 0, 0]), [3, 7, 6, 3]);
  assert.ok(rows.every(({ text, source_url }) => text.startsWith('‹4Q539 frg. ')
    && source_url.startsWith('https://qumran.alexschapiro.com/transcriptions/4Q539/2025-08-25/index.html?v=2025-08-25#')));
  assert.match(rows[0].text, /ברגג/);
  assert.match(rows[3].text, /יעקוב/);
  const english = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-project-4q539-fragments-2026'
  `).get();
  assert.deepEqual(english && {
    language: english.language, is_active: english.is_active,
    site_scope: english.site_scope, source_type: english.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const translatedRows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q539' ORDER BY chapter, verse
  `).all(english.id);
  assert.equal(translatedRows.length, 19);
  assert.deepEqual(translatedRows.map(({ chapter, verse }) => [chapter, verse]),
    rows.map(({ chapter, verse }) => [chapter, verse]));
  assert.deepEqual(translatedRows.map(({ source_url }) => source_url.slice(source_url.indexOf('#'))),
    rows.map(({ source_url }) => source_url.slice(source_url.indexOf('#'))));
  assert.deepEqual(translatedRows.reduce((counts, { chapter }) => {
    counts[chapter - 1] += 1;
    return counts;
  }, [0, 0, 0, 0]), [3, 7, 6, 3]);
  assert.ok(translatedRows.every(({ source_url }) =>
    source_url.startsWith('https://lexicon.qumran-digital.org/transcriptions/4Q539/2026-02-11/index.html?v=2026-02-11#')));
  assert.match(translatedRows[3].text, /Jacob/);
  assert.match(translatedRows[4].text, /my sons/);
  assert.match(translatedRows[7].text, /uncertain|unclear|illegible|securely/i);
  assert.match(translatedRows[12].text, /eighteen/i);
  assert.match(translatedRows[17].text, /spirit|man|mouth/i);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='Q539'").get().text_status, 'partial');
  const englishDefinition = ADDITIONAL_SOURCES.find(({ slug }) => slug === 'en-project-4q539-fragments-2026');
  db.prepare(`INSERT INTO bible_book_sources
    (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES ('Q539', 'old English draft record', 'Old English draft record', 'en', 'available', ?, ?, 'stale notes')`)
    .run(englishDefinition.sourceType, englishDefinition.url);
  assert.equal(await ensureQumran4Q539Imported(), false);
  const englishSourceRows = db.prepare(`SELECT label_ar, label_en, language, availability_status, source_type, source_url, notes
    FROM bible_book_sources WHERE book_code='Q539' AND language='en' AND source_url=?`)
    .all(englishDefinition.url);
  assert.deepEqual(englishSourceRows, [{
    label_ar: englishDefinition.nameAr,
    label_en: englishDefinition.nameEn,
    language: englishDefinition.language,
    availability_status: 'available',
    source_type: englishDefinition.sourceType,
    source_url: englishDefinition.url,
    notes: englishDefinition.notes
  }]);
  const first = rows[0];
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='Q539' AND chapter=? AND verse=?`)
    .run(translation.id, first.chapter, first.verse);
  const firstEnglish = translatedRows[0];
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code='Q539' AND chapter=? AND verse=?`)
    .run(english.id, firstEnglish.chapter, firstEnglish.verse);
  assert.equal(await ensureQumran4Q539Imported(), true);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q539' ORDER BY chapter, verse`).all(translation.id), rows);
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q539' ORDER BY chapter, verse`).all(english.id), translatedRows);
  assert.equal(await ensureQumran4Q539Imported(), false);
  assert.equal(ADDITIONAL_SOURCES.filter(({ slug }) => [
    'arc-qdr-4q539-qumran-digital-2025', 'en-project-4q539-fragments-2026'
  ].includes(slug)).length, 2);
});
