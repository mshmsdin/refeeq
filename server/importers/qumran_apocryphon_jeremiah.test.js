import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const witnesses = [
  { witness: '4Q385a', code: 'AJC385A', slug: 'heb-qdr-4q385a-apocryphon-jeremiah-c-2026', groupCounts: [2,8,3,11,9,9,4,2,3,3,4,6,4,6,6,7,2,6,3,9,5,9,10,10,2,2,3,1,2,2,2,2,2,3,2,2,3,1,2] },
  { witness: '4Q387', code: 'AJC387', slug: 'heb-qdr-4q387-apocryphon-jeremiah-c-2026', groupCounts: [10,1,12,7,9,6,4,5] },
  { witness: '4Q387a', code: 'AJC387A', slug: 'heb-qdr-4q387a-apocryphon-jeremiah-c-2026', groupCounts: [3,3,3,7,4,3,2,2,5] },
  { witness: '4Q388a', code: 'AJC388A', slug: 'heb-qdr-4q388a-apocryphon-jeremiah-c-2026', groupCounts: [4,5,7,3,1,4,5,11,3,2,4,3,2,3,3,4,3] },
  { witness: '4Q389', code: 'AJC389', slug: 'heb-qdr-4q389-apocryphon-jeremiah-c-2026', groupCounts: [7,9,2,2,3,2,3,2,11,3,4,2,2,2,2] },
  { witness: '4Q390', code: 'AJC390', slug: 'heb-qdr-4q390-apocryphon-jeremiah-c-2026', groupCounts: [13,12,11,4,3,2,2,2,2] }
].map((witness) => ({ ...witness, units: witness.groupCounts.reduce((sum, count) => sum + count, 0) }));

const testDbPath = join(tmpdir(), `qumran-apocryphon-jeremiah-${randomUUID()}.sqlite`);
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

test('imports each licensed Apocryphon of Jeremiah C manuscript as a separate partial witness', async () => {
  const prepared = witnesses.map((expected) => {
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
    assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${expected.witness}/2026-10-06/index.html`)
      && sourceUrl.includes('#c') && text.startsWith(`‹${expected.witness} frg.`)));
    return { expected, source, units };
  });

  const { ensureQumranApocryphonJeremiahImported } = await import('../db/qumran_apocryphon_jeremiah_startup_import.js');
  assert.equal(await ensureQumranApocryphonJeremiahImported(), true);
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
  assert.equal(await ensureQumranApocryphonJeremiahImported(), false);
});
