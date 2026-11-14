import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `armenian-short-history-elias-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureArmenianShortHistoryEliasImported } = await import('./armenian_short_history_elias_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports every page of Issaverdens 1901 Armenian Short History of the Prophet Elias', async () => {
  assert.equal(await ensureArmenianShortHistoryEliasImported(), true);
  const db = getDb();
  const book = db.prepare(`
    SELECT bb.chapter_count, bbm.canonicality_status, bbm.textual_tradition,
      bbm.original_language, bbm.text_status
    FROM bible_books bb JOIN bible_book_metadata bbm ON bbm.book_code=bb.code
    WHERE bb.code='ARMELI'
  `).get();
  assert.deepEqual(book, {
    chapter_count: 1, canonicality_status: 'non_canonical', textual_tradition: 'armenian',
    original_language: 'الأرمنية', text_status: 'complete'
  });

  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-armenian-short-history-elias-1901'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'public-domain-text' });

  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='ARMELI' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 16);
  assert.deepEqual(rows.map(({ verse }) => verse), Array.from({ length: 16 }, (_, index) => index + 1));
  assert.deepEqual(rows.map(({ source_url }) => source_url.split('#page=')[1]),
    ['247', '249', '249', '251', '251', '253', '253', '255', '255', '257', '257', '259', '259', '261', '261', '263']);
  assert.match(rows[0].text, /^Elias the Tishbite was of the lineage of the priests/u);
  assert.match(rows.at(-1).text, /Ahab wept and went to his home\.$/u);
  assert.ok(rows.every(({ source_url }) => /archive\.org\/download\/cu31924091353445\/cu31924091353445\.pdf#page=/u.test(source_url)));
  assert.ok(rows.every(({ text }) => !text.includes('\uFFFD')));
  assert.equal(await ensureArmenianShortHistoryEliasImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='ARMELI'").get().count, 16);
});
