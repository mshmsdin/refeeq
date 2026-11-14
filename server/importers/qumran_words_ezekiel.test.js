import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseReviewedUnitText } from './reviewed_text_source.js';

const witnesses = [
  { slug: 'heb-qdr-4q385-words-ezekiel-2026', code: 'Q385', witness: '4Q385', units: 44, words: 558, groups: [3,10,7,7,2,15], hash: 'c24f7b05f5ac88d9a1d7315877f9ba13794bac95eca0b9176c98d39e3d593679' },
  { slug: 'heb-qdr-4q385b-words-ezekiel-2026', code: 'Q385B', witness: '4Q385b', units: 7, words: 91, groups: [7], hash: '8daa4e4bfa5b9d651301ce99957be424813de8d8de4e22a9787d74e503e17ac7' },
  { slug: 'heb-qdr-4q386-words-ezekiel-2026', code: 'Q386', witness: '4Q386', units: 35, words: 433, groups: [9,11,8,4,3], hash: 'f7e15df09a7d9502bfbfeca86c7a8019c334583db8509f44380142be00d4c75b' },
  { slug: 'heb-qdr-4q388-words-ezekiel-2026', code: 'Q388', witness: '4Q388', units: 38, words: 367, groups: [2,4,3,3,5,4,10,7], hash: 'accdb91e6cb64a029f83287c0bdccc9222bc6f336e685b695171948d436337c4' }
];
const testDbPath = join(tmpdir(), `qumran-words-ezekiel-${randomUUID()}.sqlite`);
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

test('imports all separately identified licensed Hebrew Words of Ezekiel witnesses without loss', async () => {
  const prepared = witnesses.map((expected) => {
    const source = ADDITIONAL_SOURCES.find(({ slug }) => slug === expected.slug);
    assert.ok(source, `${expected.code} source definition is present`);
    assert.equal(source.bookCode, expected.code);
    assert.equal(source.language, 'he');
    assert.equal(source.sourceType, 'cc-by-sa-4.0');
    assert.equal(source.siteScope, 'both');
    assert.equal(source.incomplete, true);
    assert.equal(source.expectedUnitCount, expected.units);
    assert.equal(source.expectedWordCount, expected.words);
    assert.equal(source.maxChapter, expected.groups.length);
    const raw = readFileSync(source.textFile, 'utf8');
    assert.equal(createHash('sha256').update(raw.replace(/\r\n/gu, '\n')).digest('hex'), expected.hash);
    const units = parseReviewedUnitText(raw, source);
    assert.equal(units.length, expected.units);
    assert.equal(new Set(units.map(({ sourceUrl }) => sourceUrl)).size, expected.units);
    assert.deepEqual(expected.groups.map((_, index) => units.filter(({ chapter }) => chapter === index + 1).length), expected.groups);
    assert.ok(units.every(({ sourceUrl, text }) => sourceUrl.startsWith(`https://lexicon.qumran-digital.org/transcriptions/${expected.witness}/2026-10-06/index.html`)
      && sourceUrl.includes('#c') && text.startsWith(`‹${expected.witness} frg. `)));
    if (expected.code === 'Q385B') {
      assert.ok(units.some(({ text }) => text.includes('י֯[כ]ל[ו] (י֯[כ]ל[] / ו[פו]ל[])')),
        'the source alternative readings remain explicit');
      assert.ok(units.some(({ text }) => text.includes('(תואבד)')),
        'the second editorial reading remains explicit');
    }
    return { expected, source, units };
  });

  const { ensureQumranWordsEzekielImported } = await import('../db/qumran_words_ezekiel_startup_import.js');
  assert.equal(await ensureQumranWordsEzekielImported(), true);
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
  assert.equal(await ensureQumranWordsEzekielImported(), false);
});
