import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDbPath = join(tmpdir(), `samaritan-chronicle-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureSamaritanChronicleImported, SAMARITAN_CHRONICLE_SOURCE } = await import('./samaritan_chronicle_startup_import.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the full extant 1890 edition and preserves its partial status', async () => {
  assert.equal(await ensureSamaritanChronicleImported(), true);
  const data = JSON.parse(await readFile(SAMARITAN_CHRONICLE_SOURCE.textFile, 'utf8'));
  const raw = await readFile(SAMARITAN_CHRONICLE_SOURCE.textFile, 'utf8');
  assert.equal(createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex'),
    SAMARITAN_CHRONICLE_SOURCE.expectedSha256);
  assert.equal(data.length, 50);
  assert.deepEqual(data.map(({ chapter }) => chapter), Array.from({ length: 50 }, (_, index) => index + 1));

  const book = getDb().prepare(`
    SELECT bb.name_ar, bb.name_en, bb.collection_id, bb.chapter_count,
      bm.canonicality_status, bm.text_status
    FROM bible_books bb JOIN bible_book_metadata bm ON bm.book_code=bb.code
    WHERE bb.code='SAMJOS'
  `).get();

  assert.deepEqual(book && {
    name_ar: book.name_ar,
    name_en: book.name_en,
    chapter_count: book.chapter_count,
    canonicality_status: book.canonicality_status,
    text_status: book.text_status
  }, {
    name_ar: 'التاريخ السامري (كتاب يشوع)',
    name_en: 'The Samaritan Chronicle (Book of Joshua)',
    chapter_count: 50,
    canonicality_status: 'apocryphal',
    text_status: 'partial'
  });
  assert.ok(book.collection_id);

  const translation = getDb().prepare(`
    SELECT slug, language, is_active, site_scope, source_type
    FROM bible_translations WHERE slug='en-samaritan-chronicle-crane-1890'
  `).get();
  assert.deepEqual(translation && {
    slug: translation.slug,
    language: translation.language,
    is_active: translation.is_active,
    site_scope: translation.site_scope,
    source_type: translation.source_type
  }, {
    slug: 'en-samaritan-chronicle-crane-1890',
    language: 'en',
    is_active: 1,
    site_scope: 'both',
    source_type: 'cc-by-sa-4.0'
  });

  const actual = getDb().prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=(SELECT id FROM bible_translations WHERE slug=?)
      AND book_code='SAMJOS'
    ORDER BY chapter, verse
  `).all(SAMARITAN_CHRONICLE_SOURCE.translationSlug);
  assert.deepEqual(actual, data.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
  assert.equal(actual.length, 50);
  assert.equal(await ensureSamaritanChronicleImported(), false);
});
