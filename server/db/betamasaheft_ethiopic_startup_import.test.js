import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDbPath = join(tmpdir(), `betamasaheft-ethiopic-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { getBook, getChapter, getTranslationBySlug } = await import('../utils/bible_service.js');
const { BETAMASAHEFT_ETHIOPIC_SOURCES, ensureBetamasaheftEthiopicWorksImported } =
  await import('./betamasaheft_ethiopic_startup_import.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
const db = getDb();
db.prepare(`
  INSERT INTO bible_translations
    (slug, name_ar, name_en, abbreviation, language, source_url, source_type, site_scope, is_active)
  VALUES ('english-existing-witnesses', 'ترجمات إنجليزية سابقة', 'Existing English witnesses', 'EN', 'en',
    'https://example.invalid/english', 'public-domain', 'both', 1)
`).run();
const englishId = db.prepare("SELECT id FROM bible_translations WHERE slug='english-existing-witnesses'").get().id;
for (const bookCode of ['ENO', 'JUB']) {
  db.prepare(`
    INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url)
    VALUES (?, ?, 1, 1, 'Existing English text', 'Existing English text', 'https://example.invalid/english')
  `).run(englishId, bookCode);
  db.prepare(`
    INSERT INTO bible_book_metadata
      (book_code, canonicality_status, textual_tradition, original_language, text_status,
       arabic_status, english_status, future_translation_status, summary_ar, source_name, source_url, source_notes)
    VALUES (?, 'non_canonical', 'existing-tradition', 'لغة أصل سابقة', 'partial',
       'planned', 'available', 'planned', 'ملخص سابق', 'مصدر سابق', 'https://example.invalid/source', 'ملاحظات سابقة')
  `).run(bookCode);
}

after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports full licensed Ge\'ez EOTC editions locally without replacing the existing English witnesses', async () => {
  assert.equal(BETAMASAHEFT_ETHIOPIC_SOURCES.length, 2);
  const metadataBefore = Object.fromEntries(['ENO', 'JUB'].map((bookCode) => [bookCode, db.prepare(`
    SELECT canonicality_status, textual_tradition, original_language, text_status, arabic_status,
      english_status, future_translation_status, summary_ar, source_name, source_url, source_notes
    FROM bible_book_metadata WHERE book_code=?
  `).get(bookCode)]));
  assert.equal(await ensureBetamasaheftEthiopicWorksImported(), true);

  for (const source of BETAMASAHEFT_ETHIOPIC_SOURCES) {
    const translation = getTranslationBySlug(source.slug);
    assert.equal(translation.language, 'gez');
    assert.equal(translation.is_active, 1);
    assert.equal(translation.site_scope, 'both');
    assert.equal(translation.source_type, 'cc-by-sa-4.0');

    const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
      .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, source.bookCode);
    assert.deepEqual(actual, expected);
    assert.equal(actual.length, source.expectedUnitCount);
    assert.deepEqual(db.prepare(`
      SELECT chapter, COUNT(*) AS units FROM bible_verses
      WHERE translation_id=? AND book_code=? GROUP BY chapter ORDER BY chapter
    `).all(translation.id, source.bookCode), source.expectedChapterCounts.map((units, index) => ({ chapter: index + 1, units })));
    assert.ok(actual.every(({ source_url }) => source_url.includes('#L')));
    assert.ok(getBook(source.bookCode).available_translations.includes(source.slug));
    assert.equal(db.prepare(`
      SELECT COUNT(*) AS count FROM bible_book_sources
      WHERE book_code=? AND label_ar=? AND language='gez' AND source_type='cc-by-sa-4.0' AND source_url=?
    `).get(source.bookCode, source.nameAr, source.url).count, 1);
    assert.deepEqual(db.prepare(`
      SELECT canonicality_status, textual_tradition, original_language, text_status, arabic_status,
        english_status, future_translation_status, summary_ar, source_name, source_url, source_notes
      FROM bible_book_metadata WHERE book_code=?
    `).get(source.bookCode), metadataBefore[source.bookCode]);
    assert.equal(getChapter(translation.id, source.bookCode, 1).length, source.expectedChapterCounts[0]);
  }

  const enochSource = BETAMASAHEFT_ETHIOPIC_SOURCES.find(({ bookCode }) => bookCode === 'ENO');
  const enoch = getTranslationBySlug(enochSource.slug);
  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code='ENO' AND chapter=21
  `).get(enoch.id).count, 9);
  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code='ENO' AND chapter=21 AND verse=1
  `).get(enoch.id).count, 1);
  assert.equal(db.prepare(`
    SELECT text FROM bible_verses WHERE translation_id=? AND book_code='ENO'
  `).get(englishId).text, 'Existing English text');
  assert.equal(await ensureBetamasaheftEthiopicWorksImported(), false);
  initBibleSchema();
  assert.equal(await ensureBetamasaheftEthiopicWorksImported(), false);
});
