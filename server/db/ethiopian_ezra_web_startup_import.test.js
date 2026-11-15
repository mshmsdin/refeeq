import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDbPath = join(tmpdir(), `ethiopian-ezra-web-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureEthiopianEzraWebImported, ETHIOPIAN_EZRA_WEB_SOURCE } = await import('./ethiopian_ezra_web_startup_import.js');

initDatabase();
initBibleSchema();
const db = getDb();
db.prepare(`
  INSERT INTO bible_translations
    (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active)
  VALUES ('en-web', 'البيبل العالمي الكلاسيكي', 'World English Bible Classic', 'WEB', 'en',
    'https://ebible.org/Scriptures/eng-web_vpl.zip', 'vpl', 'Public domain', 'bible', 1)
`).run();
const webId = db.prepare("SELECT id FROM bible_translations WHERE slug='en-web'").get().id;
const sourceRows = JSON.parse(await readFile(ETHIOPIAN_EZRA_WEB_SOURCE.textFile, 'utf8'))
  .map(({ chapter, verse, text, sourceUrl, sourceChapter }) => [webId, '2ES', sourceChapter, verse, text, text, sourceUrl]);
const insertSourceVerse = db.prepare(`
  INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
db.transaction((rows) => rows.forEach((row) => insertSourceVerse.run(...row)))(sourceRows);
after(() => {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports all twelve public-domain WEB chapters mapped from 2 Esdras 3–14 into Ezra Sutuel', async () => {
  assert.equal(await ensureEthiopianEzraWebImported(), true);
  const translationId = db.prepare("SELECT id FROM bible_translations WHERE slug='en-web'").get().id;
  const expected = JSON.parse(await readFile(ETHIOPIAN_EZRA_WEB_SOURCE.textFile, 'utf8'))
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='EZRS' ORDER BY chapter, verse
  `).all(translationId);
  assert.deepEqual(actual, expected);
  assert.equal(actual.length, 715);
  assert.deepEqual(db.prepare(`
    SELECT chapter, COUNT(*) AS units FROM bible_verses
    WHERE translation_id=? AND book_code='EZRS' GROUP BY chapter ORDER BY chapter
  `).all(translationId), ETHIOPIAN_EZRA_WEB_SOURCE.chapterCounts.map((units, index) => ({ chapter: index + 1, units })));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code='2ES'").get(translationId).count, 715);
  assert.equal(db.prepare("SELECT text_status FROM bible_book_metadata WHERE book_code='EZRS'").get().text_status, 'complete');
  assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bible_book_sources
    WHERE book_code='EZRS' AND source_url=? AND source_type='parallel-text' AND availability_status='available'`)
    .get(ETHIOPIAN_EZRA_WEB_SOURCE.url).count, 1);

  initBibleSchema();
  assert.equal(await ensureEthiopianEzraWebImported(), true);
  assert.equal(await ensureEthiopianEzraWebImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code='EZRS'").get(translationId).count, 715);
});
