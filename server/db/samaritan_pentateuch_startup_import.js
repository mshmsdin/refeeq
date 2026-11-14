import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';

const PDF_URL = 'https://books.openbookpublishers.com/10.11647/obp.0415.pdf';

export const SAMARITAN_PENTATEUCH_SOURCE = {
  translationSlug: 'en-samaritan-pentateuch-florentin-tal-2024',
  url: PDF_URL,
  textFile: new URL('../importers/data/samaritan_pentateuch_florentin_tal_2024_en.json', import.meta.url),
  expectedSha256: 'b339117f58e935c057ee2519240fe9ddd479aa2b13bbc917f9de4f0e5f27300c',
  expectedUnitCount: 5829,
  expectedWordCount: 156604,
  sourceName: 'Florentin and Tal English Samaritan Pentateuch (2024)',
  nameAr: 'ترجمة فلورنتين وتال الإنجليزية للتوراة السامرية (٢٠٢٤)',
  notes: 'نص إنجليزي كامل للتوراة السامرية في طبعة موشيه فلورنتين وأبراهام تال، «التوراة السامرية: ترجمة إنجليزية مع نص عبري مشروح موازٍ»، كامبردج: ناشرو الكتب المفتوحة، ٢٠٢٤، DOI: 10.11647/OBP.0415. نسخة ملف الكتاب تنص على رخصة المشاع الإبداعي: النسب، غير تجاري، الإصدار ٤٫٠؛ لذلك يُحفظ النص مع النسبة والرابط ولا يُستخدم تجارياً. التفريغ يتبع وحدات الطبعة الإنجليزية وصفحاتها، لا يعيد توزيع النص على أرقام معيارية: في خروج ٢٦:٣٥ أُدرجت الفقرات [a]–[j] المقابلة لخروج ٣٠:١–١٠ وفق حاشية الطبعة؛ وأُبقي خروج ٢٩:٢١ غائباً لأن خانته فارغة في الطبعة. كما حُفظت مواضع الدمج التي تسقط أرقاماً فرعية من دون إسقاط نصها: خروج ٢٨:٣٨ و٣٧:٢، وتثنية ٧:٢٢ و٣٤:٢–٣. لا تُستكمل هذه المواضع بأرقام أو نصوص مخترعة. [الكتاب وبيانات الرخصة](https://www.openbookpublishers.com/books/10.11647/OBP.0415)؛ [ملف الطبعة ومتن النص](https://books.openbookpublishers.com/10.11647/obp.0415.pdf)؛ [بيان الرخصة في ملف الكتاب](https://books.openbookpublishers.com/10.11647/obp.0415.01.pdf).',
  books: [
    { code: 'SAM-GEN', chapterCount: 50, unitCount: 1533, displayName: 'التكوين السامري' },
    { code: 'SAM-EXO', chapterCount: 40, unitCount: 1196, displayName: 'الخروج السامري' },
    { code: 'SAM-LEV', chapterCount: 27, unitCount: 859, displayName: 'اللاويين السامري' },
    { code: 'SAM-NUM', chapterCount: 36, unitCount: 1289, displayName: 'العدد السامري' },
    { code: 'SAM-DEU', chapterCount: 34, unitCount: 952, displayName: 'التثنية السامرية' }
  ]
};

const EXPECTED_MISSING = new Set([
  'SAM-EXO:28:38', 'SAM-EXO:29:21',
  ...Array.from({ length: 10 }, (_, index) => `SAM-EXO:30:${index + 1}`),
  'SAM-EXO:37:2', 'SAM-DEU:7:22', 'SAM-DEU:34:2', 'SAM-DEU:34:3'
]);

const SOURCE_NOTES_AR = 'ترجمة إنجليزية كاملة بحسب متن الطبعة للتوراة السامرية في كتاب فلورنتين وتال (٢٠٢٤)، الصفحات المطبوعة ٨٥–٨٩٦؛ ويذكر الكتاب مخطوط نابلس ٦، المنسوخ سنة ١٢٠٤، شاهداً للنص السامري. ملف الطبعة يصرح برخصة المشاع الإبداعي: النسب، غير تجاري، الإصدار ٤٫٠؛ النسبة المطلوبة: موشيه فلورنتين وأبراهام تال، «التوراة السامرية: ترجمة إنجليزية مع نص عبري مشروح موازٍ»، كامبردج: ناشرو الكتب المفتوحة، ٢٠٢٤. الوحدات مرتبطة بصفحات ملف المصدر. تختلف التقسيمات عن ترقيم شائع: خروج ٢٦:٣٥ يحمل الفقرات المرموز إليها بالحروف من أ إلى ي، وهي تقابل خروج ٣٠:١–١٠ بحسب حاشية الطبعة؛ وخانة خروج ٢٩:٢١ فارغة في المتن؛ وتُدمج نصوص بعض الأرقام الفرعية في وحدات الطبعة السابقة. لم تُستكمل هذه المواضع بأرقام أو نصوص مخترعة. يحتوي الكتاب النص العبري السامري الموازي، لكن تفريغه الأصلي لم يُعتمد بعد؛ لذلك حالة النص في المشروع جزئية رغم اكتمال الترجمة الإنجليزية داخل الطبعة. [الكتاب وبيانات الرخصة](https://www.openbookpublishers.com/books/10.11647/OBP.0415)؛ [ملف الطبعة ومتن النص](https://books.openbookpublishers.com/10.11647/obp.0415.pdf)؛ [بيان الرخصة في ملف الكتاب](https://books.openbookpublishers.com/10.11647/obp.0415.01.pdf).';

async function readVerifiedUnits() {
  const raw = await readFile(SAMARITAN_PENTATEUCH_SOURCE.textFile, 'utf8');
  const hash = createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
  if (hash !== SAMARITAN_PENTATEUCH_SOURCE.expectedSha256) {
    throw new Error('بصمة ملف التوراة السامرية لا تطابق النسخة المدققة');
  }
  let units;
  try {
    units = JSON.parse(raw);
  } catch {
    throw new Error('ملف وحدات التوراة السامرية ليس بصيغة صحيحة');
  }
  if (!Array.isArray(units) || units.length !== SAMARITAN_PENTATEUCH_SOURCE.expectedUnitCount) {
    throw new Error('عدد وحدات التوراة السامرية لا يطابق النسخة المدققة');
  }

  const bookMap = new Map(SAMARITAN_PENTATEUCH_SOURCE.books.map((book) => [book.code, book]));
  const seen = new Set();
  const chapterSets = new Map();
  const bookCounts = new Map();
  let wordCount = 0;
  let previousOrder = -1;
  for (const unit of units) {
    const book = bookMap.get(unit.bookCode);
    const page = Number(/#page=(\d+)$/.exec(unit.sourceUrl || '')?.[1]);
    const key = `${unit.bookCode}:${unit.chapter}:${unit.verse}`;
    const bookIndex = SAMARITAN_PENTATEUCH_SOURCE.books.findIndex((item) => item.code === unit.bookCode);
    const order = bookIndex * 10000000 + unit.chapter * 100000 + unit.verse;
    if (!book || !Number.isInteger(unit.chapter) || unit.chapter < 1 || unit.chapter > book.chapterCount
      || !Number.isInteger(unit.verse) || unit.verse < 1 || !Number.isInteger(page) || page < 104 || page > 915
      || !unit.sourceUrl.startsWith(`${PDF_URL}#page=`) || typeof unit.text !== 'string' || unit.text.trim().length < 16
      || seen.has(key) || order <= previousOrder) {
      throw new Error(`ترقيم أو نص أو رابط مصدر غير صالح في وحدة التوراة السامرية ${key}`);
    }
    seen.add(key);
    previousOrder = order;
    bookCounts.set(unit.bookCode, (bookCounts.get(unit.bookCode) || 0) + 1);
    if (!chapterSets.has(unit.bookCode)) chapterSets.set(unit.bookCode, new Map());
    if (!chapterSets.get(unit.bookCode).has(unit.chapter)) chapterSets.get(unit.bookCode).set(unit.chapter, new Set());
    chapterSets.get(unit.bookCode).get(unit.chapter).add(unit.verse);
    wordCount += unit.text.trim().split(/\s+/u).filter(Boolean).length;
  }

  for (const book of SAMARITAN_PENTATEUCH_SOURCE.books) {
    const chapters = chapterSets.get(book.code);
    if (bookCounts.get(book.code) !== book.unitCount || chapters?.size !== book.chapterCount
      || Array.from({ length: book.chapterCount }, (_, index) => index + 1).some((chapter) => !chapters.has(chapter))) {
      throw new Error(`عدد وحدات أو فصول ${book.code} لا يطابق النسخة المدققة`);
    }
  }
  const actualMissing = new Set();
  for (const [bookCode, chapters] of chapterSets) {
    for (const [chapter, verses] of chapters) {
      const maximum = Math.max(...verses);
      for (let verse = 1; verse <= maximum; verse += 1) {
        if (!verses.has(verse)) actualMissing.add(`${bookCode}:${chapter}:${verse}`);
      }
    }
  }
  if (actualMissing.size !== EXPECTED_MISSING.size
    || [...EXPECTED_MISSING].some((location) => !actualMissing.has(location))) {
    throw new Error('مواضع الأعداد غير الموجودة لا تطابق فروق الطبعة السامرية المدققة');
  }
  if (wordCount !== SAMARITAN_PENTATEUCH_SOURCE.expectedWordCount) {
    throw new Error(`عدد كلمات التوراة السامرية لا يطابق النسخة المدققة: ${wordCount}`);
  }
  const relocatedPassage = units.find((unit) => unit.bookCode === 'SAM-EXO' && unit.chapter === 26 && unit.verse === 35)?.text || '';
  if (!relocatedPassage.includes('[a]') || !relocatedPassage.includes('[j]')) {
    throw new Error('لم يُعثر على الفقرات المنقولة [a]–[j] في خروج ٢٦:٣٥');
  }
  return units;
}

function metadataIsReady(db) {
  return SAMARITAN_PENTATEUCH_SOURCE.books.every((book) => {
    const metadata = db.prepare(`
      SELECT text_status, english_status, textual_tradition, original_language, summary_ar, source_name,
        source_url, source_notes
      FROM bible_book_metadata WHERE book_code=?
    `).get(book.code);
    const source = db.prepare(`
      SELECT 1 FROM bible_book_sources WHERE book_code=? AND label_ar=? AND language='الإنجليزية'
        AND source_url=? AND source_type='parallel-text' AND availability_status='available' AND notes=?
    `).get(book.code, SAMARITAN_PENTATEUCH_SOURCE.nameAr, PDF_URL, SOURCE_NOTES_AR);
    return metadata?.text_status === 'partial' && metadata.english_status === 'available'
      && metadata.textual_tradition === 'sam' && metadata.original_language === 'العبرية السامرية'
      && metadata.summary_ar === SOURCE_NOTES_AR
      && metadata.source_name === SAMARITAN_PENTATEUCH_SOURCE.sourceName
      && metadata.source_url === PDF_URL && metadata.source_notes === SOURCE_NOTES_AR && Boolean(source);
  });
}

async function importedUnitsMatch(db, translationId, units) {
  const expected = units.map(({ bookCode, chapter, verse, text, sourceUrl }) => ({
    book_code: bookCode, chapter, verse, text: text.trim(), source_url: sourceUrl
  })).sort((a, b) => a.book_code.localeCompare(b.book_code) || a.chapter - b.chapter || a.verse - b.verse);
  const actual = db.prepare(`
    SELECT book_code, chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? ORDER BY book_code, chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function translationIsReady(db, translation, units) {
  if (!translation || translation.language !== 'en' || translation.is_active !== 1 || translation.site_scope !== 'both'
    || translation.source_type !== 'cc-by-nc-4.0') return false;
  const count = db.prepare('SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=?').get(translation.id).count;
  return count === units.length;
}

export async function ensureSamaritanPentateuchImported() {
  const db = getDb();
  const units = await readVerifiedUnits();
  const current = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
  `).get(SAMARITAN_PENTATEUCH_SOURCE.translationSlug);
  if (current && translationIsReady(db, current, units) && metadataIsReady(db)
    && await importedUnitsMatch(db, current.id, units)) return false;

  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes,
        site_scope, is_active, display_order, imported_at)
    VALUES (?, ?, ?, 'SP-FT-2024', 'en', ?, 'cc-by-nc-4.0', ?, 'both', 1, 2, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language, source_url=excluded.source_url, source_type=excluded.source_type,
      source_notes=excluded.source_notes, site_scope='both', is_active=1,
      display_order=excluded.display_order, updated_at=CURRENT_TIMESTAMP
  `);
  const translationId = db.transaction(() => {
    insertTranslation.run(SAMARITAN_PENTATEUCH_SOURCE.translationSlug, SAMARITAN_PENTATEUCH_SOURCE.nameAr,
      SAMARITAN_PENTATEUCH_SOURCE.sourceName, PDF_URL, SAMARITAN_PENTATEUCH_SOURCE.notes);
    const id = db.prepare('SELECT id FROM bible_translations WHERE slug=?')
      .get(SAMARITAN_PENTATEUCH_SOURCE.translationSlug).id;
    db.prepare('DELETE FROM bible_verses WHERE translation_id=?').run(id);

    const insertVerse = db.prepare(`
      INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const unit of units) {
      insertVerse.run(id, unit.bookCode, unit.chapter, unit.verse, unit.text.trim(), unit.text.trim().toLocaleLowerCase('en'), unit.sourceUrl);
    }

    const updateMetadata = db.prepare(`
      UPDATE bible_book_metadata SET textual_tradition='sam',
        original_language='العبرية السامرية', text_status='partial', english_status='available',
        summary_ar=?, source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP WHERE book_code=?
    `);
    const upsertSource = db.prepare(`
      INSERT INTO bible_book_sources (book_code, label_ar, label_en, language, availability_status,
        source_type, source_url, notes)
      VALUES (?, ?, ?, 'الإنجليزية', 'available', 'parallel-text', ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET label_en=excluded.label_en,
        availability_status='available', source_type='parallel-text', notes=excluded.notes
    `);
    for (const book of SAMARITAN_PENTATEUCH_SOURCE.books) {
      const summary = SOURCE_NOTES_AR;
      updateMetadata.run(summary, SAMARITAN_PENTATEUCH_SOURCE.sourceName, PDF_URL, SOURCE_NOTES_AR, book.code);
      upsertSource.run(book.code, SAMARITAN_PENTATEUCH_SOURCE.nameAr,
        SAMARITAN_PENTATEUCH_SOURCE.sourceName, PDF_URL, SOURCE_NOTES_AR);
    }
    return id;
  })();

  const updated = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE id=?
  `).get(translationId);
  if (!translationIsReady(db, updated, units) || !metadataIsReady(db)
    || !await importedUnitsMatch(db, translationId, units)) {
    throw new Error('لم تتطابق وحدات التوراة السامرية ومصادرها بعد الاستيراد');
  }
  return true;
}
