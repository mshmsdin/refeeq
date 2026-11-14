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

test('imports the full licensed Samaritan Pentateuch translation with its source-page links', async () => {
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

  for (const book of SAMARITAN_PENTATEUCH_SOURCE.books) {
    const rows = actual.filter((row) => row.book_code === book.code);
    assert.equal(rows.length, book.unitCount, book.code);
    assert.equal(new Set(rows.map((row) => row.chapter)).size, book.chapterCount, book.code);
    assert.ok(rows.every((row) => row.source_url.startsWith(`${SAMARITAN_PENTATEUCH_SOURCE.url}#page=`)), book.code);
    assert.equal(db.prepare(`SELECT text_status FROM bible_book_metadata WHERE book_code=?`).get(book.code).text_status, 'partial');
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bible_book_sources
      WHERE book_code=? AND source_url=? AND source_type='parallel-text' AND availability_status='available'`)
      .get(book.code, SAMARITAN_PENTATEUCH_SOURCE.url).count, 1);
    assert.ok(getBook(book.code).available_translations.includes(SAMARITAN_PENTATEUCH_SOURCE.translationSlug), book.code);
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
