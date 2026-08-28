import { getDb } from '../db/schema.js';

function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
}

export function seedApocrypha() {
  const db = getDb();

  // 1. Ensure collection exists
  let apCol = db.prepare("SELECT id FROM bible_collections WHERE slug = 'apocrypha'").get();
  if (!apCol) {
    db.prepare(`
      INSERT OR IGNORE INTO bible_collections (slug, name_ar, name_en, category, display_order)
      VALUES ('apocrypha', 'نصوص أبوكريفية وأسفار تاريخية', 'Apocrypha & Early Texts', 'apocrypha', 4)
    `).run();
    apCol = db.prepare("SELECT id FROM bible_collections WHERE slug = 'apocrypha'").get();
  }
  const apId = apCol.id;

  // 2. Ensure translation exists
  const insertTrans = db.prepare(`
    INSERT OR IGNORE INTO bible_translations (slug, name_ar, name_en, abbreviation, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertTrans.run(
    'ar-apocrypha',
    'الترجمة العربية لنصوص الأبوكريفا والآباء',
    'Arabic Apocrypha & Early Christian Texts',
    'أبو',
    6
  );
  const trans = db.prepare("SELECT id FROM bible_translations WHERE slug = 'ar-apocrypha'").get();
  const transId = trans.id;

  // 3. Register Apocryphal Books
  const booksToRegister = [
    ['DID', 'الديداخي (تعليم الرسل)', 'Didache', 'ديد', apId, 10, 16],
    ['GTH', 'إنجيل توما', 'Gospel of Thomas', 'توما', apId, 11, 1],
    ['PJA', 'إنجيل يعقوب التمهيدي', 'Protoevangelium of James', 'يع-ت', apId, 12, 25],
    ['BARN', 'رسالة برنابا', 'Epistle of Barnabas', 'برن', apId, 13, 21],
    ['PSOL', 'مزامير سليمان', 'Psalms of Solomon', 'م-سل', apId, 14, 18],
    ['ODSO', 'أوديات سليمان', 'Odes of Solomon', 'أود', apId, 15, 42],
    ['GNIC', 'إنجيل نيقوديموس (أعمال بيلاطس)', 'Gospel of Nicodemus', 'نيقو', apId, 16, 29],
    ['HERM', 'راعي هرماس', 'Shepherd of Hermas', 'هرماس', apId, 17, 27],
    ['ASC', 'صعود إشعياء', 'Ascension of Isaiah', 'ص-إش', apId, 18, 11]
  ];

  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO bible_books (code, name_ar, name_en, abbreviation_ar, collection_id, canonical_order, chapter_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of booksToRegister) {
    insertBook.run(...b);
  }

  // Register Aliases
  const insertAlias = db.prepare(`INSERT OR IGNORE INTO bible_book_aliases (book_code, alias) VALUES (?, ?)`);
  const aliases = [
    ['DID', 'الديداخي'], ['DID', 'الديداكي'], ['DID', 'تعليم الرسل'], ['DID', 'Didache'],
    ['GTH', 'إنجيل توما'], ['GTH', 'انجيل توما'], ['GTH', 'توما'], ['GTH', 'Gospel of Thomas'],
    ['PJA', 'إنجيل يعقوب'], ['PJA', 'إنجيل يعقوب التمهيدي'], ['PJA', 'انجيل يعقوب'], ['PJA', 'Protoevangelium'],
    ['BARN', 'رسالة برنابا'], ['BARN', 'برنابا'], ['BARN', 'Barnabas'],
    ['PSOL', 'مزامير سليمان'], ['PSOL', 'مزمور سليمان'], ['PSOL', 'Psalms of Solomon'],
    ['ODSO', 'أوديات سليمان'], ['ODSO', 'ترانيم سليمان'], ['ODSO', 'Odes of Solomon'],
    ['GNIC', 'إنجيل نيقوديموس'], ['GNIC', 'أعمال بيلاطس'], ['GNIC', 'نيقوديموس'], ['GNIC', 'Nicodemus'],
    ['HERM', 'راعي هرماس'], ['HERM', 'هرماس'], ['HERM', 'Hermas'],
    ['ASC', 'صعود إشعياء'], ['ASC', 'صعود اشعياء'], ['ASC', 'استشهاد إشعياء']
  ];
  for (const [code, alias] of aliases) insertAlias.run(code, alias);

  console.log('Apocrypha books registered in database.');
}

seedApocrypha();
