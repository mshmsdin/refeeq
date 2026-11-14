import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `svd-numbering-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.BIBLE_ONLY = 'true';
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureSvdNumberingRepaired, findMisnumberedSvdChapters } = await import('./svd_numbering_startup_repair.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

function seed({ translationSlug, rows }) {
  const db = getDb();
  db.prepare(`INSERT OR IGNORE INTO bible_translations (slug, name_ar, name_en, abbreviation, language, is_active, display_order) VALUES (?, ?, ?, ?, 'ar', 1, 1)`)
    .run(translationSlug, 'اختبار', 'Test', 'T');
  const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(translationSlug).id;
  db.prepare('DELETE FROM bible_verses WHERE translation_id=?').run(translationId);
  const insert = db.prepare('INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text) VALUES (?, ?, ?, ?, ?, ?)');
  for (const [book, chapter, verse] of rows) insert.run(translationId, book, chapter, verse, `نص ${book} ${chapter}:${verse}`, `نص ${book} ${chapter}:${verse}`);
  return translationId;
}

test('يكتشف الإصحاحات التي لا يبدأ ترقيمها من 1 ولا يلتفت إلى غيرها', () => {
  seed({ translationSlug: 'ar-svd', rows: [['GEN', 1, 1], ['GEN', 1, 2], ['GEN', 25, 25], ['GEN', 25, 26], ['EXO', 3, 3], ['EXO', 3, 4]] });
  assert.deepEqual(findMisnumberedSvdChapters(getDb()), [
    { book: 'EXO', chapter: 3, first_verse: 3 },
    { book: 'GEN', chapter: 25, first_verse: 25 }
  ]);
  // ترجمة أخرى ترقيمها بلا بدء من 1 لا تدخل الفحص
  seed({ translationSlug: 'ar-other', rows: [['GEN', 9, 5]] });
  assert.equal(findMisnumberedSvdChapters(getDb()).length, 2);
});

test('يعيد الاستيراد مرة واحدة عند الخلل ثم لا يفعل شيئاً حين تصحّ البيانات', async () => {
  const translationId = seed({ translationSlug: 'ar-svd', rows: [['GEN', 25, 25], ['GEN', 25, 26], ['GEN', 25, 27]] });
  let calls = 0;
  const fixingImporter = async () => {
    calls += 1;
    getDb().prepare('DELETE FROM bible_verses WHERE translation_id=?').run(translationId);
    const insert = getDb().prepare('INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text) VALUES (?, ?, ?, ?, ?, ?)');
    for (const verse of [1, 2, 3]) insert.run(translationId, 'GEN', 25, verse, `نص ${verse}`, `نص ${verse}`);
  };
  assert.deepEqual(await ensureSvdNumberingRepaired({ importer: fixingImporter }), { repaired: true, chapters: 1 });
  assert.equal(calls, 1);
  assert.deepEqual(await ensureSvdNumberingRepaired({ importer: fixingImporter }), { repaired: false, chapters: 0 });
  assert.equal(calls, 1, 'لا إعادة استيراد حين تكون البيانات سليمة');
});

test('إن بقي ترقيم خاطئ بعد الاستيراد يرمي خطأً بدل أن يُخفي المشكلة', async () => {
  seed({ translationSlug: 'ar-svd', rows: [['GEN', 25, 25]] });
  await assert.rejects(() => ensureSvdNumberingRepaired({ importer: async () => {} }), /ترقيم خاطئ/);
});
