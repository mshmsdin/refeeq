import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-4q246-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { ensureQumran4Q246Imported } = await import('../db/qumran_4q246_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('./import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('./reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all licensed 4Q246 lines as an independent partial Aramaic witness', async () => {
  const slug = 'arc-qdr-4q246-aramaic-apocalypse-2026';
  const source = ADDITIONAL_SOURCES.find(({ slug: candidate }) => candidate === slug);
  assert.ok(source);
  assert.equal(source.bookCode, 'Q246');
  assert.equal(source.language, 'arc');
  assert.equal(source.sourceType, 'cc-by-sa-4.0');
  assert.equal(source.siteScope, 'both');
  assert.equal(source.incomplete, true);
  assert.equal(source.expectedUnitCount, 18);
  assert.equal(source.maxChapter, 2);

  const json = readFileSync(source.textFile, 'utf8');
  const units = parseReviewedUnitText(json, source);
  assert.equal(createHash('sha256').update(json).digest('hex'), source.expectedSha256);
  assert.equal(units.length, 18);
  assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]), [
    ...Array.from({ length: 9 }, (_, index) => [1, index + 1]),
    ...Array.from({ length: 9 }, (_, index) => [2, index + 1])
  ]);
  assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, 18);
  assert.ok(units.every(({ sourceUrl }) => sourceUrl.includes('/4Q246/') && sourceUrl.includes('#c')));
  assert.equal(units[1].text, '‹4Q246 frg. 1 i, line 2› [-- מ]לכא ^{~~ל~~}‹‹מ›› עלמא אתה רגז ושניך');

  assert.equal(await ensureQumran4Q246Imported(), true);
  const db = getDb();
  const translation = db.prepare('SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?').get(slug);
  assert.deepEqual({ language: translation.language, is_active: translation.is_active, site_scope: translation.site_scope, source_type: translation.source_type },
    { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE book_code='Q246' AND translation_id=? ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, units.map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl })));
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='Q246'").get().text_status, 'partial');
  assert.equal(await ensureQumran4Q246Imported(), false);
});
