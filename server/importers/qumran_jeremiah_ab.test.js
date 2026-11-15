import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const manuscripts = [
  { witness: '4Q383', code: 'AJ383', slug: 'heb-qdr-4q383-apocryphon-jeremiah-a-2026', groupCounts: [5,3,3,3,4,4,3,2,3] },
  { witness: '4Q384', code: 'AJ384', slug: 'heb-qdr-4q384-apocryphon-jeremiah-b-2026', groupCounts: [1,2,3,4,2,1,6,7,4,6,1,1,1,3,5,1,2,2,5,1,2,3,2,4,2,1,2,2,3,1,1] },
  { witness: '4Q385c', code: 'AJ385C', slug: 'heb-qdr-4q385c-apocryphon-jeremiah-2026', groupCounts: [2,3,3,3,3,3,3] }
].map((manuscript) => ({ ...manuscript, units: manuscript.groupCounts.reduce((sum, count) => sum + count, 0) }));

const testDbPath = join(tmpdir(), `qumran-jeremiah-ab-${randomUUID()}.sqlite`);
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

test('imports the three licensed Hebrew Jeremiah manuscripts as separate partial witnesses', async () => {
  const prepared = manuscripts.map((expected) => {
    const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === expected.slug);
    assert.ok(source, `missing source definition for ${expected.witness}`);
    assert.equal(source.bookCode, expected.code);
    assert.equal(source.language, 'he');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);
    assert.equal(source.expectedUnitCount, expected.units);
    assert.equal(source.maxChapter, expected.groupCounts.length);
    const raw = readFileSync(source.textFile, 'utf8');
    const units = parseReviewedUnitText(raw, source);
    assert.deepEqual([...Array(source.maxChapter)].map((_, index) => units.filter((unit) => unit.chapter === index + 1).length), expected.groupCounts);
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, expected.units);
    assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${expected.witness}/`)
      && sourceUrl.includes('#c') && text.startsWith(`‹${expected.witness} frg.`)));
    return { expected, source, units };
  });

  const { ensureQumranJeremiahAbImported } = await import('../db/qumran_jeremiah_ab_startup_import.js');
  assert.equal(await ensureQumranJeremiahAbImported(), true);
  const db = getDb();
  for (const { expected, source, units } of prepared) {
    const translation = db.prepare('SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?').get(expected.slug);
    assert.deepEqual({ language: translation.language, is_active: translation.is_active, site_scope: translation.site_scope, source_type: translation.source_type },
      { language: 'he', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, expected.code);
    assert.deepEqual(actual, units.map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl })));
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get(expected.code).text_status, 'partial');
    assert.ok(db.prepare('SELECT 1 FROM bible_book_sources WHERE book_code=? AND source_url=?').get(expected.code, source.url));
  }
  assert.equal(await ensureQumranJeremiahAbImported(), false);
});
