import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const testDbPath = join(tmpdir(), `testament-abraham-greek-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureTestamentAbrahamGreekImported, TESTAMENT_ABRAHAM_GREEK_SOURCES } =
  await import('./testament_abraham_greek_startup_import.js');

initDatabase();
initBibleSchema();
const db = getDb();
after(() => {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports and verifies both licensed Greek recensions of the Testament of Abraham', async () => {
  assert.equal(await ensureTestamentAbrahamGreekImported(), true);

  const expected = [
    { slug: 'grc-ocp-testament-abraham-a-2026', chapters: 20, units: 262, words: 6952 },
    { slug: 'grc-ocp-testament-abraham-b-2026', chapters: 14, units: 175, words: 3217 }
  ];
  for (const item of expected) {
    const source = TESTAMENT_ABRAHAM_GREEK_SOURCES.find(({ slug }) => slug === item.slug);
    const translation = db.prepare(`
      SELECT id, language, is_active, site_scope, source_type
      FROM bible_translations WHERE slug=?
    `).get(item.slug);
    assert.ok(translation);
    assert.deepEqual(
      [translation.language, translation.is_active, translation.site_scope, translation.source_type],
      ['grc', 1, 'both', 'cc-by-4.0']
    );
    const text = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='AABR' ORDER BY chapter, verse
    `).all(translation.id);
    assert.equal(text.length, item.units);
    assert.equal(new Set(text.map(({ chapter }) => chapter)).size, item.chapters);
    assert.ok(text.every(({ source_url }) => source_url === source.url));
    assert.equal(db.prepare(`
      SELECT COUNT(*) AS count FROM bible_book_sources
      WHERE book_code='AABR' AND label_ar=? AND language='grc' AND source_type='cc-by-4.0'
        AND source_url=?
    `).get(source.nameAr, source.url).count, 1);
  }

  const metadata = db.prepare(`
    SELECT original_language, text_status, english_status, summary_ar
    FROM bible_book_metadata WHERE book_code='AABR'
  `).get();
  assert.deepEqual(
    [metadata.original_language, metadata.text_status, metadata.english_status],
    ['اليونانية', 'complete', 'available']
  );
  assert.match(metadata.summary_ar, /٢٦٢ وحدة/);
  assert.match(metadata.summary_ar, /١٧٥ وحدة/);

  assert.equal(await ensureTestamentAbrahamGreekImported(), false);
  assert.deepEqual(expected.map(({ slug }) => db.prepare(`
    SELECT COUNT(*) AS count FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug=? AND bv.book_code='AABR'
  `).get(slug).count), [262, 175]);
});
