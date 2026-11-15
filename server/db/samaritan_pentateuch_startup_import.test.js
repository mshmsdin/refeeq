import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDbPath = join(tmpdir(), `samaritan-pentateuch-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { getBook } = await import('../utils/bible_service.js');
const { ensureSamaritanPentateuchImported, SAMARITAN_PENTATEUCH_SOURCE } = await import('./samaritan_pentateuch_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports both complete Samaritan Pentateuch witnesses with their distinct sources', async () => {
  const db = getDb();
  assert.equal(await ensureSamaritanPentateuchImported(), true);

  const raw = await readFile(SAMARITAN_PENTATEUCH_SOURCE.textFile, 'utf8');
  assert.equal(createHash('sha256').update(raw.replace(/\r\n/g, '\n')).digest('hex'), SAMARITAN_PENTATEUCH_SOURCE.expectedSha256);
  const expected = JSON.parse(raw);
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug=?
  `).get(SAMARITAN_PENTATEUCH_SOURCE.translationSlug);
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'cc-by-nc-4.0' });

  const actual = db.prepare(`
    SELECT book_code, chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? ORDER BY book_code, chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, expected.map(({ bookCode, chapter, verse, text, sourceUrl }) => ({
    book_code: bookCode, chapter, verse, text, source_url: sourceUrl
  })).sort((a, b) => a.book_code.localeCompare(b.book_code) || a.chapter - b.chapter || a.verse - b.verse));
  assert.equal(actual.length, 5829);

  const hebrewData = JSON.parse(await readFile(new URL('../importers/data/samaritan_pentateuch_textfabric_v7_4_1_he.json', import.meta.url), 'utf8'));
  const hebrewTranslation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug='he-samaritan-caccht-tf-2026'
  `).get();
  assert.ok(hebrewTranslation, 'the licensed Hebrew Samaritan witness is imported');
  assert.deepEqual(hebrewTranslation && {
    language: hebrewTranslation.language, is_active: hebrewTranslation.is_active,
    site_scope: hebrewTranslation.site_scope, source_type: hebrewTranslation.source_type
  }, { language: 'he', is_active: 1, site_scope: 'both', source_type: 'cc-by-nc-4.0' });
  const actualHebrew = db.prepare(`
    SELECT book_code, chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? ORDER BY book_code, chapter, verse
  `).all(hebrewTranslation.id);
  assert.deepEqual(actualHebrew, hebrewData.map(({ bookCode, chapter, verse, text, sourceUrl }) => ({
    book_code: bookCode, chapter, verse, text: text.trim(), source_url: sourceUrl
  })).sort((a, b) => a.book_code.localeCompare(b.book_code) || a.chapter - b.chapter || a.verse - b.verse));
  assert.equal(actualHebrew.length, 5841);
  assert.ok(actualHebrew.every(({ text, source_url }) => /[\u05d0-\u05ea]/u.test(text)
    && source_url.includes('DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/tf/7.4.1/sign.tf#L')));

  for (const book of SAMARITAN_PENTATEUCH_SOURCE.books) {
    const englishRows = actual.filter((row) => row.book_code === book.code);
    const hebrewRows = actualHebrew.filter((row) => row.book_code === book.code);
    assert.equal(englishRows.length, book.unitCount, book.code);
    assert.equal(new Set(englishRows.map((row) => row.chapter)).size, book.chapterCount, book.code);
    assert.ok(englishRows.every((row) => row.source_url.startsWith(`${SAMARITAN_PENTATEUCH_SOURCE.url}#page=`)), book.code);
    assert.ok(hebrewRows.length > 0, book.code);
    assert.equal(new Set(hebrewRows.map((row) => row.chapter)).size, book.chapterCount, book.code);
    assert.equal(db.prepare(`SELECT text_status FROM bible_book_metadata WHERE book_code=?`).get(book.code).text_status, 'complete');
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bible_book_sources
      WHERE book_code=? AND availability_status='available' AND source_type='parallel-text'`)
      .get(book.code).count, 2);
    assert.ok(getBook(book.code).available_translations.includes(SAMARITAN_PENTATEUCH_SOURCE.translationSlug), book.code);
    assert.ok(getBook(book.code).available_translations.includes('he-samaritan-caccht-tf-2026'), book.code);
  }

  const exodus26_35 = actual.find(({ book_code, chapter, verse }) => book_code === 'SAM-EXO' && chapter === 26 && verse === 35);
  assert.match(exodus26_35.text, /\[a\]/u);
  assert.match(exodus26_35.text, /\[j\]/u);
  assert.equal(actual.some(({ book_code, chapter, verse, text }) => book_code === 'SAM-EXO'
    && ((chapter === 29 && verse === 21) || (chapter === 30 && verse <= 10 && text.trim() === '« »'))), false);

  const first = expected[0];
  db.prepare(`UPDATE bible_verses SET text='stale' WHERE translation_id=? AND book_code=? AND chapter=? AND verse=?`)
    .run(translation.id, first.bookCode, first.chapter, first.verse);
  assert.equal(await ensureSamaritanPentateuchImported(), true);
  assert.equal(await ensureSamaritanPentateuchImported(), false);
  initBibleSchema();
  assert.equal(await ensureSamaritanPentateuchImported(), false);
});
