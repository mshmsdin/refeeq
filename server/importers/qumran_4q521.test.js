import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const SLUG = 'heb-qdr-4q521-messianic-apocalypse-2026';
const testDbPath = join(tmpdir(), `qumran-4q521-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { ADDITIONAL_SOURCES } = await import('./import_noncanonical_english.js');
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { ensureQumran4Q521Imported } = await import('../db/qumran_4q521_startup_import.js');
initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('records every licensed 4Q521 line as its own partial Hebrew witness unit', async () => {
  const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === SLUG);
  assert.ok(source, '4Q521 source definition is present');
  assert.equal(source.bookCode, 'Q521');
  assert.equal(source.language, 'he');
  assert.equal(source.originalLanguage, 'العبرية');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);
  assert.equal(source.expectedUnitCount, 103);
  assert.equal(source.expectedWordCount, 1003);
  assert.equal(source.maxChapter, 16);

  const raw = readFileSync(source.textFile, 'utf8');
  assert.equal(createHash('sha256').update(raw.replace(/\r\n/gu, '\n')).digest('hex'), source.expectedSha256);
  const units = parseReviewedUnitText(raw, source);
  assert.equal(units.length, 103);
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 103);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
    [3, 9, 5, 15, 7, 7, 16, 14, 4, 4, 5, 2, 2, 3, 4, 3]
      .flatMap((count, index) => Array.from({ length: count }, (_, verse) => [index + 1, verse + 1])));
  assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith('https://lexicon.qumran-digital.org/transcriptions/4Q521/2026-05-21/')
    && sourceUrl.includes('#c') && text.startsWith('‹4Q521 frg. ')));
  assert.ok(units.some(({ text }) => text.includes('⟦~~י~~⟧«ך»')),
    'overwritten and added letters retain the source editorial marks');

  assert.equal(await ensureQumran4Q521Imported(), true);
  const db = getDb();
  const translation = db.prepare('SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?').get(SLUG);
  assert.deepEqual({ language: translation.language, is_active: translation.is_active, site_scope: translation.site_scope, source_type: translation.source_type },
    { language: 'he', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='Q521' ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, units.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='Q521'").get().text_status, 'partial');
  assert.equal(await ensureQumran4Q521Imported(), false);
});
