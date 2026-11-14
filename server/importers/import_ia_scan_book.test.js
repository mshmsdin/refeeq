import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `scan-book-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.BIBLE_ONLY = 'true';
const { getDb, initDatabase } = await import('../db/schema.js');
const { initBibleSchema } = await import('../db/bible_schema.js');
const { detectSections, scanBookIsReady, storeScanBook } = await import('./import_ia_scan_book.js');
const { imageUrlTemplate } = await import('./scan_book_sources.js');
const { buildSnippet, decodeWords, findHitIndexes, normalizeScanWord, parseDjvuXml } = await import('../utils/scan_books.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

function pageXml(width, height, words) {
  const body = words.map(([text, x1, y1, x2, y2]) => `<WORD coords="${x1},${y1},${x2},${y2}" x-confidence="90">${text}</WORD>`).join('');
  return `<OBJECT data="file://x.djvu" width="${width}" height="${height}"><HIDDENTEXT><LINE>${body}</LINE></HIDDENTEXT></OBJECT>`;
}

const SAMPLE_XML = `<DjVuXML><BODY>${[
  pageXml(1000, 2000, [['سفر', 500, 100, 600, 50], ['التكوين', 300, 100, 480, 50], ['ومن', 900, 300, 950, 250]]),
  pageXml(1000, 2000, [['سفر', 500, 100, 600, 50], ['الخروج', 300, 100, 480, 50], ['الكفاره', 800, 400, 900, 350], ['&amp;', 700, 400, 720, 350]])
].join('')}</BODY></DjVuXML>`;

const SOURCE = {
  slug: 'test-scan',
  titleAr: 'كتاب اختبار',
  titleEn: 'Test scan',
  editorAr: 'محرر',
  textualTradition: 'sam',
  archiveIdentifier: 'test_id',
  archiveUrl: 'https://archive.org/details/test_id',
  archiveFileBase: 'اختبار',
  expectedPageCount: 2,
  expectedMinWords: 5,
  notes: 'اختبار',
  sectionHeads: { التكوين: { code: 'GEN', nameAr: 'التكوين' }, الخروج: { code: 'EXO', nameAr: 'الخروج' } }
};

test('يقرأ إحداثيات الكلمات ويحوّلها إلى عشرة آلاف من مقاس الصفحة ويفك رموز XML', () => {
  const pages = parseDjvuXml(SAMPLE_XML);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[0].words[0], ['سفر', 5000, 250, 1000, 250]);
  assert.equal(pages[1].words[3][0], '&');
});

test('يوحّد الكلمات ويطابق العبارة المتتابعة فقط', () => {
  assert.equal(normalizeScanWord('الكفارة،'), 'الكفاره');
  const [page] = parseDjvuXml(SAMPLE_XML);
  assert.deepEqual(findHitIndexes(page.words, 'سفر التكوين'), [0, 1]);
  assert.deepEqual(findHitIndexes(page.words, 'التكوين سفر'), []);
  assert.equal(buildSnippet(page.words, [1]), 'سفر التكوين ومن');
});

test('يحدد بدايات الأسفار من رأس الصفحة', () => {
  const sections = detectSections(parseDjvuXml(SAMPLE_XML), SOURCE.sectionHeads);
  assert.deepEqual(sections.map(({ code, firstLeaf }) => [code, firstLeaf]), [['GEN', 0], ['EXO', 1]]);
});

test('يخزّن الكتاب مضغوطاً ويكرر الاستيراد دون ازدواج', () => {
  const db = getDb();
  assert.equal(scanBookIsReady(db, SOURCE), false);
  storeScanBook(db, SOURCE, parseDjvuXml(SAMPLE_XML));
  storeScanBook(db, SOURCE, parseDjvuXml(SAMPLE_XML));
  assert.equal(scanBookIsReady(db, SOURCE), true);
  const book = db.prepare('SELECT * FROM bible_scan_books WHERE slug=?').get('test-scan');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bible_scan_pages WHERE book_id=?').get(book.id).n, 2);
  const stored = db.prepare('SELECT words_gz FROM bible_scan_pages WHERE book_id=? AND leaf=1').get(book.id);
  assert.equal(decodeWords(stored.words_gz)[2][0], 'الكفاره');
});

test('يرفض صفحات ناقصة', () => {
  assert.throws(() => storeScanBook(getDb(), SOURCE, parseDjvuXml(SAMPLE_XML).slice(0, 1)), /عدد صفحات/);
});

test('قالب الصورة يشير إلى أرشيف الإنترنت ويحتفظ بخانتي الورقة والعرض', () => {
  const template = imageUrlTemplate(SOURCE);
  assert.match(template, /^https:\/\/iiif\.archive\.org\/image\/iiif\/3\/test_id%2F/);
  assert.ok(template.includes('{leaf}') && template.includes('{width}'));
});
