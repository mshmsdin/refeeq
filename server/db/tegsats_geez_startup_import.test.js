import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDbPath = join(tmpdir(), `tegsats-geez-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { getBook } = await import('../utils/bible_service.js');
const { ensureTegsatGeezImported, TEGSAT_SOURCE } = await import('./tegsats_geez_startup_import.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the complete six-chapter Ge\'ez Tegsat witness under its share-alike license', async () => {
  assert.equal(await ensureTegsatGeezImported(), true);
  const visibleBook = getBook('TAGS');
  assert.equal(visibleBook.collection_site_scope, 'both');
  assert.ok(visibleBook.available_translations.includes(TEGSAT_SOURCE.slug));

  const db = getDb();
  const translation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug=?
  `).get(TEGSAT_SOURCE.slug);
  assert.deepEqual(translation, {
    id: translation?.id,
    language: 'gez',
    is_active: 1,
    site_scope: 'both',
    source_type: 'cc-by-sa-4.0'
  });

  const parsed = parseReviewedUnitText(await readFile(TEGSAT_SOURCE.textFile, 'utf8'), TEGSAT_SOURCE);
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='TAGS' ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, parsed.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
  assert.equal(actual.length, 161);
  assert.deepEqual(db.prepare(`
    SELECT chapter, COUNT(*) AS units FROM bible_verses
    WHERE translation_id=? AND book_code='TAGS' GROUP BY chapter ORDER BY chapter
  `).all(translation.id), [27, 29, 28, 29, 28, 20].map((units, index) => ({ chapter: index + 1, units })));
  assert.match(actual[0].text, /[\u1200-\u137F]/u);

  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM bible_book_sources
    WHERE book_code='TAGS' AND language='gez' AND source_type='cc-by-sa-4.0' AND source_url=?
  `).get(TEGSAT_SOURCE.url).count, 1);
  assert.equal(await ensureTegsatGeezImported(), false);
  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code='TAGS'
  `).get(translation.id).count, 161);
});
