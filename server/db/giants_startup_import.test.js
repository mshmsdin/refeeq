import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `giants-startup-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureGiantsImported } = await import('./giants_startup_import.js');
const { ADDITIONAL_SOURCES } = await import('../importers/import_noncanonical_english.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports licensed Giants witnesses idempotently and preserves every source line', async () => {
  assert.equal(await ensureGiantsImported(), true);

  const db = getDb();
  const expectedSlugs = ['en-jewishmythology-4q531-2026', 'arc-qdr-book-giants-2026'];
  for (const slug of expectedSlugs) {
    const source = ADDITIONAL_SOURCES.find((entry) => entry.slug === slug);
    assert.ok(source);
    const translation = db.prepare(`
      SELECT id, slug, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
    `).get(slug);
    assert.ok(translation);
    assert.equal(translation.language, source.language);
    assert.equal(translation.is_active, 1);
    assert.equal(translation.site_scope, 'both');
    assert.equal(translation.source_type, 'cc-by-sa-4.0');

    const raw = await readFile(source.textFile, 'utf8');
    const expected = parseReviewedUnitText(raw, source)
      .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
    const actual = db.prepare(`
      SELECT chapter, verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='GIANTS' ORDER BY chapter, verse
    `).all(translation.id);
    assert.deepEqual(actual, expected);
    assert.equal(new Set(actual.map(({ chapter, verse }) => `${chapter}:${verse}`)).size, expected.length);
    assert.equal(actual.length, source.expectedUnitCount);
  }

  const metadata = db.prepare(`
    SELECT text_status, original_language, source_url FROM bible_book_metadata WHERE book_code='GIANTS'
  `).get();
  assert.equal(metadata.text_status, 'partial');
  assert.equal(metadata.original_language, 'الآرامية');
  assert.match(metadata.source_url, /qumran-digital\.org/u);
  assert.equal(db.prepare("SELECT chapter_count FROM bible_books WHERE code='GIANTS'").get().chapter_count, 1);
  const aramaicId = db.prepare("SELECT id FROM bible_translations WHERE slug='arc-qdr-book-giants-2026'").get().id;
  db.prepare("UPDATE bible_verses SET text='stale text' WHERE translation_id=? AND book_code='GIANTS' AND verse=596").run(aramaicId);
  db.prepare("UPDATE bible_books SET chapter_count=10 WHERE code='GIANTS'").run();
  assert.equal(await ensureGiantsImported(), true);
  assert.equal(db.prepare("SELECT chapter_count FROM bible_books WHERE code='GIANTS'").get().chapter_count, 1);
  const repaired = db.prepare(`
    SELECT chapter, verse, text, source_url AS sourceUrl FROM bible_verses
    WHERE translation_id=? AND book_code='GIANTS' ORDER BY chapter, verse
  `).all(aramaicId);
  assert.deepEqual(repaired, parseReviewedUnitText(
    await readFile(ADDITIONAL_SOURCES.find((item) => item.slug === 'arc-qdr-book-giants-2026').textFile, 'utf8'),
    ADDITIONAL_SOURCES.find((item) => item.slug === 'arc-qdr-book-giants-2026')
  ));
  assert.equal(await ensureGiantsImported(), false);
  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM bible_verses WHERE book_code='GIANTS'
      AND translation_id IN (SELECT id FROM bible_translations WHERE slug IN (?, ?))
  `).get(...expectedSlugs).count, 604);
});
