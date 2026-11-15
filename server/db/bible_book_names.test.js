import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `book-names-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.BIBLE_ONLY = 'true';
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { applyBookNameOverrides, BOOK_NAME_OVERRIDES } = await import('../utils/bible_book_names.js');
const { getBook, getBooks } = await import('../utils/bible_service.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('عزرا الرابع (إسدراس الثاني) وعزرا الثالث (إسدراس الأول) بأسمائهما المتعارفة', () => {
  assert.equal(getBook('2ES').name_ar, 'عزرا الرابع (إسدراس الثاني)');
  assert.equal(getBook('1ES').name_ar, 'عزرا الثالث (إسدراس الأول)');
  assert.equal(getBook('DAG').name_ar, 'إضافات دانيال اليونانية');
});

test('الأسماء البديلة تصل مع الأسفار، والاسم القديم يبقى بديلاً، ولا يتكرر الاسم المعتمد بين البدائل', () => {
  const two = getBook('2ES');
  for (const alias of ['إسدراس الثاني', 'عزرا الرابع', 'عزرا الثاني', '4 Ezra', '2 Esdras']) {
    assert.ok(two.aliases.includes(alias), alias);
  }
  assert.ok(!two.aliases.includes(two.name_ar));
  const listed = getBooks(null).find((book) => book.code === '2ES');
  assert.deepEqual(listed.aliases, two.aliases);
  assert.ok(getBook('TOB').aliases.includes('طوبيت'));
  assert.ok(getBook('LEV').aliases.includes('الأحبار'));
});

test('تطبيق الأسماء يتكرر دون تغيير', () => {
  assert.deepEqual(applyBookNameOverrides(getDb()), { renamed: 0, aliasesAdded: 0 });
});

test('لا يطابق اسم بديل الاسم المعتمد لسفر آخر', () => {
  const db = getDb();
  const names = new Map(db.prepare('SELECT code, name_ar FROM bible_books').all().map((row) => [row.name_ar, row.code]));
  const clashes = [];
  for (const { book_code, alias } of db.prepare('SELECT book_code, alias FROM bible_book_aliases').all()) {
    const owner = names.get(alias);
    if (owner && owner !== book_code) clashes.push(`${alias}: ${book_code} ≠ ${owner}`);
  }
  assert.deepEqual(clashes, []);
});

test('كل اسم معتمد وبديل في الجدول غير فارغ ولا يتكرر داخل السفر الواحد', () => {
  for (const [code, entry] of Object.entries(BOOK_NAME_OVERRIDES)) {
    if (entry.name_ar !== undefined) assert.ok(entry.name_ar.trim(), code);
    const aliases = entry.aliases || [];
    assert.equal(new Set(aliases).size, aliases.length, `بدائل مكررة في ${code}`);
    assert.ok(aliases.every((alias) => alias.trim() && alias === alias.trim()), code);
  }
});

test('الترجمة العربية أولاً في الترجمات المتاحة للسفر مهما كان ترتيبها العام', () => {
  const db = getDb();
  const insertTranslation = db.prepare(`INSERT INTO bible_translations (slug, name_ar, name_en, abbreviation, language, site_scope, is_active, display_order) VALUES (?, ?, ?, ?, ?, 'both', 1, ?)`);
  insertTranslation.run('en-order-test', 'اختبار إنجليزي', 'EN', 'EN', 'en', 1);
  insertTranslation.run('ar-order-test', 'اختبار عربي', 'AR', 'AR', 'ar', 99);
  const insertVerse = db.prepare('INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text) VALUES (?, ?, 1, 1, ?, ?)');
  for (const slug of ['en-order-test', 'ar-order-test']) {
    const id = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(slug).id;
    insertVerse.run(id, '2ES', 'text', 'text');
  }
  assert.deepEqual(getBook('2ES').available_translations, ['ar-order-test', 'en-order-test']);
  assert.deepEqual(getBooks(null).find((book) => book.code === '2ES').available_translations, ['ar-order-test', 'en-order-test']);
});
