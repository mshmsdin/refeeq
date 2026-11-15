import test from 'node:test';
import assert from 'node:assert/strict';
import { arabicFirst, filterBooksByQuery, normalizeBookQuery, pickTranslationsForBook } from './bible_book_search.js';

const BOOKS = [
  { code: 'EZR', book_number: 17, name_ar: 'عزرا', aliases: ['سفر عزرا'] },
  { code: 'NEH', book_number: 18, name_ar: 'نحميا', aliases: ['سفر نحميا'] },
  { code: '1ES', book_number: 70, name_ar: 'عزرا الثالث (إسدراس الأول)', aliases: ['عزرا الأول', 'إسدراس الأول', '3 عزرا'] },
  { code: '2ES', book_number: 71, name_ar: 'عزرا الرابع (إسدراس الثاني)', aliases: ['عزرا الثاني', 'إسدراس الثاني', '4 عزرا', 'رؤيا عزرا', '2 Esdras'] },
  { code: 'TOB', book_number: 60, name_ar: 'طوبيا', aliases: ['طوبيت', 'Tobit'] },
  { code: 'ISA', book_number: 23, name_ar: 'إشعياء', aliases: ['أشعيا', 'أشعياء'] },
  { code: 'LEV', book_number: 3, name_ar: 'اللاويين', aliases: ['الأحبار'] }
];
const codes = (query) => filterBooksByQuery(BOOKS, query).map((r) => r.book.code);

test('توحيد الهمزات والتاء المربوطة والتشكيل والأرقام العربية', () => {
  assert.equal(normalizeBookQuery('إِسْدْرَاسَ'), 'اسدراس');
  assert.equal(normalizeBookQuery('أشعياء'), 'اشعياء');
  assert.equal(normalizeBookQuery('عزرا ٤'), 'عزرا 4');
  assert.equal(normalizeBookQuery('  طوبيّة  '), 'طوبيه');
});

test('عزرا الرابع وإسدراس الثاني يوصلان إلى السفر نفسه بأي كتابة', () => {
  for (const query of ['عزرا الرابع', 'اسدراس الثاني', 'إسدراس الثاني', 'عزرا 4', '4 عزرا', 'رؤيا عزرا', 'Esdras']) {
    assert.ok(codes(query).includes('2ES'), query);
  }
  assert.equal(codes('إسدراس الثاني')[0], '2ES');
  assert.ok(!codes('إسدراس الثاني').includes('1ES'));
});

test('الاسم القديم ما زال يوصل إلى السفر، ويظهر الاسم البديل الذي طابق', () => {
  // «عزرا الثاني» كان اسم السفر قبل التعديل: ما زال يوصل إليه (كلماته في الاسم المعتمد، فلا يُعرض معه اسم بديل).
  const hit = filterBooksByQuery(BOOKS, 'عزرا الثاني').find((r) => r.book.code === '2ES');
  assert.ok(hit);
  assert.equal(hit.matchedAlias, null);
  // «عزرا الأول» اسم بديل لا يقع في الاسم المعتمد كاملاً، فيُعرض الاسم البديل الذي طابق.
  const old1 = filterBooksByQuery(BOOKS, 'عزرا الأول').find((r) => r.book.code === '1ES');
  assert.ok(old1);
  assert.equal(filterBooksByQuery(BOOKS, 'طوبيت')[0].book.code, 'TOB');
  assert.equal(filterBooksByQuery(BOOKS, 'طوبيت')[0].matchedAlias, 'طوبيت');
});

test('الاسم المعتمد لا يُعرض معه اسم بديل، والبحث بالرمز والرقم', () => {
  assert.equal(filterBooksByQuery(BOOKS, 'طوبيا')[0].matchedAlias, null);
  assert.deepEqual(codes('2ES'), ['2ES']);
  assert.deepEqual(codes('18'), ['NEH']);
  assert.equal(codes('الأحبار')[0], 'LEV');
  assert.equal(codes('اشعيا')[0], 'ISA');
});

test('استعلام فارغ يعيد كل الأسفار، وما لا يطابق لا يعيد شيئاً', () => {
  assert.equal(codes('').length, BOOKS.length);
  assert.deepEqual(codes('سفر غير موجود'), []);
});

const TRANSLATIONS = [
  { slug: 'en-web', language: 'en' },
  { slug: 'ar-svd', language: 'ar' },
  { slug: 'ar-mohammad-2es', language: 'ar' },
  { slug: 'grc-brenton-1es', language: 'grc' }
];

test('الترجمة العربية تُقدَّم على غيرها', () => {
  assert.deepEqual(arabicFirst(['en-web', 'ar-mohammad-2es'], TRANSLATIONS), ['ar-mohammad-2es', 'en-web']);
  assert.deepEqual(arabicFirst(['en-web', 'grc-brenton-1es'], TRANSLATIONS), ['en-web', 'grc-brenton-1es']);
});

test('عند فتح سفر له ترجمة عربية يجعلها الأصل حتى لو كان المختار إنجليزياً', () => {
  // السفر فيه ترجمة عربية وإنجليزية: المختار السابق ar-svd غير متاح، فتؤخذ العربية لا الإنجليزية.
  assert.deepEqual(pickTranslationsForBook(['ar-svd'], ['ar-mohammad-2es', 'en-web'], TRANSLATIONS), ['ar-mohammad-2es']);
  // المستخدم كان على الإنجليزية: تُضاف العربية أولاً ويبقى اختياره ثانياً.
  assert.deepEqual(pickTranslationsForBook(['en-web'], ['ar-mohammad-2es', 'en-web'], TRANSLATIONS), ['ar-mohammad-2es', 'en-web']);
  // سفر بلا عربية: يبقى اختياره.
  assert.deepEqual(pickTranslationsForBook(['en-web'], ['en-web'], TRANSLATIONS), ['en-web']);
  // اختياران أحدهما عربي: تبقى العربية أولاً.
  assert.deepEqual(pickTranslationsForBook(['en-web', 'ar-svd'], ['ar-svd', 'en-web'], TRANSLATIONS), ['ar-svd', 'en-web']);
  // سفر لا يملك أي ترجمة مختارة سابقاً ولا عربية: أول متاح.
  assert.deepEqual(pickTranslationsForBook(['ar-svd'], ['grc-brenton-1es', 'en-web'], TRANSLATIONS), ['grc-brenton-1es']);
});
