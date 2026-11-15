import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDbPath = join(tmpdir(), `meqabyan-geez-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { getBook } = await import('../utils/bible_service.js');
const { ensureMeqabyanGeezImported, MEQABYAN_GEEZ_SOURCES } = await import('./meqabyan_geez_startup_import.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports three complete licensed Ge\'ez Meqabyan witnesses and preserves every source line', async () => {
  assert.equal(MEQABYAN_GEEZ_SOURCES.length, 3);
  assert.equal(await ensureMeqabyanGeezImported(), true);

  const db = getDb();
  for (const source of MEQABYAN_GEEZ_SOURCES) {
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type
      FROM bible_translations WHERE slug=?
    `).get(source.slug);
    assert.deepEqual(translation, {
      id: translation?.id,
      language: 'gez',
      is_active: 1,
      site_scope: 'both',
      source_type: 'cc-by-sa-4.0'
    });

    const parsed = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source);
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
    `).all(translation.id, source.bookCode);
    assert.deepEqual(actual, parsed.map(({ chapter, verse, text, sourceUrl }) => ({
      chapter, verse, text, source_url: sourceUrl
    })));
    assert.equal(actual.length, source.expectedUnitCount);
    assert.equal(new Set(actual.map(({ chapter, verse }) => `${chapter}:${verse}`)).size, actual.length);
    assert.ok(parsed.every(({ text }) => text.trim().length > 0));

    const book = getBook(source.bookCode);
    assert.equal(book.collection_site_scope, 'both');
    assert.ok(book.available_translations.includes(source.slug));
    assert.equal(db.prepare(`
      SELECT COUNT(*) AS count FROM bible_book_sources
      WHERE book_code=? AND language='gez' AND source_type='cc-by-sa-4.0' AND source_url=?
    `).get(source.bookCode, source.url).count, 1);
  }

  assert.equal(await ensureMeqabyanGeezImported(), false);
  assert.deepEqual(db.prepare(`
    SELECT b.code, COUNT(v.id) AS units, COUNT(DISTINCT v.chapter) AS chapters
    FROM bible_books b JOIN bible_verses v ON v.book_code=b.code
    JOIN bible_translations t ON t.id=v.translation_id
    WHERE t.slug IN ('gez-betamasaheft-meqabyan-1', 'gez-betamasaheft-meqabyan-2', 'gez-betamasaheft-meqabyan-3')
    GROUP BY b.code ORDER BY b.code
  `).all(), [
    { code: '1MCE', units: 762, chapters: 36 },
    { code: '2MCE', units: 433, chapters: 21 },
    { code: '3MCE', units: 209, chapters: 10 },
  ]);

  initBibleSchema();
  assert.equal(await ensureMeqabyanGeezImported(), false);
});
