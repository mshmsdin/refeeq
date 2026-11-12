// Bible Module Schema — adds tables to existing library.db
// Run via: import { initBibleSchema } from './bible_schema.js'; initBibleSchema();

import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

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
  db.prepare("UPDATE bible_collections SET site_scope = 'both' WHERE slug IN ('old-testament','new-testament','pseudepigrapha')").run();
  db.prepare("UPDATE bible_collections SET site_scope = 'bible' WHERE slug NOT IN ('old-testament','new-testament','pseudepigrapha')").run();
  db.prepare("UPDATE bible_translations SET site_scope = 'bible' WHERE slug IN ('ar-jesuit-dc','ar-apocrypha')").run();

  // Seed books (66 canonical + deuterocanon)
  _seedBooks(db);
  _seedExpansionCatalog(db);

  // Keep the fragmentary Henning translation out of distribution until EU reuse rights are established.
  const giantsRightsNote = 'ترجمة وليم ب. هننغ المنشورة سنة 1943 للشواهد المانوية المجزأة. يصف موقع المصدر الترجمة بأنها ملك عام دون تحديد النطاق الجغرافي؛ توفي هننغ سنة 1967، لذلك لا يُعتمد هذا الادعاء وحده لإعادة النشر في الاتحاد الأوروبي. يلزم إثبات إذن صالح أو انتهاء مدة الحماية قبل إعادة التفعيل.';
  db.prepare(`
    UPDATE bible_translations
    SET is_active=0, source_type='rights-unresolved-eu', source_notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE slug='en-henning-manichaean-book-giants'
  `).run(giantsRightsNote);
  db.prepare(`
    UPDATE bible_book_metadata
    SET text_status='partial',
        english_status=CASE WHEN EXISTS (
          SELECT 1 FROM bible_verses bv
          JOIN bible_translations bt ON bt.id=bv.translation_id
          WHERE bv.book_code='GIANTS' AND bt.language='en' AND bt.is_active=1
            AND (bt.site_scope='both' OR bt.site_scope='bible')
        ) THEN 'available' ELSE 'planned' END,
        source_name='W. B. Henning English Manichaean Book of Giants',
        source_url='https://othergospels.com/2giants/henning.json',
        source_notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE book_code='GIANTS'
  `).run(giantsRightsNote);

  const qezraShortRightsNote = 'ترجمة الرواية الأرمنية B أُعدت عن تفريغ حديث متعدد الشواهد؛ يذكر إشعار ذلك المصدر حقوق ماتيناداران ومايكل ستون، ولم يثبت إذن إعادة نشر التفريغ أو الترجمة المبنية عليه. السجل محفوظ محلياً لكنه معطل وغير منشور إلى حين مراجعة صورة طبعة ١٧٣٠ وإعداد ترجمة مستقلة مأذونة.';
  db.prepare(`
    UPDATE bible_translations
    SET is_active=0, source_notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE slug='en-questions-ezra-arm-short'
  `).run(qezraShortRightsNote);

  const narmosReviewNote = 'تفريغ مشروع النصوص النقدية المفتوحة المنسوب إلى طبعة فاسيلييف ١٨٩٣. يحوي ملف المصدر ١٥٤ خانة؛ الخانتان ١٥ و١٢٤ لا تحملان نصاً يونانياً: علامة حاشية «2.» ونقطة منفردة، لذا يعرض المستورد ١٥٢ وحدة نصية من دون إسقاط كلمات. وبالمقابلة على صور الصفحات ٢٥٧–٢٦٤ ظهرت أخطاء تفريغ أخرى في مواضع كثيرة؛ الشاهد جزئي وقيد ضبط النص، وليس ترجمة. يتيح ترخيص المشاع الإبداعي بإسناد ٤.٠ مشاركة النص وتعديله وترجمته مع ذكر المشروع ومحرر الطبعة.';
  db.prepare(`
    UPDATE bible_book_metadata
    SET text_status='partial', english_status='planned', source_notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE book_code='NARMOS'
  `).run(narmosReviewNote);
  db.prepare(`
    UPDATE bible_translations SET source_notes=?, updated_at=CURRENT_TIMESTAMP
    WHERE slug='grc-ocp-narrative-moses-joshua'
  `).run(narmosReviewNote);
  db.prepare(`
    UPDATE bible_book_sources SET notes=?
    WHERE book_code='NARMOS' AND language='grc'
  `).run(narmosReviewNote);

  // Repair known stale import artifacts against the checked source text.
  const legacyTextFixes = [
    ['en-odeberg-3-enoch', 'ENO3', 4, 7, text => text.replace('&lt;', '<')],
    ['en-wikisource-testament-solomon', 'TSOL', 1, 31, text => text.replace(' [ 52 ] , ​ [ 52 ] thou', ' [ 52 ] , ​ thou')],
    ['en-wikisource-testament-solomon', 'TSOL', 1, 47, text => text.replace('turn them to … . [ 71 ]', 'turn them to …. [ 71 ]')],
    ['en-wikisource-testament-solomon', 'TSOL', 1, 126, text => text.replace('Ameleouth — I then', 'Ameleouth —I then')],
    ['en-wikisource-testament-solomon', 'TSOL', 1, 129, text => text.replace('​ [ 141 ] 128.', '​ 128.')],
  ];
  const getLegacyVerse = db.prepare(`
    SELECT bv.id, bv.text FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.slug=? AND bv.book_code=? AND bv.chapter=? AND bv.verse=?
  `);
  const updateLegacyVerse = db.prepare('UPDATE bible_verses SET text=?, search_text=? WHERE id=?');
  for (const [slug, bookCode, chapter, verse, fixText] of legacyTextFixes) {
    const row = getLegacyVerse.get(slug, bookCode, chapter, verse);
    if (!row) continue;
    const text = fixText(row.text);
    if (text !== row.text) updateLegacyVerse.run(text, normalizeArabicText(text), row.id);
  }
  const tadam = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('en-charles-life-adam-eve');
  if (tadam) {
    const chapter29 = db.prepare(`
      SELECT verse, text, source_url FROM bible_verses
      WHERE translation_id=? AND book_code='TADAM' AND chapter=29 ORDER BY verse
    `).all(tadam.id);
    const brokenVerse2 = chapter29.find((row) => row.verse === 2);
    const shiftedVerse3 = chapter29.find((row) => row.verse === 3);
    if (chapter29.length === 9 && brokenVerse2?.text.includes('/td') &&
        shiftedVerse3?.text.startsWith('The Lord will appear in a flame of fire.')) {
      const sourceUrl = shiftedVerse3.source_url;
      const repairChapter29 = db.transaction(() => {
        for (let verse = 9; verse >= 3; verse -= 1) {
          db.prepare(`
            UPDATE bible_verses SET verse=verse+1
            WHERE translation_id=? AND book_code='TADAM' AND chapter=29 AND verse=?
          `).run(tadam.id, verse);
        }
        const correctedVerse2 = 'Listen, my son Seth, even to the rest of the secrets and sacraments that shall be, which were revealed to me, when I had eaten of the tree of the knowledge, and knew and perceived what will come to pass in this age;';
        db.prepare(`
          UPDATE bible_verses SET text=?, search_text=?, imported_at=CURRENT_TIMESTAMP
          WHERE translation_id=? AND book_code='TADAM' AND chapter=29 AND verse=2
        `).run(correctedVerse2, normalizeArabicText(correctedVerse2), tadam.id);
        const missingVerse3 = 'What God intends to do to his creation, the race of men, [in the times to come].';
        db.prepare(`
          INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url)
          VALUES (?, 'TADAM', 29, 3, ?, ?, ?)
        `).run(tadam.id, missingVerse3, normalizeArabicText(missingVerse3), sourceUrl);
      });
      repairChapter29();
    }
  }
  db.prepare(`
    DELETE FROM bible_verses
    WHERE translation_id=(SELECT id FROM bible_translations WHERE slug='en-charles-2-baruch')
      AND book_code='2BAR' AND chapter=37 AND verse=2
      AND text='And I indeed awoke and arose. 38-40. Interpretation of the Vision'
  `).run();

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
  const syncBookCatalog = db.prepare(`
    UPDATE bible_books SET name_ar=?, name_en=?, abbreviation_ar=?, collection_id=?, canonical_order=?,
      chapter_count=CASE WHEN ?>0 THEN ? ELSE chapter_count END
    WHERE code=?
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
      original_language=CASE WHEN bible_book_metadata.text_status IN ('complete','partial') THEN bible_book_metadata.original_language ELSE excluded.original_language END,
      summary_ar=excluded.summary_ar,
      source_name=CASE WHEN bible_book_metadata.text_status IN ('complete','partial') THEN bible_book_metadata.source_name ELSE excluded.source_name END,
      source_url=CASE WHEN bible_book_metadata.text_status IN ('complete','partial') THEN bible_book_metadata.source_url ELSE excluded.source_url END,
      source_notes=CASE WHEN bible_book_metadata.text_status IN ('complete','partial') THEN bible_book_metadata.source_notes ELSE excluded.source_notes END,
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
    ['SAM-GEN', 'التكوين السامري', 'Samaritan Genesis', 'ت.سام-تك', 'textual-traditions', 2, 50, 'sam', 'الإنجليزية، ثم العربية', 'قسم التكوين من التوراة السامرية؛ يعرض كشاهد موازٍ للتكوين لا كسفر مستقل جديد.'],
    ['SAM-EXO', 'الخروج السامري', 'Samaritan Exodus', 'ت.سام-خر', 'textual-traditions', 3, 40, 'sam', 'الإنجليزية، ثم العربية', 'قسم الخروج من التوراة السامرية؛ يعرض كشاهد موازٍ للخروج.'],
    ['SAM-LEV', 'اللاويين السامري', 'Samaritan Leviticus', 'ت.سام-لا', 'textual-traditions', 4, 27, 'sam', 'الإنجليزية، ثم العربية', 'قسم اللاويين من التوراة السامرية؛ يعرض كشاهد موازٍ للاويين.'],
    ['SAM-NUM', 'العدد السامري', 'Samaritan Numbers', 'ت.سام-عد', 'textual-traditions', 5, 36, 'sam', 'الإنجليزية، ثم العربية', 'قسم العدد من التوراة السامرية؛ يعرض كشاهد موازٍ للعدد.'],
    ['SAM-DEU', 'التثنية السامرية', 'Samaritan Deuteronomy', 'ت.سام-تث', 'textual-traditions', 6, 34, 'sam', 'الإنجليزية، ثم العربية', 'قسم التثنية من التوراة السامرية؛ يعرض كشاهد موازٍ للتثنية.'],
    ['LXX', 'السُّبعينية', 'Septuagint', 'سبع', 'textual-traditions', 2, 0, 'lxx', 'الإنجليزية ثم اليونانية', 'تقليد ترجمي يوناني مرتبط بأسفار العهد القديم وإضافاته.'],
    ['PESH', 'البيشيطا السريانية', 'Peshitta', 'بيش', 'textual-traditions', 3, 0, 'peshitta', 'السريانية والإنجليزية', 'تقليد سرياني موازٍ، ويختلف نطاق العهد الجديد فيه عن بعض القوائم الشائعة.'],
    ['VUL', 'الفولجاتا اللاتينية', 'Latin Vulgate', 'فول', 'textual-traditions', 4, 0, 'vulgate', 'اللاتينية والإنجليزية', 'طبعة لاتينية موازية مع ضبط اختلافات تسمية عزرا والملاحق.'],
    // Ethiopian tradition.
    ['1MCE', 'المكابيون الإثيوبي الأول', 'Ethiopian Maccabees I', 'مك-إ1', 'ethiopian-canon', 1, 0, 'ethiopic', 'الجعزية', 'عمل إثيوبي مستقل لا يساوي المكابيين اليونانية آلياً.'],
    ['2MCE', 'المكابيون الإثيوبي الثاني', 'Ethiopian Maccabees II', 'مك-إ2', 'ethiopian-canon', 2, 0, 'ethiopic', 'الجعزية', 'عمل إثيوبي مستقل.'],
    ['3MCE', 'المكابيون الإثيوبي الثالث', 'Ethiopian Maccabees III', 'مك-إ3', 'ethiopian-canon', 3, 0, 'ethiopic', 'الجعزية', 'عمل إثيوبي مستقل.'],
    ['EZRS', 'عزرا سوتوئيل', 'Ezra Sutuel', 'عز-س', 'ethiopian-canon', 4, 0, 'ethiopic', 'الجعزية', 'يعرض منفصلاً عن عزرا الثاني كاملاً؛ يتاح شاهد إنجليزي موازٍ للأصحاحات 3–14 المقابلة لمتن 4 عزرا، وليس نصاً جعزياً.'],
    ['TAGS', 'تغسات (أمثال ٢٥–٣١)', 'Tegsat / Proverbs 25–31', 'تغ', 'ethiopian-canon', 5, 7, 'ethiopic', 'نص موازٍ عربي من ترجمة سميث وفاندايك؛ ليس شاهداً جعزياً', 'تقسيم إثيوبي تقليدي لآخر أمثال سليمان، ويعرض هنا النص العربي المقابل للفصول ٢٥–٣١ من أمثال سميث وفاندايك؛ لم يُستورد نص جعزي لهذا المدخل بعد.'],
    ['SIRE', 'يشوع بن سيراخ الإثيوبي', 'Ethiopic Sirach', 'سي-إ', 'ethiopian-canon', 6, 0, 'ethiopic', 'الجعزية/الأمهرية بحسب الطبعة', 'يتاح شاهد إنجليزي موازٍ من نسخة الملك جيمس القانونية العامة، لا يمثل النص الجعزي ولا يستبدل مراجعة ابن سيراخ الإثيوبية.'],
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
    ['MOS', 'وصية موسى (المعروفة تقليدياً بصعود موسى)', 'Testament of Moses / Assumption of Moses', 'وص-م', 'pseudepigrapha', 1, 0, 'moses', 'اللاتينية بوسيط يوناني عن أصل سامي محتمل', 'النص المتبقي اثنا عشر إصحاحاً من مخطوط لاتيني واحد، وينقطع قبل الخاتمة؛ لا يحفظ مشهد صعود موسى نفسه. اسم «صعود موسى» تقليدي ومختلف عليه في الدراسات.'],
    ['ENO2', 'أخنوخ الثاني', '2 Enoch', 'أخ2', 'pseudepigrapha', 2, 0, 'slavonic', 'السلافية الكنسية', 'نص منحول مستقل عن أخنوخ الأول.'],
    ['ENO3', 'أخنوخ الثالث', '3 Enoch', 'أخ3', 'pseudepigrapha', 3, 0, 'hebrew', 'العبرية', 'نص رؤيوي يهودي متأخر.'],
    ['GIANTS', 'سفر العمالقة', 'Book of Giants', 'عمال', 'pseudepigrapha', 4, 0, 'aramaic', 'الآرامية مع شواهد قمران', 'نص مجزأ يعتمد على شواهد متعددة.'],
    ['2BAR', 'باروخ الثاني', '2 Baruch', 'با2', 'pseudepigrapha', 5, 0, 'syriac', 'السريانية', 'رؤيا يهودية مستقلة عن باروخ الكتابي.'],
    ['3BAR', 'باروخ الثالث', '3 Baruch', 'با3', 'pseudepigrapha', 6, 0, 'greek', 'اليونانية', 'رؤيا مستقلة.'],
    ['4BAR', 'باروخ الرابع (بقيّة كلمات إرميا)', '4 Baruch', 'با4', 'pseudepigrapha', 6.5, 0, 'greek', 'اليونانية', 'الرواية اليونانية من تتمة إرميا؛ تختلف عن الرواية الحبشية في الفصل التاسع.'],
    ['ABR', 'رؤيا إبراهيم', 'Apocalypse of Abraham', 'رؤا-إ', 'pseudepigrapha', 7, 0, 'slavonic', 'السلافية', 'نص رؤيوي يهودي محفوظ في تقليد لاحق.'],
    ['AABR', 'وصية إبراهيم', 'Testament of Abraham', 'وص-إ', 'pseudepigrapha', 8, 0, 'greek', 'اليونانية', 'عمل أدبي مستقل.'],
    ['TAISAAC', 'وصية إسحاق', 'Testament of Isaac', 'وص-إس', 'pseudepigrapha', 8.5, 0, 'coptic', 'القبطية البحيرية', 'ترجمة غاسيل الإنجليزية لشاهد قبطي بحيري منشورة سنة ١٩٢٧؛ النص المتاح كامل التفريغ من الشاهد المنشور، مع فجوات واضطرابات نصية صرّح بها المحقق.'],
    ['TAJACOB', 'وصية يعقوب', 'Testament of Jacob', 'وص-يع', 'pseudepigrapha', 8.6, 0, 'coptic', 'القبطية البحيرية', 'ترجمة غاسيل الإنجليزية لمراجعة قبطية بحيرية واحدة منشورة سنة ١٩٢٧؛ النص المتاح كامل التفريغ من الشاهد المنشور، لكنه لا يمثل الروايات الأخرى وفيه فجوات نصية صرّح بها المحقق.'],
    ['QSB', 'أسئلة ملكة سبأ وأجوبة سليمان', 'Questions of the Queen of Sheba and Answers of Solomon', 'سبأ-سل', 'pseudepigrapha', 8.7, 0, 'armenian', 'الأرمنية', 'ترجمة إيسافردنس الإنجليزية المنشورة سنة ١٩٠١ عن شاهد أرمني؛ النص الرقمي يحفظ أسئلة وأجوبة الصفحات ٢١١–٢١٥، وفيه مواضع حذف مطبوعة، لذلك حالته جزئية ولا يمثل الروايات الأخرى.'],
    ['QEZRA', 'أسئلة عزرا', 'Questions of Ezra', 'أس-عز', 'pseudepigrapha', 8.8, 1, 'armenian', 'الأرمنية مع ترجمة إنجليزية جديدة', 'الرواية الأرمنية الأقصر B من «هايْسمَفورك» سنة ١٧٣٠؛ تحفظ ١٤ وحدة في ترجمة إنجليزية جديدة. وهي رواية مستقلة عن الرواية الأطول A وعن رؤيا عزرا وكتاب عزرا الرابع.'],
    ['TADAM', 'حياة آدم وحواء', 'Life of Adam and Eve', 'ح-آ', 'pseudepigrapha', 9, 0, 'greek', 'اليونانية واللاتينية', 'نص متعدد الصيغ واللغات.'],
    ['TSTADAM', 'وصية آدم', 'Testament of Adam', 'وص-آد', 'pseudepigrapha', 9.5, 0, 'syriac', 'السريانية واليونانية', 'عمل مستقل عن حياة آدم وحواء ورؤيا موسى؛ تحفظ الشواهد السريانية واليونانية وترجماتهما منفصلة بحسب طبعة مشروع النصوص النقدية الرقمية.'],
    ['APADAM', 'رؤيا آدم', 'Apocalypse of Adam', 'رؤ-آد', 'pseudepigrapha', 9.6, 0, 'coptic', 'القبطية الصعيدية', 'ترجمة إنجليزية عامة الحقوق عن القبطية؛ نص شاهد نجع حمادي الخامس، النص الخامس، محفوظ في ٤٩ وحدة. علامات السقط مطبوعة كما في الشاهد، لذا حالة العمل جزئية.'],
    ['SEELI', 'كتاب إيليا العبري (سفر إلياهو)', 'Sefer Elijah (Hebrew Book of Elijah)', 'إيليا-هـ', 'pseudepigrapha', 9.7, 0, 'hebrew', 'العبرية', 'شاهد عبري متأخر مستقل عن رؤيا إيليا القبطية واللاتينية واليونانية؛ ترجمة زينر الإنجليزية منشورة ضمن مبادرة النصوص المفتوحة.'],
    ['APDAN', 'رؤيا دانيال اليونانية', 'Greek Apocalypse of Daniel', 'رؤ-دا', 'pseudepigrapha', 26, 0, 'greek', 'اليونانية', 'طبعة نقدية رقمية للشاهد اليوناني؛ يبدأ النص المتاح بالفصل الثاني من سفر دانيال، ويعرض هنا بترقيم داخلي متصل من ١ إلى ١٣.'],
    ['APDANC', 'رؤيا دانيال القبطية (الرؤيا الرابعة عشرة)', 'Coptic Apocalypse of Daniel (Fourteenth Vision)', 'رؤ-دا-ق', 'pseudepigrapha', 26.5, 0, 'coptic', 'القبطية', 'ترجمة إنجليزية تقريبية منقولة عن الفرنسية، لا عن القبطية مباشرة؛ هذا العمل مستقل عن رؤيا دانيال اليونانية.'],
    ['SEVDAN', 'الرؤيا السابعة لدانيال', 'The Seventh Vision of Daniel', 'رؤ-دا-٧', 'pseudepigrapha', 26.6, 0, 'armenian', 'الأرمنية مع ترجمة ألمانية تاريخية وترجمة إنجليزية جديدة', 'الشاهد الأرمني المنشور مع ترجمة ألمانية لغريغوريس كاليمكيار سنة ١٨٩٢؛ النص الإنجليزي الجديد في المشروع مترجم عن الألمانية، ويغطي صفحات الطبعة ٢٢٧–٢٤٠. اكتمال هذا الشاهد لا يعني اكتمال جميع روايات دانيال.'],
    ['APEZRA', 'رؤيا عزرا اليونانية', 'Greek Apocalypse of Ezra', 'رؤ-عز-ي', 'pseudepigrapha', 27, 0, 'greek', 'اليونانية', 'شاهد يوناني مستقل، لا يخلط مع عزرا الثاني أو كلمة ورؤيا عزرا.'],
    ['VISZEZRA', 'رؤيا عزرا اللاتينية', 'Latin Vision of Ezra', 'رؤ-عز-ل', 'pseudepigrapha', 27.5, 0, 'latin', 'اللاتينية', 'شاهد لاتيني مستقل عن رؤيا عزرا اليونانية؛ تتوفر له ترجمة OCP إنجليزية مفتوحة الترخيص.'],
    ['VISZEZRA', 'رؤيا عزرا اللاتينية', 'Latin Vision of Ezra', 'رؤ-عز-ل', 'pseudepigrapha', 27.5, 0, 'latin', 'اللاتينية', 'شاهد لاتيني مستقل عن رؤيا عزرا اليونانية؛ تتوفر له ترجمة OCP إنجليزية مفتوحة الترخيص.'],
    ['REVEZRA', 'رؤيا صفات السنة المنسوبة إلى عزرا', 'Revelation of Ezra on the Qualities of the Year', 'عز-سنة', 'pseudepigrapha', 28, 0, 'latin', 'اللاتينية', 'نص لاتيني قصير من مجموعة OCP، مستقل عن الرؤى المعروفة المنسوبة إلى عزرا.'],
    ['VISEL', 'رؤيا إيليا', 'Vision of Elijah', 'رؤ-إي', 'pseudepigrapha', 29, 0, 'latin', 'اللاتينية مع ترجمة إنجليزية', 'الشاهد اللاتيني من طبعة دي بروين 1925 وترجمته الإنجليزية الجديدة، 11 وحدة لكل منهما؛ لا يدمج مع رؤيا إيليا اليونانية أو القبطية المختلفتين، ولا يعني اكتمال الشاهد القصير اكتمال العمل القديم المفقود.'],
    ['APOCEL', 'رؤيا إيليا اليونانية (شذرات)', 'Greek Apocalypse of Elijah (fragments)', 'رؤ-إي-يون', 'pseudepigrapha', 29.5, 0, 'greek', 'اليونانية مع صياغة عربية تفسيرية', 'الشاهد اليوناني بردية PSI I 7 يحفظ سبعة أسطر فقط من نهاية الرؤيا؛ استوردت الأسطر المعروفة من ظهر البردية وحده، ولم أضم نص الوجه الآخر الذي لم يثبت انتماؤه إليها. النص جزئي ولا يمثل العمل كاملاً.'],
    ['NARMOS', 'رواية موسى ويشوع', 'Narrative of Moses and Joshua', 'روا-مو', 'pseudepigrapha', 30, 0, 'greek', 'اليونانية', 'نص يوناني مستقل محفوظ في طبعة نقدية رقمية؛ يعرض كوحدة واحدة بحسب تقسيم الشاهد.'],
    ['AMRAM', 'رؤى عمرام', 'Visions of Amram', 'عم-رؤ', 'pseudepigrapha', 31, 0, 'aramaic', 'الآرامية', 'شاهد آرامي مجزأ من مخطوطات البحر الميت مع ترجمة إنجليزية موازية؛ تحفظ النسختان منفصلتين.'],
    ['PSLAB', 'الآثار الكتابية المنحولة لفيلو', 'Biblical Antiquities of Pseudo-Philo', 'آث-فيل', 'pseudepigrapha', 31.5, 0, 'latin', 'اللاتينية مع ترجمة إنجليزية', 'ترجمة جيمس الإنجليزية عن اللاتينية (١٩١٧): ٦٣ من ٦٥ فصلاً محفوظة في هذا التفريغ؛ فصول ٤٣ و٤٧ غير موجودة، وتثبت المقدمة فجوات في ٣٧ وبداية ٣٨ وخاتمة مفقودة. لذلك حالة النص جزئية.'],
    ['ARL', 'وثيقة لاوي الآرامية (شذرات)', 'Aramaic Levi Document (fragments)', 'لاوي-آ', 'pseudepigrapha', 31.7, 0, 'aramaic', 'الآرامية واليونانية مع ترجمة إنجليزية', 'يتوفر تفريغ آرامي مطبوع لشذرات مخطوط كامبردج T-S 16.94 من طبعة سنة ١٩٠٠، إلى جانب ترجمة تشارلز الإنجليزية لعام ١٩١٣. هذا شاهد جزئي لا يضم شذرات بودلي أو قمران ولا يمثل الوثيقة كاملة.'],
    ['CONFESD', 'اعتراف عزرا', 'Confessio Esdrae', 'اع-عز', 'pseudepigrapha', 32, 0, 'latin', 'اللاتينية', 'نص لاتيني قصير مستقل من مجموعة OCP؛ لا يخلط مع عزرا الثاني أو رؤيا عزرا.'],
    ['SHEM', 'كتاب سام بن نوح', 'Book of Shem Son of Noah', 'سام-نوح', 'pseudepigrapha', 32.1, 0, 'syriac', 'السريانية مع ترجمة إنجليزية', 'عنوان طبعة منغانا ١٩١٧ ينسب الرسالة إلى سام بن نوح، لكن دراسة علمية سنة ٢٠١٢ ترى أن النسبة نتجت عن خطأ ناسخ وأن النص ليس منحولاً. يتوفر تفريغ آلي سرياني وترجمة إنجليزية عن شاهد واحد في مخطوط جون رايلاندز السرياني ٤٤. وحدات التفريغ السرياني تمثل صفحات الطبعة لا أعداداً أصلية؛ في المخطوط فجوات وقراءات مضطربة، ولا تزال بعض قراءات التفريغ الآلي بحاجة إلى مراجعة، لذلك حالة الشاهد جزئية.'],
    ['BALAAM', 'نقش بلعام من دير علا', 'Balaam Inscription from Deir Alla', 'بل-دير', 'pseudepigrapha', 32.2, 0, 'aramaic', 'الآرامية القديمة بحروف عبرية مع ترجمة عربية', 'نقش سامي شمالي غربي متضرر من تركيبي دير علا؛ تصنيفه اللغوي وترتيب بعض شظاياه وقراءاته موضع خلاف. السطر الأول من التركيب الثاني غير محفوظ في التفريغ المنشور، والنص جزئي.'],
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
    ['APMO', 'رؤيا موسى (الصيغة اليونانية)', 'Apocalypse of Moses', 'رؤ-مو', 'pseudepigrapha', 19, 0, 'greek', 'اليونانية', 'صيغة يونانية من حياة آدم وحواء؛ مستقلة عن حياة آدم وحواء اللاتينية وعن وصية/صعود موسى.'],
    ['GPE', 'إنجيل بطرس', 'Gospel of Peter', 'بطرس-أ', 'apocrypha', 30, 0, 'greek', 'اليونانية مع شواهد مجزأة', 'نص مسيحي أبوكريفي مجزأ.'],
    ['GJUD', 'إنجيل يهوذا', 'Gospel of Judas', 'يهوذا-أ', 'apocrypha', 31, 0, 'coptic', 'القبطية', 'نص غنوصي محفوظ في مخطوط قبطي.'],
    ['GMA', 'إنجيل مريم', 'Gospel of Mary', 'مريم-أ', 'apocrypha', 32, 0, 'coptic', 'القبطية واليونانية', 'النص محفوظ بصورة مجزأة.'],
    ['GTINF', 'إنجيل طفولة توما', 'Infancy Gospel of Thomas', 'طف-تو', 'apocrypha', 33, 0, 'greek', 'اليونانية ولغات لاحقة', 'نص طفولة أبوكريفي مستقل.'],
    ['APOL', 'أعمال بولس', 'Acts of Paul', 'أع-بول', 'apocrypha', 34, 0, 'greek', 'اليونانية', 'نص مركب وشواهده متعددة.'],
    ['APET', 'أعمال بطرس', 'Acts of Peter', 'أع-بط', 'apocrypha', 35, 0, 'greek', 'اليونانية واللاتينية', 'نص أبوكريفي متعدد الشواهد.'],
    ['APEP', 'رؤيا بطرس', 'Apocalypse of Peter', 'رؤ-بط', 'apocrypha', 36, 0, 'greek', 'اليونانية والإثيوبية', 'شواهد متعددة ولا تدمج آلياً.'],
    ['APJAMES', 'رؤيا يعقوب الرسول السريانية', 'Syriac Revelation of James the Apostle', 'رؤ-يع', 'apocrypha', 37, 0, 'syriac', 'السريانية والإنجليزية', 'عمل رؤيوي مستقل محفوظ في مخطوط سرياني؛ لا يخلط برؤيا يعقوب الأولى أو الثانية القبطيتين.'],
    ['ADAMCON', 'صراع آدم وحواء مع الشيطان', 'Conflict of Adam and Eve with Satan', 'صراع-آ', 'pseudepigrapha', 20, 0, 'ethiopic', 'الجعزية بوسيط عربي', 'عمل مسيحي شرقي من أربعة كتب، يروي حياة آدم وحواء بعد الخروج من الجنة ويمتد إلى تاريخ الأجيال اللاحقة؛ الترجمة الإنجليزية لسليمان مالان سنة 1882.'],
    ['JASHER', 'كتاب ياشر (الصيغة الوسيطة)', 'Sefer ha-Yashar (medieval)', 'ياشر', 'pseudepigrapha', 21, 0, 'hebrew', 'العبرية', 'رواية تفسيرية يهودية من العصور الوسطى مترجمة في طبعة 1840؛ ليست كتاب ياشر المفقود المشار إليه في يشوع وصموئيل.'],
    ['AHIKAR', 'قصة أخيقار', 'Story of Ahikar', 'أخي', 'pseudepigrapha', 22, 0, 'aramaic', 'الآرامية مع صيغ شرقية لاحقة', 'حكاية أخلاقية عن أخيقار وحكمه وأمثاله، معروفة في تقاليد آرامية وشرقية متعددة.'],
    ['ZOSIMUS', 'رواية زوسيموس عن أرض المباركين', 'Narrative of Zosimus', 'زوس', 'pseudepigrapha', 23, 0, 'greek', 'اليونانية مع صيغ شرقية', 'رؤيا ورحلة أخروية تروي زيارة ناسك لأرض المباركين؛ النص الإنجليزي من طبعة آباء ما قبل نيقية.'],
    ['SEDRACH', 'رؤيا سدراخ', 'Apocalypse of Sedrach', 'سدراخ', 'pseudepigrapha', 24, 0, 'greek', 'اليونانية', 'رؤيا مسيحية متأخرة تناقش التوبة والشفاعة والموت؛ النص الإنجليزي من طبعة آباء ما قبل نيقية.'],
    ['RESEZ', 'كلمة ورؤيا عزرا', 'Word and Revelation of Esdras', 'رؤ-عز', 'pseudepigrapha', 25, 0, 'greek', 'اليونانية', 'نص رؤيوي قصير مختلف عن عزرا الثاني وعن رؤيا عزرا اليونانية؛ محفوظ في مجموعة كتابات قديمة.'],
    ['APZEPH', 'رؤيا صفنيا', 'Apocalypse of Zephaniah', 'رؤ-صف', 'pseudepigrapha', 26, 0, 'coptic', 'القبطية', 'نص يهودي رؤيوي لم يصل كاملاً؛ الشواهد القبطية المتاحة شذرات ولا تثبت ترتيب العمل الأصلي أو مداه.'],
    ['VIRGINAP', 'رؤيا العذراء مريم', 'Apocalypse of the Virgin', 'رؤ-مريم', 'apocrypha', 40, 0, 'greek', 'اليونانية', 'رؤيا مسيحية متأخرة تصف جولة في العقوبات والشفاعة؛ نصها الإنجليزي من طبعة آباء ما قبل نيقية.'],
    ['ACTTHOM', 'أعمال توما', 'Acts of Thomas', 'أع-تو', 'apocrypha', 41, 0, 'syriac', 'السريانية واليونانية', 'عمل مسيحي قديم محفوظ كاملاً في صيغ سريانية ويونانية؛ ثلاثة عشر جزءاً وخاتمة الاستشهاد، مستقل عن إنجيل توما وإنجيل طفولته.'],
    ['LAOD', 'رسالة إلى اللاودكيين', 'Epistle to the Laodiceans', 'لاود', 'apocrypha', 42, 0, 'latin', 'اللاتينية', 'رسالة قصيرة منسوبة إلى بولس محفوظة في مخطوطات لاتينية؛ لا يثبت أنها الرسالة المشار إليها في كولوسي، ولا تنسب إلى بولس على أنها حقيقة تاريخية.'],
    ['EPISTAP', 'رسالة الرسل', 'Epistle of the Apostles', 'رس-رسل', 'apocrypha', 43, 0, 'ethiopic', 'الجعزية والقبطية مع أصل يوناني مفترض', 'حوار مسيحي قديم بين المسيح القائم وتلاميذه، محفوظ كاملاً بالجعزية وجزئياً بالقبطية؛ ٥١ قسماً في ترجمة جيمس المقارنة، وليس من رسائل العهد الجديد القانونية.'],
    ['IGNEPH', 'رسالة إغناطيوس إلى أفسس', 'Ignatius to the Ephesians', 'IGNEPH', 'church-writings', 30, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس الأنطاكي إلى جماعة أفسس؛ تتناول الوحدة الكنسية والقيادة والإيمان بالمسيح، وتنتهي بطلب الصلاة. الصيغة المتوسطة في ٢١ فصلاً مع التحية.'],
    ['IGNMAG', 'رسالة إغناطيوس إلى مغنيسية', 'Ignatius to the Magnesians', 'IGNMAG', 'church-writings', 31, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس إلى جماعة مغنيسية؛ تحث على الانسجام مع الأسقف والشيوخ وتناقش الحياة المسيحية والتعاليم المخالفة. تحفظ ١٥ فصلاً والتحية.'],
    ['IGNTRA', 'رسالة إغناطيوس إلى ترالس', 'Ignatius to the Trallians', 'IGNTRA', 'church-writings', 32, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس إلى جماعة ترالس؛ تتناول وحدة الجماعة والخدمة وتحذر من التعليم الذي ينكر آلام المسيح الحقيقية. تحفظ ١٣ فصلاً والتحية.'],
    ['IGNROM', 'رسالة إغناطيوس إلى رومية', 'Ignatius to the Romans', 'IGNROM', 'church-writings', 33, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس إلى مسيحيي رومية أثناء اقتياده للمحاكمة؛ يطلب ألا يتدخلوا لمنع استشهاده ويشرح موقفه من الموت. تحفظ ١٠ فصول والتحية.'],
    ['IGNPHI', 'رسالة إغناطيوس إلى فيلادلفية', 'Ignatius to the Philadelphians', 'IGNPHI', 'church-writings', 34, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس إلى جماعة فيلادلفية؛ تحث على وحدة الجماعة والمصالحة واجتناب الانقسام، وتذكر مبعوثين ورفقاء في السفر. تحفظ ١١ فصلاً والتحية.'],
    ['IGNSMY', 'رسالة إغناطيوس إلى سميرنا', 'Ignatius to the Smyrnaeans', 'IGNSMY', 'church-writings', 35, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس إلى جماعة سميرنا؛ تؤكد حقيقة جسد المسيح وآلامه وقيامته، وتناقش الجماعة وخدمتها، وتنتهي بالشكر والتحيات. تحفظ ١٣ فصلاً والتحية.'],
    ['IGNPOL', 'رسالة إغناطيوس إلى بوليكاربوس', 'Ignatius to Polycarp', 'IGNPOL', 'church-writings', 36, 0, 'greek', 'اليونانية', 'رسالة إغناطيوس إلى بوليكاربوس أسقف سميرنا؛ تتضمن إرشادات في الرعاية والزواج ومعاملة العبيد والمحتاجين وإرسال المبعوثين. تحفظ ٨ فصول والتحية.'],
    ['POLPHI', 'رسالة بوليكاربوس إلى أهل فيلبي', 'Polycarp to the Philippians', 'POLPHI', 'church-writings', 37, 0, 'greek', 'اليونانية مع ختام محفوظ باللاتينية', 'رسالة بوليكاربوس إلى مسيحيي فيلبي؛ تتناول الإيمان والسلوك والعطاء والتحذير من محبة المال، وتشير إلى إغناطيوس ورسائله. تحفظ ١٤ فصلاً، مع أجزاء أخيرة محفوظة باللاتينية.'],
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
    syncBookCatalog.run(nameAr, nameEn, abbr, colMap[collection], order, chapterCount, chapterCount, code);
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
    // Expansion records already have a specific description and tradition above.
    if (records.some(([code]) => code === book.code)) continue;
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
      'مُضاف إلى كتالوج موقع البيبل فقط.'
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

  db.prepare(`
    UPDATE bible_book_metadata SET summary_ar=CASE book_code
      WHEN 'DIDAS' THEN 'دليل كنسي قديم يتناول تعليم الداخلين إلى المسيحية وتنظيم خدمة الأسقف والعبادة والانضباط. النص الإنجليزي المختار مقسم إلى ٢٦ فصلاً.'
      WHEN 'DID-ETH' THEN 'صيغة إثيوبية من الدسقولية، محفوظة في ترجمة إنجليزية من ٤٣ فصلاً. تُعرض شاهداً مستقلاً عن الدسقولية الرسولية وعن الصيغ السريانية والعربية.'
      WHEN 'SIN' THEN 'قسم من مجموعة السينودس الإثيوبي الكنسية، وهو شاهد إنجليزي لتقسيم تيزاز في ٧٣ فصلاً؛ لا يخلط مع كتاب العهد أو الدسقولية.'
      WHEN 'COV1' THEN 'كتاب العهد الأول من التقليد الكنسي الإثيوبي، في الشاهد الإنجليزي المختار ذي الفصول الـ٧٤. يُعرض مستقلاً عن كتاب العهد الثاني.'
      WHEN 'COV2' THEN 'كتاب العهد الثاني من التقليد الكنسي الإثيوبي، في الشاهد الإنجليزي المختار ذي الفصول الـ٥١. لا يدمج مع كتاب العهد الأول.'
      WHEN 'DID' THEN 'تعليم الرسل الاثني عشر، نص مسيحي مبكر في ١٦ فصلاً عن الأخلاق والمعمودية والصوم والصلاة والاحتفال وخدمة الجماعة.'
      WHEN 'BARN' THEN 'رسالة مسيحية مبكرة من ٢١ فصلاً تجمع الوعظ الأخلاقي وقراءة رمزية لبعض نصوص العهد القديم؛ تنسب تقليدياً إلى برنابا ولا تثبت نسبتها إليه.'
      WHEN 'PJA' THEN 'رواية مسيحية مبكرة عن مولد مريم وطفولة يسوع، في ٢٤ فصلاً. هي إنجيل طفولة غير قانوني وليست جزءاً من الأناجيل الأربعة.'
      WHEN 'DIAT' THEN 'تنسيق روائي للأناجيل الأربعة منسوب إلى تاتيان، وصل نصه هنا عبر شاهد عربي وترجمة إنجليزية لهوغ في ٥٣ قسماً. الأصل السرياني غير باقٍ كاملاً، لذلك فهذا شاهد معاد البناء لا نص أصلي مستقل.'
      WHEN 'ODSO' THEN 'مجموعة ترانيم مسيحية قديمة معروفة بأوديات سليمان. يحفظ الشاهد الإنجليزي ٤٢ ترنيمة وتقسيماتها النصية، ويعرض تقليداً نصياً لا ينسب تأليفها يقيناً إلى سليمان.'
      WHEN 'GTINF' THEN 'رواية طفولة منسوبة إلى توما، تحفظ حكايات عن يسوع في صباه. هذا هو الشاهد اليوناني أ في ١٩ فصلاً، وهو مختلف عن إنجيل توما للأقوال.'
      WHEN 'GTH' THEN 'مجموعة من ١١٤ قولاً منسوباً إلى يسوع في شاهد إنجيل توما؛ النص لا يقدم سرداً متصلاً لحياته، وحُفظ في فصل واحد وفق تقسيم الطبعة.'
      WHEN 'CLE1' THEN 'رسالة كنسية مبكرة من جماعة روما إلى جماعة كورنثوس، تدعو إلى السلام وترتيب الخدمة. يحفظ الشاهد الإنجليزي ٦٥ فصلاً.'
      WHEN 'CLE2' THEN 'موعظة مسيحية مبكرة مجهولة المؤلف، عرفت باسم رسالة إكليمندس الثانية. تتكون الطبعة من ٢٠ فصلاً ولا تعد رسالة مؤكدة لإكليمندس.'
      WHEN 'HERM' THEN 'كتابة مسيحية مبكرة تجمع الرؤى والوصايا والأمثال في ثلاثة أقسام نصية. حُفظت الأقسام الإنجليزية الثلاثة بإجمالي ١٠٠ فصل، مع بيان ترجمة كل قسم.'
      WHEN 'AHIKAR' THEN 'قصة حكيم آرامي تتخللها أمثال وتعاليم، انتقلت في صيغ شرقية متعددة. يحفظ المصدر الإنجليزي النص المتصل في سجل واحد لغياب تقسيم فصول موحد.'
      WHEN 'ZOSIMUS' THEN 'رواية رؤيوية مسيحية متأخرة تصف رحلة زوسيموس إلى أرض المباركين؛ يحفظ الشاهد الإنجليزي ٢١ قسماً، ولا يقدمها بوصفها سفراً قانونياً.'
      WHEN 'SEDRACH' THEN 'رؤيا مسيحية متأخرة في حوار حول الموت والرحمة والخلاص. يحفظ الشاهد الإنجليزي ١٦ قسماً مرقماً.'
      WHEN 'RESEZ' THEN 'قطعة قصيرة بعنوان كلمة ورؤيا عزرا من مجموعة آباء ما قبل نيقية. حُفظ النص كاملاً في قسم واحد، وهو مستقل عن سفر عزرا الثاني ورؤيا عزرا اليونانية.'
      WHEN 'JASHER' THEN 'رواية يهودية وسيطة أعيدت صياغتها في طبعة إنجليزية تاريخية من ٩١ فصلاً. ليست كتاب ياشر القديم المفقود المشار إليه في يشوع وصموئيل؛ وحداتها النصية محفوظة بترقيم الطبعة.'
      WHEN 'CLE-ETH' THEN 'الكتاب الثاني من إكليمندس الإثيوبي أوسع من المقتطف الإنجليزي المتاح. ما استورد هنا مقتطف من رؤيا بطرس الإثيوبية داخل هذا الكتاب؛ الصفحة الرقمية ٢٣ تحوي بقايا تعرف ضوئي على الحروف، لا دليلاً على فصل قديم مفقود. يبقى الكتاب جزئياً.'
      ELSE summary_ar END,
      updated_at=CURRENT_TIMESTAMP
    WHERE book_code IN ('DIDAS','DID-ETH','SIN','COV1','COV2','DID','BARN','PJA','DIAT','ODSO','GTINF','GTH','CLE1','CLE2','HERM','AHIKAR','ZOSIMUS','SEDRACH','RESEZ','JASHER','CLE-ETH')
  `).run();

  // Tegsat is the Ethiopian division of Proverbs 25–31, not the Teezaz section of Synodos.
  db.prepare(`
    UPDATE bible_books
    SET name_ar='تغسات (أمثال ٢٥–٣١)', name_en='Tegsat / Proverbs 25–31', chapter_count=7
    WHERE code='TAGS'
  `).run();
  db.prepare(`
    UPDATE bible_book_metadata
    SET original_language='العبرية',
        summary_ar='تقسيم إثيوبي تقليدي لآخر أمثال سليمان؛ المتاح هنا نص سميث وفاندايك العربي المقابل للفصول ٢٥–٣١، وليس شاهداً جعزياً.',
        updated_at=CURRENT_TIMESTAMP
    WHERE book_code='TAGS'
  `).run();

  db.prepare(`
    UPDATE bible_book_metadata
    SET summary_ar=COALESCE((
          SELECT notes FROM bible_book_sources
          WHERE book_code=bible_book_metadata.book_code
            AND availability_status='available' AND source_type='parallel-text'
          ORDER BY id DESC LIMIT 1
        ), summary_ar),
        source_name=COALESCE((
          SELECT COALESCE(label_en, label_ar) FROM bible_book_sources
          WHERE book_code=bible_book_metadata.book_code
            AND availability_status='available' AND source_type='parallel-text'
          ORDER BY id DESC LIMIT 1
        ), source_name),
        source_url=COALESCE((
          SELECT source_url FROM bible_book_sources
          WHERE book_code=bible_book_metadata.book_code
            AND availability_status='available' AND source_type='parallel-text'
          ORDER BY id DESC LIMIT 1
        ), source_url),
        source_notes=COALESCE((
          SELECT notes FROM bible_book_sources
          WHERE book_code=bible_book_metadata.book_code
            AND availability_status='available' AND source_type='parallel-text'
          ORDER BY id DESC LIMIT 1
        ), source_notes),
        updated_at=CURRENT_TIMESTAMP
    WHERE EXISTS (
      SELECT 1 FROM bible_book_sources
      WHERE book_code=bible_book_metadata.book_code
        AND availability_status='available' AND source_type='parallel-text'
    )
  `).run();

  // لا نعلن توفر نص لمجرد وجوده في الفهرس؛ الحالة تُشتق من الوحدات الموجودة فعلياً.
  db.prepare(`
    UPDATE bible_book_metadata
    SET text_status = CASE
        WHEN bible_book_metadata.book_code='CLE-ETH' THEN 'partial'
        WHEN bible_book_metadata.text_status='partial' THEN 'partial'
        WHEN EXISTS (
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
  const CW = colMap['church-writings'];

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
    ['ESG','إضافات أستير اليونانية','Greek Additions to Esther','أسي',DC,15,7],
    // Apocrypha / Pseudepigrapha (Ethiopian Canon)
    ['ENO','أخنوخ الأول','1 Enoch','أخ',AP,1,108],
    ['JUB','اليوبيلات','Book of Jubilees','يوب',AP,2,50],
    ['DIDAS','الدسقولية الرسولية','Didascalia Apostolorum','دسق',CW,1,26],
  ];

  for (const b of books) insertBook.run(...b);
  // يحتوي مصدر الترجمة المتاح إضافات أستير اليونانية السبعة فقط، لا السفر اليوناني كاملاً.
  db.prepare("UPDATE bible_books SET name_ar='إضافات أستير اليونانية', name_en='Greek Additions to Esther', chapter_count=7 WHERE code='ESG'").run();

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
