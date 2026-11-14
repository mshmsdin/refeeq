import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const testDbPath = join(tmpdir(), `sirach-geez-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
const { initDatabase, getDb } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { getBook, getChapter, getTranslationBySlug } = await import('../utils/bible_service.js');
const { ensureSirachGeezImported, SIRACH_GEEZ_SOURCE } = await import('./sirach_geez_startup_import.js');
const { parseReviewedUnitText } = await import('../importers/reviewed_text_source.js');

initDatabase();
initBibleSchema();
const seededDb = getDb();
seededDb.prepare(`
  INSERT INTO bible_translations
    (slug, name_ar, name_en, abbreviation, language, source_url, source_type, site_scope, is_active)
  VALUES ('en-kjv-apocrypha', 'نسخة الملك جيمس الإنجليزية مع الأبوكريفا', 'King James Version with Apocrypha',
    'KJVA', 'en', 'https://ebible.org/Scriptures/eng-kjv_vpl.zip', 'vpl', 'both', 1)
`).run();
const englishId = seededDb.prepare("SELECT id FROM bible_translations WHERE slug='en-kjv-apocrypha'").get().id;
seededDb.prepare(`
  INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url)
  VALUES (?, 'SIRE', 1, 1, 'English witness fixture', 'english witness fixture', 'https://ebible.org/Scriptures/eng-kjv_vpl.zip')
`).run(englishId);
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the complete licensed Ge\'ez Sirach witness without replacing the existing English edition', async () => {
  assert.equal(await ensureSirachGeezImported(), true);
  const db = getDb();
  const translation = getTranslationBySlug(SIRACH_GEEZ_SOURCE.slug);
  assert.equal(translation.language, 'gez');
  assert.equal(translation.is_active, 1);
  assert.equal(translation.site_scope, 'both');
  assert.equal(translation.source_type, 'cc-by-sa-4.0');

  const parsed = parseReviewedUnitText(await readFile(SIRACH_GEEZ_SOURCE.textFile, 'utf8'), SIRACH_GEEZ_SOURCE);
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='SIRE' ORDER BY chapter, verse
  `).all(translation.id);
  assert.deepEqual(actual, parsed.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
  assert.equal(actual.length, 1366);
  assert.deepEqual(db.prepare(`
    SELECT chapter, COUNT(*) AS units FROM bible_verses
    WHERE translation_id=? AND book_code='SIRE' GROUP BY chapter ORDER BY chapter
  `).all(translation.id), SIRACH_GEEZ_SOURCE.chapterCounts.map((units, index) => ({ chapter: index + 1, units })));
  assert.equal(new Set(actual.map(({ chapter, verse }) => `${chapter}:${verse}`)).size, actual.length);
  assert.ok(parsed.every(({ text }) => text.trim().length > 0));

  const book = getBook('SIRE');
  assert.equal(book.collection_site_scope, 'both');
  assert.ok(book.available_translations.includes(SIRACH_GEEZ_SOURCE.slug));
  assert.ok(book.available_translations.includes('en-kjv-apocrypha'));
  assert.deepEqual(db.prepare(`SELECT chapter, verse, text FROM bible_verses WHERE translation_id=? AND book_code='SIRE'`)
    .all(englishId), [{ chapter: 1, verse: 1, text: 'English witness fixture' }]);
  assert.equal(getChapter(translation.id, 'SIRE', 1).length, 30);
  assert.equal(db.prepare(`
    SELECT COUNT(*) AS count FROM bible_book_sources
    WHERE book_code='SIRE' AND language='gez' AND source_type='cc-by-sa-4.0' AND source_url=?
  `).get(SIRACH_GEEZ_SOURCE.url).count, 1);
  assert.equal(db.prepare(`SELECT summary_ar FROM bible_book_metadata WHERE book_code='SIRE'`).get().summary_ar,
    'يتاح سفر يشوع بن سيراخ بشاهد جعزي كامل من بيتا مصاحفت: ٥١ فصلاً و١٣٦٦ وحدة بحسب ترتيب سطور المصدر. أرقام العرض متسلسلة، وأرقام المصدر الأصلية محفوظة في ملف الاستيراد لأن بعض الفصول تحوي فجوات وتكراراً في الترقيم. تبقى ترجمة الملك جيمس الإنجليزية شاهداً مستقلاً متاحاً.');

  initBibleSchema();
  assert.equal(await ensureSirachGeezImported(), false);
  assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=? AND book_code='SIRE'`).get(translation.id).count, 1366);
});
