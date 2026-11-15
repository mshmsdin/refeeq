import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `qumran-pseudo-daniel-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { ensureQumranPseudoDanielImported } = await import('../db/qumran_pseudo_daniel_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('./import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('./reviewed_text_source.js');

const EXPECTED = [
  { witness: '4Q243', code: 'Q243', slug: 'arc-qdr-4q243-pseudo-daniel-a-2026', groups: 43, units: 128, words: 1138 },
  { witness: '4Q244', code: 'Q244', slug: 'arc-qdr-4q244-pseudo-daniel-b-2026', groups: 13, units: 35, words: 326 },
  { witness: '4Q245', code: 'Q245', slug: 'arc-qdr-4q245-pseudo-daniel-c-2026', groups: 5, units: 25, words: 215 }
];

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports separately catalogued, licensed, partial Aramaic Pseudo-Daniel witnesses', async () => {
  const sources = EXPECTED.map((item) => ADDITIONAL_SOURCES.find(({ slug }) => slug === item.slug));
  assert.ok(sources.every(Boolean));
  assert.equal(new Set(sources.map(({ bookCode }) => bookCode)).size, EXPECTED.length);

  for (const item of EXPECTED) {
    const source = sources.find(({ slug }) => slug === item.slug);
    assert.equal(source.bookCode, item.code);
    assert.equal(source.language, 'arc');
    assert.equal(source.originalLanguage, 'الآرامية');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);
    assert.equal(source.expectedUnitCount, item.units);
    assert.equal(source.expectedWordCount, item.words);
    assert.equal(source.maxChapter, item.groups);

    const json = readFileSync(source.textFile, 'utf8');
    const units = parseReviewedUnitText(json, source);
    assert.equal(createHash('sha256').update(json.replace(/\r\n/gu, '\n')).digest('hex'), source.expectedSha256);
    assert.equal(units.length, item.units);
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, item.units);
    assert.deepEqual(units.map(({ chapter, verse }) => [chapter, verse]),
      source.expectedChapterVerseNumbers.flatMap((lines, index) => lines.map((line) => [index + 1, line])));
    assert.ok(units.every(({ text, sourceUrl }) => text.startsWith(`‹${item.witness} frg. `)
      && sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${item.witness}/`)
      && sourceUrl.includes('#c')));
  }

  assert.equal(await ensureQumranPseudoDanielImported(), true);
  const db = getDb();
  for (const item of EXPECTED) {
    const source = sources.find(({ slug }) => slug === item.slug);
    const translation = db.prepare('SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?').get(item.slug);
    assert.deepEqual({ language: translation.language, is_active: translation.is_active, site_scope: translation.site_scope, source_type: translation.source_type },
      { language: 'arc', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, item.code);
    const expected = parseReviewedUnitText(readFileSync(source.textFile, 'utf8'), source)
      .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
    assert.deepEqual(actual, expected);
    assert.equal(db.prepare('SELECT text_status FROM bible_book_metadata WHERE book_code=?').get(item.code).text_status, 'partial');
  }
  assert.equal(await ensureQumranPseudoDanielImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code IN ('Q243','Q244','Q245')").get().count, 188);
});
