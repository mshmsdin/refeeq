import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const SLUG = 'arc-qdr-4q242-prayer-nabonidus-2026';
const testDbPath = join(tmpdir(), `qumran-4q242-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { ADDITIONAL_SOURCES } = await import('./import_noncanonical_english.js');
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('records every licensed 4Q242 line as its own partial Aramaic witness unit', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === SLUG);
  assert.ok(source, '4Q242 source definition is present');
  assert.equal(source.bookCode, 'Q242');
  assert.equal(source.language, 'arc');
  assert.equal(source.originalLanguage, 'الآرامية');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);
  assert.equal(source.expectedUnitCount, 14);
  assert.equal(source.expectedWordCount, 194);
  assert.equal(source.maxChapter, 2);

  const raw = readFileSync(source.textFile, 'utf8');
  assert.equal(createHash('sha256').update(raw.replace(/\r\n/gu, '\n')).digest('hex'), source.expectedSha256);
  const units = parseReviewedUnitText(raw, source);
  assert.equal(units.length, 14);
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 14);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
    [[1,2,3,4,5,6,7,8,9],[1,2,3,4,5]].flatMap((verses, index) => verses.map((verse) => [index + 1, verse])));
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith('https://lexicon.qumran-digital.org/transcriptions/4Q242/2026-10-06/')
    && sourceUrl.includes('#c') && text.startsWith('‹4Q242 frg. ')));
  assert.ok(units.some(({ text }) => text.includes('^{או[')), 'superscript editorial readings remain marked');

  const { ensureQumran4Q242Imported } = await import('../db/qumran_4q242_startup_import.js');
  assert.equal(await ensureQumran4Q242Imported(), true);
  const db = getDb();
  const translation = db.prepare('SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?').get(SLUG);
  assert.deepEqual({ language: translation.language, is_active: translation.is_active, site_scope: translation.site_scope, source_type: translation.source_type },
    { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q242' ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, units.map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl })));
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='Q242'").get().text_status, 'partial');
  assert.equal(await ensureQumran4Q242Imported(), false);
});
