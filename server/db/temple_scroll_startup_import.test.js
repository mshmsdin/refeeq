import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `temple-scroll-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureTempleScrollImported } = await import('./temple_scroll_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('startup imports and verifies both 1,071-line Temple Scroll witnesses and remains idempotent', async () => {
  assert.equal(await ensureTempleScrollImported(), true);
  const db = getDb();
  const getState = db.prepare(`
    SELECT bt.slug, bt.language, bt.source_type, bt.site_scope, bt.is_active,
      COUNT(bv.id) AS units, COUNT(DISTINCT bv.source_url) AS source_urls,
      bb.chapter_count, bm.text_status
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='TSCROLL'
    LEFT JOIN bible_books bb ON bb.code='TSCROLL'
    LEFT JOIN bible_book_metadata bm ON bm.book_code='TSCROLL'
    WHERE bt.slug=?
    GROUP BY bt.id
  `);
  const sourceSlugs = ['heb-qdr-11q19-temple-scroll-2025', 'en-project-11q19-temple-scroll'];
  for (const slug of sourceSlugs) {
    const definition = ADDITIONAL_SOURCES.find((source) => source.slug === slug);
    const state = getState.get(slug);
    assert.deepEqual(state, {
      slug, language: definition.language, source_type: definition.sourceType,
      site_scope: 'both', is_active: 1, units: 1071, source_urls: 1071,
      chapter_count: 1, text_status: 'partial'
    });
    const expected = parseReviewedUnitText(readFileSync(definition.textFile, 'utf8'), definition);
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url AS sourceUrl FROM bible_verses
      WHERE translation_id=(SELECT id FROM bible_translations WHERE slug=?) AND book_code='TSCROLL'
      ORDER BY chapter, verse
    `).all(slug);
    assert.deepEqual(actual, expected.map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, sourceUrl })));
    const sourceRecord = db.prepare(`
      SELECT 1 FROM bible_book_sources
      WHERE book_code='TSCROLL' AND label_ar=? AND language=? AND source_url=?
        AND source_type=? AND notes=?
    `).get(definition.nameAr, definition.language, definition.url, definition.sourceType, definition.notes);
    assert.ok(sourceRecord, `source provenance should be recorded for ${slug}`);
  }
  assert.equal(await ensureTempleScrollImported(), false);
});
