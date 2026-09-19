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
      site_scope TEXT DEFAULT 'both',    -- 'rafeeq' | 'bible' | 'both'
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
      display_order INTEGER DEFAULT 0,
      site_scope TEXT DEFAULT 'both'       -- 'rafeeq' | 'bible' | 'both'
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

    -- ======================================================
    -- Scholarly catalog and provenance
    -- ======================================================
    CREATE TABLE IF NOT EXISTS bible_book_metadata (
      book_code TEXT PRIMARY KEY,
      canonicality_status TEXT NOT NULL DEFAULT 'undetermined',
      textual_tradition TEXT,
      original_language TEXT,
      text_status TEXT NOT NULL DEFAULT 'not_imported',
      arabic_status TEXT NOT NULL DEFAULT 'not_found',
      english_status TEXT NOT NULL DEFAULT 'not_found',
      future_translation_status TEXT NOT NULL DEFAULT 'planned',
      summary_ar TEXT,
      source_name TEXT,
      source_url TEXT,
      source_notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_code) REFERENCES bible_books(code)
    );

    CREATE TABLE IF NOT EXISTS bible_book_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_code TEXT NOT NULL,
      label_ar TEXT NOT NULL,
      label_en TEXT,
      language TEXT NOT NULL,
      availability_status TEXT NOT NULL DEFAULT 'available',
      source_type TEXT,
      source_url TEXT,
      notes TEXT,
      UNIQUE(book_code, label_ar, language, source_url),
      FOREIGN KEY (book_code) REFERENCES bible_books(code)
    );

    CREATE TABLE IF NOT EXISTS bible_verse_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_code TEXT NOT NULL,
      chapter INTEGER,
      verse INTEGER,
      base_translation_slug TEXT NOT NULL,
      compared_translation_slug TEXT NOT NULL,
      comparison_type TEXT NOT NULL,
      details_ar TEXT,
      base_text TEXT,
      compared_text TEXT,
      source_url TEXT,
      reviewed_at DATETIME,
      UNIQUE(book_code, chapter, verse, base_translation_slug, compared_translation_slug),
      FOREIGN KEY (book_code) REFERENCES bible_books(code)
    );
  `);

  // Migrate databases created before the scholarly catalog was added.
  _ensureColumn(db, 'bible_translations', 'site_scope', "TEXT DEFAULT 'both'");
  _ensureColumn(db, 'bible_collections', 'site_scope', "TEXT DEFAULT 'both'");

  // Seed collections
  const insertCollection = db.prepare(`
    INSERT OR IGNORE INTO bible_collections (slug, name_ar, name_en, category, display_order, site_scope)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const collections = [
    ['old-testament',       'العهد القديم',              'Old Testament',       'ot',          1, 'both'],
    ['new-testament',       'العهد الجديد',              'New Testament',       'nt',          2, 'both'],
    ['deuterocanon',        'الأسفار القانونية الثانية', 'Deuterocanonical',    'deutero',     3, 'bible'],
    ['apocrypha',           'نصوص أبوكريفية',            'Apocrypha',           'apocrypha',   4, 'bible'],
    ['ethiopian-canon',     'القانون والتقليد الإثيوبي', 'Ethiopian Tradition', 'ethiopian',   5, 'bible'],
    ['textual-traditions',  'التقاليد النصية الموازية', 'Textual Traditions',  'tradition',   6, 'bible'],
    ['church-writings',     'الكتابات الكنسية القديمة', 'Early Church Writings','church',     7, 'bible'],
    ['pseudepigrapha',      'المنحولات والرؤى القديمة', 'Pseudepigrapha',      'pseudepigrapha',8, 'bible'],
  ];
  for (const c of collections) insertCollection.run(...c);
  db.prepare("UPDATE bible_collections SET site_scope = 'both' WHERE slug IN ('old-testament','new-testament')").run();
  db.prepare("UPDATE bible_collections SET site_scope = 'bible' WHERE slug NOT IN ('old-testament','new-testament')").run();
  db.prepare("UPDATE bible_translations SET site_scope = 'bible' WHERE slug IN ('ar-jesuit-dc','ar-apocrypha')").run();

  // Seed books (66 canonical + deuterocanon)
  _seedBooks(db);
  _seedExpansionCatalog(db);

  console.log('[Bible] Schema initialized.');
}

function _ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function _seedExpansionCatalog(db) {
  const colMap = Object.fromEntries(
    db.prepare('SELECT id, slug FROM bible_collections').all().map((row) => [row.slug, row.id])
  );
  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO bible_books
      (code, name_ar, name_en, abbreviation_ar, collection_id, canonical_order, chapter_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAlias = db.prepare('INSERT OR IGNORE INTO bible_book_aliases (book_code, alias) VALUES (?, ?)');
  const insertMetadata = db.prepare(`
    INSERT INTO bible_book_metadata
      (book_code, canonicality_status, textual_tradition, original_language, text_status,
       arabic_status, english_status, future_translation_status, summary_ar, source_name, source_url, source_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(book_code) DO UPDATE SET
      canonicality_status=excluded.canonicality_status,
      textual_tradition=excluded.textual_tradition,
      original_language=excluded.original_language,
      summary_ar=excluded.summary_ar,
      source_name=excluded.source_name,
      source_url=excluded.source_url,
      source_notes=excluded.source_notes,
      updated_at=CURRENT_TIMESTAMP
  `);
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO bible_book_sources
      (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const records = [
    // Textual traditions: works are deliberately separate from the canonical books.
    ['SAM', 'التوراة السامرية', 'Samaritan Pentateuch', 'ت.سام', 'textual-traditions', 1, 5, 'sam', 'العربية الأكاديمية، ثم الإنجليزية', 'الكتاب النصي الموازي لأسفار موسى الخمسة، وليس سفراً سادساً.'],
    ['LXX', 'السُّبعينية', 'Septuagint', 'سبع', 'textual-traditions', 2, 0, 'lxx', 'الإنجليزية ثم اليونانية', 'تقليد ترجمي يوناني مرتبط بأسفار العهد القديم وإضافاته.'],
    ['PESH', 'البيشيطا السريانية', 'Peshitta', 'بيش', 'textual-traditions', 3, 0, 'peshitta', 'السريانية والإنجليزية', 'تقليد سرياني موازٍ، ويختلف نطاق العهد الجديد فيه عن بعض القوائم الشائعة.'],
    ['VUL', 'الفولجاتا اللاتينية', 'Latin Vulgate', 'فول', 'textual-traditions', 4, 0, 'vulgate', 'اللاتينية والإنجليزية', 'طبعة لاتينية موازية مع ضبط اختلافات تسمية عزرا والملاحق.'],
    // Ethiopian tradition.
    ['1MCE', 'المكابيون الإثيوبي الأول', 'Ethiopian Maccabees I', 'مك-إ1', 'ethiopian-canon', 1, 0, 'ethiopic', 'الجعزية', 'عمل إثيوبي مستقل لا يساوي المكابيين اليونانية آلياً.'],
    ['2MCE', 'المكابيون الإثيوبي الثاني', 'Ethiopian Maccabees II', 'مك-إ2', 'ethiopian-canon', 2, 0, 'ethiopic', 'الجعزية', 'عمل إثيوبي مستقل.'],
    ['3MCE', 'المكابيون الإثيوبي الثالث', 'Ethiopian Maccabees III', 'مك-إ3', 'ethiopian-canon', 3, 0, 'ethiopic', 'الجعزية', 'عمل إثيوبي مستقل.'],
    ['EZRS', 'عزرا سوتوئيل', 'Ezra Sutuel', 'عز-س', 'ethiopian-canon', 4, 0, 'ethiopic', 'الجعزية', 'لا يُدمج مع عزرا الثاني أو عزرا الرابع بسبب اختلاف العمل والتسمية.'],
    ['TAGS', 'تغسات', 'Tegsat', 'تغ', 'ethiopian-canon', 5, 0, 'ethiopic', 'الجعزية', 'مدخل إثيوبي يحتاج إلى فحص الطبعة والوحدات قبل النشر.'],
    ['SIRE', 'يشوع بن سيراخ الإثيوبي', 'Ethiopic Sirach', 'سي-إ', 'ethiopian-canon', 6, 0, 'ethiopic', 'الجعزية/الأمهرية بحسب الطبعة', 'طبعة إثيوبية مرتبطة بابن سيراخ، ولا تستبدل النص اليوناني.'],
    ['JOSB', 'يوسف بن غوريون الإثيوبي', 'Josephus Ben Gorion', 'يوس-غ', 'ethiopian-canon', 7, 0, 'ethiopic', 'الجعزية', 'نص تاريخي إثيوبي يحتاج إلى وصف مستقل ولا ينسب تلقائياً إلى يوسيفوس.'],
    ['SIN', 'السينودس الإثيوبي', 'Ethiopian Synodos', 'سين', 'ethiopian-canon', 8, 0, 'ethiopic', 'الجعزية', 'مجموعة كتب كنسية، ستقسم إلى وحدات مستقلة عند إدخال النص.'],
    ['COV1', 'كتاب العهد الأول', 'Book of Covenant I', 'عهد1', 'ethiopian-canon', 9, 0, 'ethiopic', 'الجعزية', 'كتاب كنسي إثيوبي مستقل.'],
    ['COV2', 'كتاب العهد الثاني', 'Book of Covenant II', 'عهد2', 'ethiopian-canon', 10, 0, 'ethiopic', 'الجعزية', 'كتاب كنسي إثيوبي مستقل.'],
    ['CLE-ETH', 'إكليمندس الإثيوبي', 'Ethiopic Clement', 'إك-إ', 'ethiopian-canon', 11, 0, 'ethiopic', 'الجعزية', 'لا يدمج مع رسالة إكليمندس الأولى أو الثانية دون تحديد الشاهد.'],
    ['DID-ETH', 'الدسقولية الإثيوبية', 'Ethiopic Didascalia', 'دس-إ', 'church-writings', 1, 0, 'ethiopic', 'الجعزية', 'صيغة إثيوبية موسعة أو مختلفة، تعرض منفصلة عن الدسقولية السريانية والعربية واللاتينية.'],
    // Ancient church writings.
    ['DIDAS', 'الدسقولية الرسولية', 'Didascalia Apostolorum', 'دسق', 'church-writings', 2, 0, 'didascalia', 'السريانية واليونانية واللاتينية والعربية', 'كتاب نظام كنسي قديم، وليس سفراً من أسفار العهد الجديد.'],
    ['DIAT', 'دياتسرون تاتيان', 'Diatessaron', 'ديات', 'church-writings', 3, 0, 'syriac', 'السريانية', 'إنجيل توفيقي يعرض كشاهد أدبي مستقل.'],
    ['CLE1', 'رسالة إكليمندس الأولى', '1 Clement', 'إك1', 'church-writings', 4, 0, 'greek', 'اليونانية', 'كتابة كنسية مبكرة.'],
    ['CLE2', 'رسالة إكليمندس الثانية', '2 Clement', 'إك2', 'church-writings', 5, 0, 'greek', 'اليونانية', 'كتابة كنسية مبكرة.'],
    // Jewish pseudepigrapha and related works.
    ['MOS', 'صعود موسى', 'Assumption of Moses / Testament of Moses', 'ص-م', 'pseudepigrapha', 1, 0, 'moses', 'اللاتينية مع إعادة بناء نقدية', 'يُحفظ أساساً في شاهد لاتيني واحد، وتختلف تسمية العمل وتكوينه في الدراسات.'],
    ['ENO2', 'أخنوخ الثاني', '2 Enoch', 'أخ2', 'pseudepigrapha', 2, 0, 'slavonic', 'السلافية الكنسية', 'نص منحول مستقل عن أخنوخ الأول.'],
    ['ENO3', 'أخنوخ الثالث', '3 Enoch', 'أخ3', 'pseudepigrapha', 3, 0, 'hebrew', 'العبرية', 'نص رؤيوي يهودي متأخر.'],
    ['GIANTS', 'سفر العمالقة', 'Book of Giants', 'عمال', 'pseudepigrapha', 4, 0, 'aramaic', 'الآرامية مع شواهد قمران', 'نص مجزأ يعتمد على شواهد متعددة.'],
    ['2BAR', 'باروخ الثاني', '2 Baruch', 'با2', 'pseudepigrapha', 5, 0, 'syriac', 'السريانية', 'رؤيا يهودية مستقلة عن باروخ الكتابي.'],
    ['3BAR', 'باروخ الثالث', '3 Baruch', 'با3', 'pseudepigrapha', 6, 0, 'greek', 'اليونانية', 'رؤيا مستقلة.'],
    ['ABR', 'رؤيا إبراهيم', 'Apocalypse of Abraham', 'رؤا-إ', 'pseudepigrapha', 7, 0, 'slavonic', 'السلافية', 'نص رؤيوي يهودي محفوظ في تقليد لاحق.'],
    ['AABR', 'وصية إبراهيم', 'Testament of Abraham', 'وص-إ', 'pseudepigrapha', 8, 0, 'greek', 'اليونانية', 'عمل أدبي مستقل.'],
    ['TADAM', 'حياة آدم وحواء', 'Life of Adam and Eve', 'ح-آ', 'pseudepigrapha', 9, 0, 'greek', 'اليونانية واللاتينية', 'نص متعدد الصيغ واللغات.'],
    ['TJOB', 'وصية أيوب', 'Testament of Job', 'وص-أي', 'pseudepigrapha', 10, 0, 'greek', 'اليونانية', 'عمل منحول مستقل.'],
    ['TSOL', 'وصية سليمان', 'Testament of Solomon', 'وص-س', 'pseudepigrapha', 11, 0, 'greek', 'اليونانية', 'عمل منحول مستقل.'],
    ['T12', 'وصايا الآباء الاثني عشر', 'Testaments of the Twelve Patriarchs', 'وص12', 'pseudepigrapha', 12, 0, 'greek', 'اليونانية', 'مجموعة وصايا، لا سفر واحداً بسيطاً.'],
    ['JOSEPH', 'يوسف وأسنات', 'Joseph and Aseneth', 'يوس-أ', 'pseudepigrapha', 13, 0, 'greek', 'اليونانية', 'رواية دينية يهودية.'],
    ['SIBYLL', 'أقوال العرافات', 'Sibylline Oracles', 'عراف', 'pseudepigrapha', 14, 0, 'greek', 'اليونانية', 'مجموعة مركبة متعددة الطبقات.'],
    ['APOEZ', 'رؤيا حزقيال', 'Apocryphon of Ezekiel', 'رؤ-حز', 'pseudepigrapha', 15, 0, 'aramaic', 'الآرامية مع شواهد ومقتطفات', 'النص المتاح مجزأ أو محفوظ في اقتباسات.'],
    ['ARIST', 'رسالة أريستاس', 'Letter of Aristeas', 'أري', 'pseudepigrapha', 16, 0, 'greek', 'اليونانية', 'عمل يهودي هلنستي مرتبط بقصة السبعينية.'],
    // Christian apocrypha catalog.
    ['DID', 'الديداخي (تعليم الرسل)', 'Didache', 'ديد', 'apocrypha', 10, 0, 'greek', 'اليونانية', 'تعليم كنسي مبكر، ويعرض منفصلاً عن الدسقولية.'],
    ['GTH', 'إنجيل توما', 'Gospel of Thomas', 'توما', 'apocrypha', 11, 0, 'coptic', 'القبطية واليونانية', 'نص أقوال محفوظ في تقاليد قبطية ويونانية.'],
    ['PJA', 'إنجيل يعقوب التمهيدي', 'Protoevangelium of James', 'يع-ت', 'apocrypha', 12, 0, 'greek', 'اليونانية', 'رواية طفولة أبوكريفية.'],
    ['BARN', 'رسالة برنابا', 'Epistle of Barnabas', 'برن', 'church-writings', 6, 0, 'greek', 'اليونانية', 'كتابة مسيحية مبكرة، لا تدمج مع الدسقولية.'],
    ['PSOL', 'مزامير سليمان', 'Psalms of Solomon', 'م-سل', 'pseudepigrapha', 17, 0, 'greek', 'اليونانية', 'مجموعة مزامير يهودية منسوبة إلى سليمان.'],
    ['ODSO', 'أوديات سليمان', 'Odes of Solomon', 'أود', 'church-writings', 7, 0, 'syriac', 'السريانية واليونانية', 'أناشيد مسيحية مبكرة متعددة الشواهد.'],
    ['GNIC', 'إنجيل نيقوديموس (أعمال بيلاطس)', 'Gospel of Nicodemus', 'نيقو', 'apocrypha', 13, 0, 'greek', 'اليونانية واللاتينية', 'نص مركب من أعمال بيلاطس وأجزاء لاحقة.'],
    ['HERM', 'راعي هرماس', 'Shepherd of Hermas', 'هرماس', 'church-writings', 8, 0, 'greek', 'اليونانية واللاتينية', 'كتابة كنسية مبكرة ذات شواهد متعددة.'],
    ['ASC', 'صعود إشعياء', 'Ascension of Isaiah', 'ص-إش', 'pseudepigrapha', 18, 0, 'ethiopic', 'الجعزية مع شواهد أقدم', 'عمل مركب محفوظ بصورة بارزة في التقليد الإثيوبي.'],
    ['GPE', 'إنجيل بطرس', 'Gospel of Peter', 'بطرس-أ', 'apocrypha', 30, 0, 'greek', 'اليونانية مع شواهد مجزأة', 'نص مسيحي أبوكريفي مجزأ.'],
    ['GJUD', 'إنجيل يهوذا', 'Gospel of Judas', 'يهوذا-أ', 'apocrypha', 31, 0, 'coptic', 'القبطية', 'نص غنوصي محفوظ في مخطوط قبطي.'],
    ['GMA', 'إنجيل مريم', 'Gospel of Mary', 'مريم-أ', 'apocrypha', 32, 0, 'coptic', 'القبطية واليونانية', 'النص محفوظ بصورة مجزأة.'],
    ['GTINF', 'إنجيل طفولة توما', 'Infancy Gospel of Thomas', 'طف-تو', 'apocrypha', 33, 0, 'greek', 'اليونانية ولغات لاحقة', 'نص طفولة أبوكريفي مستقل.'],
    ['APOL', 'أعمال بولس', 'Acts of Paul', 'أع-بول', 'apocrypha', 34, 0, 'greek', 'اليونانية', 'نص مركب وشواهده متعددة.'],
    ['APET', 'أعمال بطرس', 'Acts of Peter', 'أع-بط', 'apocrypha', 35, 0, 'greek', 'اليونانية واللاتينية', 'نص أبوكريفي متعدد الشواهد.'],
    ['APEP', 'رؤيا بطرس', 'Apocalypse of Peter', 'رؤ-بط', 'apocrypha', 36, 0, 'greek', 'اليونانية والإثيوبية', 'شواهد متعددة ولا تدمج آلياً.'],
  ];

  const sourceDefaults = {
    sam: ['Biblia Arabica', 'https://biblia-arabica.com/bibl/IZFNRHBX'],
    lxx: ['eBible Brenton Septuagint', 'https://ebible.org/eng-Brenton/'],
    peshitta: ['Peshitta Institute', 'https://www.peshitta.org/'],
    vulgate: ['Biblia Sacra Vulgata', 'https://search.biblegateway.com/versions/Biblia-Sacra-Vulgata-VULGATE/'],
    ethiopic: ['Ethiopian Orthodox Tewahedo Church', 'https://ethiopianorthodox.org/english/canonical/books.html'],
    didascalia: ['Online Critical Pseudepigrapha / NASSCAL', 'https://pseudepigrapha.org/'],
    moses: ['Online Critical Pseudepigrapha', 'https://pseudepigrapha.org/'],
    slavonic: ['Online Critical Pseudepigrapha', 'https://pseudepigrapha.org/'],
    hebrew: ['Online Critical Pseudepigrapha', 'https://pseudepigrapha.org/'],
    aramaic: ['Online Critical Pseudepigrapha', 'https://pseudepigrapha.org/'],
    syriac: ['Online Critical Pseudepigrapha', 'https://pseudepigrapha.org/'],
    greek: ['NASSCAL e-Clavis Christian Apocrypha', 'https://www.nasscal.com/e-clavis-christian-apocrypha/'],
    coptic: ['NASSCAL e-Clavis Christian Apocrypha', 'https://www.nasscal.com/e-clavis-christian-apocrypha/']
  };

  for (const [code, nameAr, nameEn, abbr, collection, order, chapterCount, tradition, language, summary] of records) {
    insertBook.run(code, nameAr, nameEn, abbr, colMap[collection], order, chapterCount);
    insertAlias.run(code, nameAr);
    insertAlias.run(code, nameEn);
    const [sourceName, sourceUrl] = sourceDefaults[tradition] || ['مصدر يحتاج إلى تثبيت', null];
    insertMetadata.run(
      code,
      collection === 'textual-traditions' ? 'textual_witness' : 'non_canonical',
      tradition,
      language,
      'not_imported',
      'planned',
      'planned',
      'planned',
      summary,
      sourceName,
      sourceUrl,
      'هذا سجل فهرسة أولي. لا يعرض على أنه نص كامل حتى تُستورد وحداته وتُراجع مصادره.'
    );
    insertSource.run(code, sourceName, sourceName, language, 'catalog_only', 'catalog', sourceUrl, summary);
  }

  const aliases = [
    ['2ES', 'عزرا الرابع'], ['2ES', 'رؤيا عزرا'], ['2ES', '4 Ezra'], ['2ES', '2 Esdras'],
    ['MOS', 'عهد موسى'], ['MOS', 'وصية موسى'], ['MOS', 'Testament of Moses'],
    ['SAM', 'الأسفار الخمسة السامرية'], ['SAM', 'Samaritan Pentateuch'],
    ['DIDAS', 'الدسقولية'], ['DIDAS', 'الدسقولية الرسولية'], ['DIDAS', 'Didascalia Apostolorum'],
    ['DID-ETH', 'الدسقولية الإثيوبية'], ['DID-ETH', 'Ethiopic Didascalia'],
    ['EZRS', 'عزرا سوتوئيل'], ['EZRS', 'Ezra Sutuel']
  ];
  for (const [code, alias] of aliases) insertAlias.run(code, alias);

  // Existing seeds also need provenance metadata.
  const existing = db.prepare(`
    SELECT bb.code, bb.name_ar, bb.name_en, bc.slug
    FROM bible_books bb JOIN bible_collections bc ON bc.id = bb.collection_id
    WHERE bc.site_scope = 'bible'
  `).all();
  for (const book of existing) {
    const isDeuterocanon = book.slug === 'deuterocanon';
    const sourceName = isDeuterocanon ? 'موقع الأنبا تكلا — الترجمة اليسوعية' : 'فهرس النصوص المنحولة والتقاليد القديمة';
    const sourceUrl = isDeuterocanon
      ? 'https://st-takla.org/pub_Deuterocanon/Deuterocanon-Apocrypha_El-Asfar_El-Kanoneya_El-Tanya__0-index_.html'
      : 'https://pseudepigrapha.org/';
    insertMetadata.run(
      book.code,
      isDeuterocanon ? 'deuterocanonical' : 'non_canonical',
      book.slug,
      isDeuterocanon ? 'العربية' : 'غير محددة',
      'cataloged',
      isDeuterocanon ? 'available' : 'pending_review',
      'pending_review',
      'planned',
      `مدخل موسع: ${book.name_ar}. تُراجع اللغة والمصدر والطبعة قبل استكمال الإدخال.`,
      sourceName,
      sourceUrl,
      'مُضاف إلى كتالوج موقع الكتاب المقدس فقط.'
    );
    insertSource.run(
      book.code,
      sourceName,
      sourceName,
      isDeuterocanon ? 'العربية' : 'غير محددة',
      isDeuterocanon ? 'available' : 'catalog_only',
      isDeuterocanon ? 'html' : 'catalog',
      sourceUrl,
      `المصدر المسجل للعمل: ${book.name_ar}`
    );
  }

  // لا نعلن توفر نص لمجرد وجوده في الفهرس؛ الحالة تُشتق من الوحدات الموجودة فعلياً.
  db.prepare(`
    UPDATE bible_book_metadata
    SET text_status = CASE WHEN EXISTS (
          SELECT 1 FROM bible_verses bv
          JOIN bible_translations bt ON bt.id = bv.translation_id
          WHERE bv.book_code = bible_book_metadata.book_code
            AND bt.is_active = 1 AND (bt.site_scope = 'both' OR bt.site_scope = 'bible')
        ) THEN 'complete' ELSE 'not_imported' END,
        arabic_status = CASE WHEN EXISTS (
          SELECT 1 FROM bible_verses bv
          JOIN bible_translations bt ON bt.id = bv.translation_id
          WHERE bv.book_code = bible_book_metadata.book_code
            AND bt.language = 'ar' AND bt.is_active = 1
            AND (bt.site_scope = 'both' OR bt.site_scope = 'bible')
        ) THEN 'available'
        WHEN book_code IN (SELECT bb.code FROM bible_books bb JOIN bible_collections bc ON bc.id = bb.collection_id WHERE bc.slug = 'deuterocanon')
        THEN 'planned' ELSE arabic_status END,
        english_status = CASE WHEN EXISTS (
          SELECT 1 FROM bible_verses bv
          JOIN bible_translations bt ON bt.id = bv.translation_id
          WHERE bv.book_code = bible_book_metadata.book_code
            AND bt.language = 'en' AND bt.is_active = 1
            AND (bt.site_scope = 'both' OR bt.site_scope = 'bible')
        ) THEN 'available' ELSE english_status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE book_code IN (SELECT bb.code FROM bible_books bb JOIN bible_collections bc ON bc.id = bb.collection_id WHERE bc.site_scope = 'bible')
  `).run();
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
