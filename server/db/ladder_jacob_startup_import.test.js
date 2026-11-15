import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDbPath = join(tmpdir(), `ladder-jacob-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureLadderOfJacobImported, LADDER_OF_JACOB_SOURCE } = await import('./ladder_jacob_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the complete published 1920 English witness while preserving its damaged Slavonic recensions', async () => {
  assert.equal(await ensureLadderOfJacobImported(), true);
  const raw = await readFile(LADDER_OF_JACOB_SOURCE.textFile, 'utf8');
  assert.equal(createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex'),
    LADDER_OF_JACOB_SOURCE.expectedSha256);
  const units = JSON.parse(raw);
  assert.equal(units.length, 8);
  assert.deepEqual(units.map(({ verse }) => verse), Array.from({ length: 8 }, (_, index) => index + 1));

  const db = getDb();
  const book = db.prepare(`
    SELECT bb.name_ar, bb.name_en, bb.chapter_count, c.slug AS collection_slug,
      bm.canonicality_status, bm.textual_tradition, bm.original_language, bm.text_status
    FROM bible_books bb JOIN bible_book_metadata bm ON bm.book_code=bb.code
    JOIN bible_collections c ON c.id=bb.collection_id WHERE bb.code='LADJAC'
  `).get();
  assert.deepEqual(book, {
    name_ar: 'سُلّم يعقوب', name_en: 'The Ladder of Jacob', chapter_count: 1,
    collection_slug: 'pseudepigrapha', canonicality_status: 'apocryphal',
    textual_tradition: 'slavonic', original_language: 'السلافونية الكنسية', text_status: 'partial'
  });

  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations
    WHERE slug='en-ladder-jacob-james-1920'
  `).get();
  assert.deepEqual(translation && {
    language: translation.language, is_active: translation.is_active,
    site_scope: translation.site_scope, source_type: translation.source_type
  }, { language: 'en', is_active: 1, site_scope: 'both', source_type: 'cc-by-sa-4.0' });

  const rows = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='LADJAC' ORDER BY chapter, verse
  `).all(translation.id);
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map(({ text, source_url }) => [text, source_url]),
    units.map(({ text, sourceUrl }) => [text, sourceUrl]));
  assert.match(rows[0].text, /Rec\. 2/u);
  assert.match(rows[5].text, /Here the oldest MS\. ends/u);
  assert.match(rows[6].text, /What follows is Christian and is only in Rec\. 2/u);
  assert.deepEqual(rows.map(({ source_url }) => Number(source_url.split('/').at(-1))), [114, 115, 115, 116, 117, 118, 119, 120]);
  initBibleSchema();
  assert.equal(db.prepare("SELECT canonicality_status FROM bible_book_metadata WHERE book_code='LADJAC'").get().canonicality_status,
    'apocryphal');
  assert.equal(await ensureLadderOfJacobImported(), false);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='LADJAC'").get().count, 8);
});
