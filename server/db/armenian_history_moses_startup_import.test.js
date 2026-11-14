import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `armenian-history-moses-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureArmenianHistoryMosesImported } = await import('./armenian_history_moses_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and verifies every page of the 1901 Armenian History of Moses translation', async () => {
  assert.equal(await ensureArmenianHistoryMosesImported(), true);
  const db = getDb();
  const book = db.prepare(`
    SELECT bb.chapter_count, bbm.text_status, bbm.original_language
    FROM bible_books bb JOIN bible_book_metadata bbm ON bbm.book_code=bb.code
    WHERE bb.code='ARMHMO'
  `).get();
  assert.deepEqual(book, { chapter_count: 1, text_status: 'complete', original_language: 'الأرمنية' });

  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-armenian-history-moses-1901'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'public-domain-text' });

  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ARMHMO' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 11);
  assert.deepEqual(rows.map(({ verse }) => verse), Array.from({ length: 11 }, (_, index) => index + 1));
  assert.deepEqual(rows.map(({ source_url }) => source_url.split('#page=')[1]),
    ['187', '189', '189', '191', '191', '193', '193', '195', '195', '197', '197']);
  assert.match(rows[0].text, /^Moses was the first amongst all the prophets/u);
  assert.match(rows.at(-1).text, /the Son of Mary\.$/u);
  assert.ok(rows.every(({ source_url }) => /cu31924091353445.*(?:page|pdf)/u.test(source_url)));
  assert.equal(await ensureArmenianHistoryMosesImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='ARMHMO'").get().count, 11);
});
