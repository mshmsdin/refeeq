import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const BOOK_CODE = 'SAMJOS';
const DISPLAY_ORDER = 42;

export const SAMARITAN_CHRONICLE_SOURCE = {
  translationSlug: 'en-samaritan-chronicle-crane-1890',
  textFile: new URL('../importers/data/samaritan_chronicle_crane_1890_en.json', import.meta.url),
  sourceUrl: 'https://en.wikisource.org/wiki/The_Samaritan_Chronicle',
  scanUrl: 'https://archive.org/details/samaritanchronic00josh',
  expectedSha256: 'd3761955178711655eb3355ff6dd7e51b545812df27f20b5c562ab7df015138a',
  expectedUnitCount: 50,
  expectedWordCount: 35745,
  sourceType: 'cc-by-sa-4.0',
  language: 'en',
  nameAr: 'ترجمة أوليفر تيرنبول كرين الإنجليزية (١٨٩٠)',
  nameEn: 'Oliver Turnbull Crane English translation (1890)',
  abbreviation: 'SAM-CHR-1890',
  notes: 'تفريغ النص الإنجليزي المنشور لأوليفر تيرنبول كرين سنة ١٨٩٠، عن رواية عربية لتراث يشوعي سامري؛ ومقدمة الرواية تقول إن الأصل تُرجم شفوياً من العبرية إلى العربية. النسخة الرقمية هي تفريغ ويكي مصدر، وبياناته غير المنظمة برخصة المشاع الإبداعي: النسب، المشاركة بالمثل ٤٫٠؛ والطبعة المصورة لعام ١٨٩٠ موسومة ملكاً عاماً في ويكيميديا كومنز. يضم التفريغ الفصول الخمسين المطبوعة، لكن الخاتمة نفسها تصرح بأن مخطوط الرواية ينقطع فجأة في الفصل L؛ لذلك حالة العمل جزئية ولا تستكمل الخاتمة. طُبّع ترقيم الفصول ٢٩ و٣٩ و٤٧ بحسب فهرس الطبعة؛ تسميها عناوين ويكي مصدر على الترتيب XXVIX وXXXVIX وXLVI، بينما يثبت الفهرس XXIX وXXXIX وXLVII. واستُبعد رمز تعبيري تسلل إلى زخرفة عنوان الفصل XXX لأنه لا يظهر في المسح المطبوع. النسبة «كتاب يشوع» عنوان تقليدي لتأريخ سامري من العصور الوسطى، لا كتاب يشوع الكتابي ولا عمل كتبه يشوع. [التفريغ ورخصته](https://en.wikisource.org/wiki/The_Samaritan_Chronicle)؛ [الطبعة المصورة وفهرسها وبيان الملك العام](https://archive.org/details/samaritanchronic00josh)؛ [صورة المسح ورخصة الملك العام](https://commons.wikimedia.org/wiki/File:The_Samaritan_chronicle_-_or_The_book_of_Joshua_the_son_of_Nun_(IA_samaritanchronic00josh).pdf).'
};

const SOURCE_NOTES_AR = `ترجمة أوليفر تيرنبول كرين الإنجليزية المنشورة سنة ١٨٩٠ عن الرواية العربية، التي تقول مقدمتها إنها منقولة شفوياً عن العبرية. التفريغ الرقمي من ويكي مصدر برخصة المشاع الإبداعي: النسب، المشاركة بالمثل ٤٫٠؛ وطبعة ١٨٩٠ المصورة موسومة ملكاً عاماً. يحتوي الملف الفصول الخمسين المطبوعة، غير أن خاتمة الطبعة تصرح بانقطاع مخطوط الرواية فجأة أثناء الفصل L، ولذلك يظل العمل جزئياً. صُحح عرض ترقيم الفصول ٢٩ و٣٩ و٤٧ بالرجوع إلى فهرس الطبعة، من XXVIX وXXXVIX وXLVI كما في عناوين التفريغ إلى XXIX وXXXIX وXLVII؛ واستبعد الرمز التعبيري الدخيل في زخرفة عنوان الفصل XXX. لا يثبت عنوان «كتاب يشوع» نسبة العمل إلى يشوع ولا صلته بسفر يشوع الكتابي. [التفريغ ورخصته](https://en.wikisource.org/wiki/The_Samaritan_Chronicle)؛ [المسح والفهرس](https://archive.org/details/samaritanchronic00josh).`;

async function readVerifiedUnits() {
  const raw = await readFile(SAMARITAN_CHRONICLE_SOURCE.textFile, 'utf8');
  const hash = createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
  if (hash !== SAMARITAN_CHRONICLE_SOURCE.expectedSha256) {
    throw new Error('بصمة تفريغ التاريخ السامري لا تطابق النسخة المدققة');
  }

  let units;
  try {
    units = JSON.parse(raw);
  } catch {
    throw new Error('ملف وحدات التاريخ السامري ليس بصيغة صحيحة');
  }
  if (!Array.isArray(units) || units.length !== SAMARITAN_CHRONICLE_SOURCE.expectedUnitCount) {
    throw new Error('عدد فصول التاريخ السامري لا يطابق الطبعة المدققة');
  }

  const wordCount = units.reduce((count, unit) => count + unit.text.trim().split(/\s+/u).filter(Boolean).length, 0);
  if (wordCount !== SAMARITAN_CHRONICLE_SOURCE.expectedWordCount) {
    throw new Error(`عدد كلمات التاريخ السامري غير مطابق: ${wordCount}`);
  }
  const knownSourceNumberVariants = new Map([[29, 'XXVIX'], [39, 'XXXVIX'], [47, 'XLVI']]);
  for (const [index, unit] of units.entries()) {
    const chapter = index + 1;
    if (unit.chapter !== chapter || unit.verse !== 1 || typeof unit.title !== 'string' || !unit.title.trim()
      || typeof unit.text !== 'string' || unit.text.trim().length < 100
      || unit.sourceUrl !== SAMARITAN_CHRONICLE_SOURCE.sourceUrl
      || (knownSourceNumberVariants.has(chapter) && unit.sourceNumber !== knownSourceNumberVariants.get(chapter))
      || (!knownSourceNumberVariants.has(chapter) && unit.sourceNumber !== toRoman(chapter))
      || /[\u{1F300}-\u{1FAFF}]/u.test(unit.text)) {
      throw new Error(`ترقيم أو نص أو مصدر غير صالح في فصل التاريخ السامري ${chapter}`);
    }
  }
  if (!units.at(-1).text.trim().endsWith('..................')) {
    throw new Error('نهاية الفصل الأخير لا تطابق النص المطبوع غير المكتمل');
  }
  return units.map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text: text.trim(), sourceUrl }));
}

function toRoman(number) {
  const values = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let remainder = number;
  let roman = '';
  for (const [value, numeral] of values) {
    while (remainder >= value) {
      roman += numeral;
      remainder -= value;
    }
  }
  return roman;
}

function getSourceState(db) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type, bt.display_order,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bb.chapter_count AS book_chapter_count, bm.canonicality_status, bm.text_status,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code=? AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code=?
    LEFT JOIN bible_books bb ON bb.code=?
    LEFT JOIN bible_book_metadata bm ON bm.book_code=?
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(BOOK_CODE, SAMARITAN_CHRONICLE_SOURCE.nameAr, 'الإنجليزية', SAMARITAN_CHRONICLE_SOURCE.sourceUrl,
    SAMARITAN_CHRONICLE_SOURCE.sourceType, SOURCE_NOTES_AR, BOOK_CODE, BOOK_CODE, BOOK_CODE,
    SAMARITAN_CHRONICLE_SOURCE.translationSlug);
}

function sourceIsReady(state) {
  return state && state.language === 'en' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === SAMARITAN_CHRONICLE_SOURCE.sourceType
    && state.display_order === DISPLAY_ORDER
    && state.unit_count === 50 && state.chapter_count === 50 && state.book_chapter_count === 50
    && state.canonicality_status === 'apocryphal' && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, expected) {
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code=? ORDER BY chapter, verse
  `).all(translationId, BOOK_CODE);
  return JSON.stringify(actual) === JSON.stringify(expected.map(({ chapter, verse, text, sourceUrl }) => ({
    chapter, verse, text, source_url: sourceUrl
  })));
}

export async function ensureSamaritanChronicleImported() {
  const db = getDb();
  const book = db.prepare(`
    SELECT name_ar, name_en, chapter_count FROM bible_books WHERE code=?
  `).get(BOOK_CODE);
  if (!book || book.name_ar !== 'التاريخ السامري (كتاب يشوع)' || book.name_en !== 'The Samaritan Chronicle (Book of Joshua)') {
    throw new Error('سجل التاريخ السامري غير معرف في فهرس الأسفار');
  }
  const units = await readVerifiedUnits();
  const current = getSourceState(db);
  if (sourceIsReady(current) && await sourceUnitsMatch(db, current.id, units)) return false;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO bible_translations
        (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes,
         site_scope, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'both', 1, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
        language=excluded.language, source_url=excluded.source_url, source_type=excluded.source_type,
        source_notes=excluded.source_notes, site_scope='both', is_active=1, display_order=excluded.display_order
    `).run(SAMARITAN_CHRONICLE_SOURCE.translationSlug, SAMARITAN_CHRONICLE_SOURCE.nameAr,
      SAMARITAN_CHRONICLE_SOURCE.nameEn, SAMARITAN_CHRONICLE_SOURCE.abbreviation,
      SAMARITAN_CHRONICLE_SOURCE.language, SAMARITAN_CHRONICLE_SOURCE.sourceUrl,
      SAMARITAN_CHRONICLE_SOURCE.sourceType, SOURCE_NOTES_AR, DISPLAY_ORDER);
    const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?')
      .get(SAMARITAN_CHRONICLE_SOURCE.translationSlug).id;
    db.prepare('DELETE FROM bible_verses WHERE translation_id=? AND book_code=?').run(translationId, BOOK_CODE);
    const insertVerse = db.prepare(`
      INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const unit of units) {
      insertVerse.run(translationId, BOOK_CODE, unit.chapter, unit.verse, unit.text,
        normalizeArabicText(unit.text), unit.sourceUrl);
    }
    db.prepare(`
      UPDATE bible_book_metadata SET canonicality_status='apocryphal', text_status='partial',
        original_language='العربية عن تقليد عبري سامري', english_status='available',
        source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run(SAMARITAN_CHRONICLE_SOURCE.nameEn, SAMARITAN_CHRONICLE_SOURCE.scanUrl,
      SAMARITAN_CHRONICLE_SOURCE.notes, BOOK_CODE);
    db.prepare(`
      UPDATE bible_books SET chapter_count=50 WHERE code=?
    `).run(BOOK_CODE);
    db.prepare(`
      INSERT INTO bible_book_sources
        (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES (?, ?, ?, 'الإنجليزية', 'available', ?, ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
        label_en=excluded.label_en, availability_status='available',
        source_type=excluded.source_type, notes=excluded.notes
    `).run(BOOK_CODE, SAMARITAN_CHRONICLE_SOURCE.nameAr, SAMARITAN_CHRONICLE_SOURCE.nameEn,
      SAMARITAN_CHRONICLE_SOURCE.sourceType, SAMARITAN_CHRONICLE_SOURCE.sourceUrl, SOURCE_NOTES_AR);
  })();

  const imported = getSourceState(db);
  if (!sourceIsReady(imported) || !await sourceUnitsMatch(db, imported.id, units)) {
    throw new Error('تعذر تثبيت فصول التاريخ السامري الخمسين ومصدرها كما روجعت');
  }
  return true;
}
