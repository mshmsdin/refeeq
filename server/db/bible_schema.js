// Bible Module Schema — adds tables to existing library.db
// Run via: import { initBibleSchema } from './bible_schema.js'; initBibleSchema();

import { getDb } from './schema.js';

export function initBibleSchema() {
  const db = getDb();

  db.exec(`
    -- ======================================================
    -- Bible Translations
    -- ======================================================
    CREATE TABLE IF NOT EXISTS bible_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,          -- e.g. 'ar-svd'
      name_ar TEXT NOT NULL,              -- فان دايك
      name_en TEXT NOT NULL,              -- Arabic Van Dyck
      abbreviation TEXT NOT NULL,         -- SVD
      language TEXT DEFAULT 'ar',
      source_url TEXT,
      source_type TEXT,                   -- 'structured-file' | 'html' | 'usfm' | 'xml'
      source_notes TEXT,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      imported_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ======================================================
    -- Bible Collections (canons / testaments)
    -- ======================================================
    CREATE TABLE IF NOT EXISTS bible_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,          -- 'old-testament' | 'new-testament' | 'deuterocanon' | 'apocrypha'
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL,             -- 'ot' | 'nt' | 'deutero' | 'apocrypha'
      display_order INTEGER DEFAULT 0
    );

    -- ======================================================
    -- Bible Books
    -- ======================================================
    CREATE TABLE IF NOT EXISTS bible_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,          -- 'GEN', 'MAT', 'TOB', etc. (USFM/OSIS code)
      name_ar TEXT NOT NULL,              -- اسم الكتاب بالعربية
      name_en TEXT NOT NULL,
      abbreviation_ar TEXT,               -- مت، يو، تك
      collection_id INTEGER NOT NULL,
      canonical_order INTEGER DEFAULT 0,  -- order within its collection
      chapter_count INTEGER DEFAULT 0,
      FOREIGN KEY (collection_id) REFERENCES bible_collections(id)
    );

    -- ======================================================
    -- Book Aliases (Arabic name normalization)
    -- ======================================================
    CREATE TABLE IF NOT EXISTS bible_book_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_code TEXT NOT NULL,
      alias TEXT NOT NULL,
      UNIQUE(book_code, alias),
      FOREIGN KEY (book_code) REFERENCES bible_books(code)
    );

    -- ======================================================
    -- Verses (one row per verse per translation)
    -- ======================================================
    CREATE TABLE IF NOT EXISTS bible_verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      book_code TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      search_text TEXT NOT NULL,          -- normalized Arabic for FTS/LIKE search
      source_url TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(translation_id, book_code, chapter, verse),
      FOREIGN KEY (translation_id) REFERENCES bible_translations(id),
      FOREIGN KEY (book_code) REFERENCES bible_books(code)
    );

    -- ======================================================
    -- Indexes
    -- ======================================================
    CREATE INDEX IF NOT EXISTS idx_bv_trans_book_ch ON bible_verses(translation_id, book_code, chapter);
    CREATE INDEX IF NOT EXISTS idx_bv_trans_book_ch_v ON bible_verses(translation_id, book_code, chapter, verse);
    CREATE INDEX IF NOT EXISTS idx_bv_book_ch ON bible_verses(book_code, chapter);
    CREATE INDEX IF NOT EXISTS idx_bv_search ON bible_verses(search_text);
    CREATE INDEX IF NOT EXISTS idx_bba_alias ON bible_book_aliases(alias);

    -- ======================================================
    -- FTS5 for verse text search (Arabic-aware)
    -- ======================================================
    CREATE VIRTUAL TABLE IF NOT EXISTS bible_verses_fts USING fts5(
      search_text,
      content=bible_verses,
      content_rowid=id,
      tokenize="unicode61 remove_diacritics 2"
    );

    -- FTS sync triggers
    CREATE TRIGGER IF NOT EXISTS bv_ai AFTER INSERT ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(rowid, search_text) VALUES (new.id, new.search_text);
    END;

    CREATE TRIGGER IF NOT EXISTS bv_ad AFTER DELETE ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(bible_verses_fts, rowid, search_text)
        VALUES('delete', old.id, old.search_text);
    END;

    CREATE TRIGGER IF NOT EXISTS bv_au AFTER UPDATE ON bible_verses BEGIN
      INSERT INTO bible_verses_fts(bible_verses_fts, rowid, search_text)
        VALUES('delete', old.id, old.search_text);
      INSERT INTO bible_verses_fts(rowid, search_text) VALUES (new.id, new.search_text);
    END;
  `);

  // Seed collections
  const insertCollection = db.prepare(`
    INSERT OR IGNORE INTO bible_collections (slug, name_ar, name_en, category, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const collections = [
    ['old-testament',  'العهد القديم',              'Old Testament',       'ot',       1],
    ['new-testament',  'العهد الجديد',              'New Testament',       'nt',       2],
    ['deuterocanon',   'الأسفار القانونية الثانية', 'Deuterocanonical',    'deutero',  3],
    ['apocrypha',      'نصوص أبوكريفية',            'Apocrypha',           'apocrypha',4],
  ];
  for (const c of collections) insertCollection.run(...c);

  // Seed books (66 canonical + deuterocanon)
  _seedBooks(db);

  console.log('[Bible] Schema initialized.');
}

function _seedBooks(db) {
  const colMap = {};
  for (const c of db.prepare('SELECT id, slug FROM bible_collections').all()) {
    colMap[c.slug] = c.id;
  }

  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO bible_books (code, name_ar, name_en, abbreviation_ar, collection_id, canonical_order, chapter_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const OT = colMap['old-testament'];
  const NT = colMap['new-testament'];
  const DC = colMap['deuterocanon'];
  const AP = colMap['apocrypha'];

  const books = [
    // OT — 39 books
    ['GEN','التكوين','Genesis','تك',OT,1,50],
    ['EXO','الخروج','Exodus','خر',OT,2,40],
    ['LEV','اللاويين','Leviticus','لا',OT,3,27],
    ['NUM','العدد','Numbers','عد',OT,4,36],
    ['DEU','التثنية','Deuteronomy','تث',OT,5,34],
    ['JOS','يشوع','Joshua','يش',OT,6,24],
    ['JDG','القضاة','Judges','قض',OT,7,21],
    ['RUT','راعوث','Ruth','رع',OT,8,4],
    ['1SA','صموئيل الأول','1 Samuel','1صم',OT,9,31],
    ['2SA','صموئيل الثاني','2 Samuel','2صم',OT,10,24],
    ['1KI','الملوك الأول','1 Kings','1مل',OT,11,22],
    ['2KI','الملوك الثاني','2 Kings','2مل',OT,12,25],
    ['1CH','أخبار الأيام الأول','1 Chronicles','1أي',OT,13,29],
    ['2CH','أخبار الأيام الثاني','2 Chronicles','2أي',OT,14,36],
    ['EZR','عزرا','Ezra','عز',OT,15,10],
    ['NEH','نحميا','Nehemiah','نح',OT,16,13],
    ['EST','أستير','Esther','أس',OT,17,10],
    ['JOB','أيوب','Job','أي',OT,18,42],
    ['PSA','المزامير','Psalms','مز',OT,19,150],
    ['PRO','الأمثال','Proverbs','أم',OT,20,31],
    ['ECC','الجامعة','Ecclesiastes','جا',OT,21,12],
    ['SNG','نشيد الأناشيد','Song of Songs','نش',OT,22,8],
    ['ISA','إشعياء','Isaiah','إش',OT,23,66],
    ['JER','إرميا','Jeremiah','إر',OT,24,52],
    ['LAM','مراثي إرميا','Lamentations','مرا',OT,25,5],
    ['EZK','حزقيال','Ezekiel','حز',OT,26,48],
    ['DAN','دانيال','Daniel','دا',OT,27,12],
    ['HOS','هوشع','Hosea','هو',OT,28,14],
    ['JOL','يوئيل','Joel','يؤ',OT,29,3],
    ['AMO','عاموس','Amos','عا',OT,30,9],
    ['OBA','عوبديا','Obadiah','عو',OT,31,1],
    ['JON','يونان','Jonah','يون',OT,32,4],
    ['MIC','ميخا','Micah','مي',OT,33,7],
    ['NAM','ناحوم','Nahum','نا',OT,34,3],
    ['HAB','حبقوق','Habakkuk','حب',OT,35,3],
    ['ZEP','صفنيا','Zephaniah','صف',OT,36,3],
    ['HAG','حجي','Haggai','حج',OT,37,2],
    ['ZEC','زكريا','Zechariah','زك',OT,38,14],
    ['MAL','ملاخي','Malachi','ملا',OT,39,4],
    // NT — 27 books
    ['MAT','متى','Matthew','مت',NT,1,28],
    ['MRK','مرقس','Mark','مر',NT,2,16],
    ['LUK','لوقا','Luke','لو',NT,3,24],
    ['JHN','يوحنا','John','يو',NT,4,21],
    ['ACT','أعمال الرسل','Acts','أع',NT,5,28],
    ['ROM','رومية','Romans','رو',NT,6,16],
    ['1CO','كورنثوس الأولى','1 Corinthians','1كو',NT,7,16],
    ['2CO','كورنثوس الثانية','2 Corinthians','2كو',NT,8,13],
    ['GAL','غلاطية','Galatians','غل',NT,9,6],
    ['EPH','أفسس','Ephesians','أف',NT,10,6],
    ['PHP','فيلبي','Philippians','في',NT,11,4],
    ['COL','كولوسي','Colossians','كو',NT,12,4],
    ['1TH','تسالونيكي الأولى','1 Thessalonians','1تس',NT,13,5],
    ['2TH','تسالونيكي الثانية','2 Thessalonians','2تس',NT,14,3],
    ['1TI','تيموثاوس الأولى','1 Timothy','1تي',NT,15,6],
    ['2TI','تيموثاوس الثانية','2 Timothy','2تي',NT,16,4],
    ['TIT','تيطس','Titus','تي',NT,17,3],
    ['PHM','فيلمون','Philemon','فل',NT,18,1],
    ['HEB','العبرانيين','Hebrews','عب',NT,19,13],
    ['JAS','يعقوب','James','يع',NT,20,5],
    ['1PE','بطرس الأولى','1 Peter','1بط',NT,21,5],
    ['2PE','بطرس الثانية','2 Peter','2بط',NT,22,3],
    ['1JN','يوحنا الأولى','1 John','1يو',NT,23,5],
    ['2JN','يوحنا الثانية','2 John','2يو',NT,24,1],
    ['3JN','يوحنا الثالثة','3 John','3يو',NT,25,1],
    ['JUD','يهوذا','Jude','يه',NT,26,1],
    ['REV','الرؤيا','Revelation','رؤ',NT,27,22],
    // Deuterocanon (seeded from importer separately, pre-declare common ones)
    ['TOB','طوبيا','Tobit','طو',DC,1,14],
    ['JDT','يهوديت','Judith','يهو',DC,2,16],
    ['1MA','المكابيين الأول','1 Maccabees','1مك',DC,3,16],
    ['2MA','المكابيين الثاني','2 Maccabees','2مك',DC,4,15],
    ['WIS','الحكمة','Wisdom of Solomon','حك',DC,5,19],
    ['SIR','ابن سيراخ','Sirach','سي',DC,6,51],
    ['BAR','باروخ','Baruch','با',DC,7,6],
    ['1ES','عزرا الأول','1 Esdras','1عز',DC,8,9],
    ['2ES','عزرا الثاني','2 Esdras','2عز',DC,9,16],
    ['MAN','صلاة منسى','Prayer of Manasseh','صم',DC,10,1],
    ['PS2','المزمور 151','Psalm 151','مز151',DC,11,1],
    ['3MA','المكابيين الثالث','3 Maccabees','3مك',DC,12,7],
    ['4MA','المكابيين الرابع','4 Maccabees','4مك',DC,13,18],
    ['DAG','دانيال (يوناني)','Daniel (Greek additions)','داي',DC,14,3],
    ['ESG','أستير (يوناني)','Esther (Greek)','أسي',DC,15,10],
    // Apocrypha / Pseudepigrapha (Ethiopian Canon)
    ['ENO','أخنوخ الأول','1 Enoch','أخ',AP,1,108],
    ['JUB','اليوبيلات','Book of Jubilees','يوب',AP,2,50],
  ];

  for (const b of books) insertBook.run(...b);

  // Seed aliases
  _seedAliases(db);
}

function _seedAliases(db) {
  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO bible_book_aliases (book_code, alias) VALUES (?, ?)
  `);

  const aliases = [
    // Genesis
    ['GEN','تك'],['GEN','التكوين'],['GEN','سفر التكوين'],['GEN','تكوين'],
    // Exodus
    ['EXO','خر'],['EXO','الخروج'],['EXO','سفر الخروج'],
    // Leviticus
    ['LEV','لا'],['LEV','اللاويين'],['LEV','سفر اللاويين'],
    // Numbers
    ['NUM','عد'],['NUM','العدد'],['NUM','سفر العدد'],
    // Deuteronomy
    ['DEU','تث'],['DEU','التثنية'],['DEU','سفر التثنية'],
    // Joshua
    ['JOS','يش'],['JOS','يشوع'],
    // Judges
    ['JDG','قض'],['JDG','القضاة'],
    // Ruth
    ['RUT','رع'],['RUT','راعوث'],
    // 1 Samuel
    ['1SA','1صم'],['1SA','صموئيل الأول'],['1SA','الأول صموئيل'],['1SA','1 صموئيل'],['1SA','صم1'],
    // 2 Samuel
    ['2SA','2صم'],['2SA','صموئيل الثاني'],['2SA','الثاني صموئيل'],['2SA','2 صموئيل'],
    // 1 Kings
    ['1KI','1مل'],['1KI','الملوك الأول'],['1KI','1 ملوك'],['1KI','ملوك1'],
    // 2 Kings
    ['2KI','2مل'],['2KI','الملوك الثاني'],['2KI','2 ملوك'],
    // 1 Chronicles
    ['1CH','1أي'],['1CH','أخبار الأيام الأول'],['1CH','1 أيام'],
    // 2 Chronicles
    ['2CH','2أي'],['2CH','أخبار الأيام الثاني'],['2CH','2 أيام'],
    // Ezra
    ['EZR','عز'],['EZR','عزرا'],
    // Nehemiah
    ['NEH','نح'],['NEH','نحميا'],
    // Esther
    ['ESG', 'تتمة استير'],
    ['ESG', 'أستير اليوناني'],
    // Enoch & Jubilees
    ['ENO', 'أخنوخ'],
    ['ENO', 'اخنوخ'],
    ['ENO', 'سفر أخنوخ'],
    ['ENO', 'أخنوخ الأول'],
    ['ENO', 'اخنوخ الاول'],
    ['ENO', '1 Enoch'],
    ['JUB', 'اليوبيلات'],
    ['JUB', 'سفر اليوبيلات'],
    ['JUB', 'اليوبيل'],
    ['JUB', 'سفر اليوبيل'],
    ['JUB', 'التكوين الصغير'],
    ['JUB', 'Jubilees'],
    // Job
    ['JOB','أي'],['JOB','أيوب'],
    // Psalms
    ['PSA','مز'],['PSA','المزامير'],['PSA','مزامير'],['PSA','المزمور'],['PSA','مزمور'],
    // Proverbs
    ['PRO','أم'],['PRO','الأمثال'],['PRO','أمثال'],
    // Ecclesiastes
    ['ECC','جا'],['ECC','الجامعة'],
    // Song of Songs
    ['SNG','نش'],['SNG','نشيد الأناشيد'],['SNG','نشيد'],
    // Isaiah
    ['ISA','إش'],['ISA','إشعياء'],['ISA','اشعياء'],
    // Jeremiah
    ['JER','إر'],['JER','إرميا'],['JER','ارميا'],
    // Lamentations
    ['LAM','مرا'],['LAM','مراثي'],['LAM','مراثي إرميا'],
    // Ezekiel
    ['EZK','حز'],['EZK','حزقيال'],
    // Daniel
    ['DAN','دا'],['DAN','دانيال'],['DAN','داي'],
    // Hosea
    ['HOS','هو'],['HOS','هوشع'],
    // Joel
    ['JOL','يؤ'],['JOL','يوئيل'],
    // Amos
    ['AMO','عا'],['AMO','عاموس'],
    // Obadiah
    ['OBA','عو'],['OBA','عوبديا'],
    // Jonah
    ['JON','يون'],['JON','يونان'],
    // Micah
    ['MIC','مي'],['MIC','ميخا'],
    // Nahum
    ['NAM','نا'],['NAM','ناحوم'],
    // Habakkuk
    ['HAB','حب'],['HAB','حبقوق'],
    // Zephaniah
    ['ZEP','صف'],['ZEP','صفنيا'],
    // Haggai
    ['HAG','حج'],['HAG','حجي'],
    // Zechariah
    ['ZEC','زك'],['ZEC','زكريا'],
    // Malachi
    ['MAL','ملا'],['MAL','ملاخي'],
    // Matthew
    ['MAT','مت'],['MAT','متى'],['MAT','متي'],['MAT','إنجيل متى'],['MAT','انجيل متى'],
    // Mark
    ['MRK','مر'],['MRK','مرقس'],['MRK','إنجيل مرقس'],
    // Luke
    ['LUK','لو'],['LUK','لوقا'],['LUK','إنجيل لوقا'],
    // John
    ['JHN','يو'],['JHN','يوح'],['JHN','يوحنا'],['JHN','إنجيل يوحنا'],['JHN','انجيل يوحنا'],
    // Acts
    ['ACT','أع'],['ACT','أعمال'],['ACT','أعمال الرسل'],['ACT','اعمال'],
    // Romans
    ['ROM','رو'],['ROM','رومية'],
    // 1 Corinthians
    ['1CO','1كو'],['1CO','كورنثوس الأولى'],['1CO','1 كورنثوس'],['1CO','كو1'],
    // 2 Corinthians
    ['2CO','2كو'],['2CO','كورنثوس الثانية'],['2CO','2 كورنثوس'],
    // Galatians
    ['GAL','غل'],['GAL','غلاطية'],
    // Ephesians
    ['EPH','أف'],['EPH','أفسس'],
    // Philippians
    ['PHP','في'],['PHP','فيلبي'],['PHP','فيل'],
    // Colossians
    ['COL','كو'],['COL','كولوسي'],
    // 1 Thessalonians
    ['1TH','1تس'],['1TH','تسالونيكي الأولى'],['1TH','1 تسالونيكي'],
    // 2 Thessalonians
    ['2TH','2تس'],['2TH','تسالونيكي الثانية'],
    // 1 Timothy
    ['1TI','1تي'],['1TI','تيموثاوس الأولى'],['1TI','1 تيموثاوس'],
    // 2 Timothy
    ['2TI','2تي'],['2TI','تيموثاوس الثانية'],
    // Titus
    ['TIT','تي'],['TIT','تيطس'],
    // Philemon
    ['PHM','فل'],['PHM','فيلمون'],
    // Hebrews
    ['HEB','عب'],['HEB','العبرانيين'],['HEB','عبرانيين'],
    // James
    ['JAS','يع'],['JAS','يعقوب'],
    // 1 Peter
    ['1PE','1بط'],['1PE','بطرس الأولى'],['1PE','1 بطرس'],
    // 2 Peter
    ['2PE','2بط'],['2PE','بطرس الثانية'],['2PE','2 بطرس'],
    // 1 John
    ['1JN','1يو'],['1JN','يوحنا الأولى'],['1JN','1 يوحنا'],
    // 2 John
    ['2JN','2يو'],['2JN','يوحنا الثانية'],
    // 3 John
    ['3JN','3يو'],['3JN','يوحنا الثالثة'],
    // Jude
    ['JUD','يه'],['JUD','يهوذا'],
    // Revelation
    ['REV','رؤ'],['REV','الرؤيا'],['REV','رؤيا'],['REV','الرؤيا يوحنا'],
    // Deuterocanon
    ['TOB','طو'],['TOB','طوبيا'],['TOB','طوبيت'],
    ['JDT','يهو'],['JDT','يهوديت'],
    ['1MA','1مك'],['1MA','المكابيين الأول'],['1MA','1 مكابيين'],
    ['2MA','2مك'],['2MA','المكابيين الثاني'],
    ['WIS','حك'],['WIS','الحكمة'],['WIS','حكمة سليمان'],
    ['SIR','سي'],['SIR','ابن سيراخ'],['SIR','يشوع بن سيراخ'],['SIR','سيراخ'],
    ['BAR','با'],['BAR','باروخ'],
  ];

  for (const [code, alias] of aliases) {
    insertAlias.run(code, alias);
  }
}
