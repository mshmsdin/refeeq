import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const BOOK_CODE = 'LADJAC';
const DISPLAY_ORDER = 1;
const SOURCE_PAGE_NUMBERS = [114, 115, 115, 116, 117, 118, 119, 120];

export const LADDER_OF_JACOB_SOURCE = {
  translationSlug: 'en-ladder-jacob-james-1920',
  textFile: new URL('../importers/data/ladder_jacob_james_1920_en.json', import.meta.url),
  sourceUrl: 'https://en.wikisource.org/wiki/The_Lost_Apocrypha_of_the_Old_Testament/The_Ladder_of_Jacob',
  scanUrl: 'https://archive.org/details/lostapocryphaofo00jameuoft',
  expectedSha256: '4933dd1784cde64775e235c193ecfb3a1133029ff89dcf4c2ff5b8e13395b877',
  expectedUnitCount: 8,
  expectedWordCount: 2445,
  sourceType: 'cc-by-sa-4.0',
  language: 'en',
  nameAr: 'ترجمة جيمس الإنجليزية القديمة (١٩٢٠)',
  nameEn: 'M. R. James English translation (1920)',
  abbreviation: 'LAD-JAC-1920',
  notes: 'ترجمة مونتاغيو رودس جيمس الإنجليزية المنشورة سنة ١٩٢٠ عن نصين سلافيين كنسيين قديمين لرواية سُلّم يعقوب. التفريغ الرقمي من ويكي مصدر مرخص بالمشاع الإبداعي: النسب، المشاركة بالمثل ٤٫٠؛ والترجمة القديمة متاحة من طبعة ١٩٢٠. يقسم النص المطبوع إلى ثمانية أقسام، مع فصل الشواهد: الرواية الأولى موصوفة بأنها محفوظة في مخطوط متضرر من سنة ١٤٩٤، وتظهر الرواية الثانية في قراءات موازية؛ القسمان ٧ و٨ مسيحيان ولا يوجدان إلا في الرواية الثانية. يسجل جيمس أسطرًا وفجوات ضائعة ويقول إن أقدم مخطوط ينتهي في القسم ٦، لذلك حالة النص جزئية، ولا يملأ هذا الاستيراد أي فجوة. يرى باحثون احتمال أصل يوناني عن سامي، لكن النص الباقي سلافي والترجمة إنجليزية عن السلافية. [التفريغ ورخصته](https://en.wikisource.org/wiki/The_Lost_Apocrypha_of_the_Old_Testament/The_Ladder_of_Jacob)؛ [طبعة جيمس المصورة سنة ١٩٢٠](https://archive.org/details/lostapocryphaofo00jameuoft).'
};

const SOURCE_NOTES_AR = 'ترجمة مونتاغيو رودس جيمس الإنجليزية المنشورة سنة ١٩٢٠ عن الرواية السلافية. تفريغ ويكي مصدر مرخص بالمشاع الإبداعي: النسب، المشاركة بالمثل ٤٫٠. يضم التفريغ الأقسام الثمانية المنشورة وقراءتي المخطوطين كما عرضهما جيمس؛ الرواية الأولى مبنية على مخطوط متضرر، وتنتهي في القسم ٦، بينما القسمان ٧ و٨ مسيحيان من الرواية الثانية وحدها. يحفظ النص علامات الأسطر والفجوات والملاحظات التحريرية المطبوعة، ولا يكمل المواضع الناقصة. الأصل الأبعد للغة غير محسوم؛ يذكر الباحثون احتمال وسيط يوناني وأصل سامي، لكن المخطوطات الباقية سلافية. [النص ورخصته](https://en.wikisource.org/wiki/The_Lost_Apocrypha_of_the_Old_Testament/The_Ladder_of_Jacob)؛ [المسح المصور](https://archive.org/details/lostapocryphaofo00jameuoft).';

async function readVerifiedUnits() {
  const raw = await readFile(LADDER_OF_JACOB_SOURCE.textFile, 'utf8');
  const hash = createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
  if (hash !== LADDER_OF_JACOB_SOURCE.expectedSha256) {
    throw new Error('بصمة تفريغ سُلّم يعقوب لا تطابق النسخة المدققة');
  }

  let units;
  try {
    units = JSON.parse(raw);
  } catch {
    throw new Error('ملف وحدات سُلّم يعقوب ليس بصيغة صحيحة');
  }
  if (!Array.isArray(units) || units.length !== LADDER_OF_JACOB_SOURCE.expectedUnitCount) {
    throw new Error('عدد أقسام سُلّم يعقوب لا يطابق الطبعة المدققة');
  }
  const wordCount = units.reduce((count, unit) => count + unit.text.trim().split(/\s+/u).filter(Boolean).length, 0);
  if (wordCount !== LADDER_OF_JACOB_SOURCE.expectedWordCount) {
    throw new Error(`عدد كلمات سُلّم يعقوب غير مطابق: ${wordCount}`);
  }

  for (const [index, unit] of units.entries()) {
    if (unit.chapter !== 1 || unit.verse !== index + 1 || typeof unit.title !== 'string' || !unit.title.trim()
      || typeof unit.text !== 'string' || unit.text.trim().length < 100
      || unit.sourceUrl !== `https://en.wikisource.org/wiki/Page:LostApocryphaOfTheOldTestamentMRJames.djvu/${SOURCE_PAGE_NUMBERS[index]}`
      || unit.text.includes('\uFFFD')) {
      throw new Error(`بيانات القسم ${index + 1} في سُلّم يعقوب غير مكتملة أو غير مطابقة للمصدر`);
    }
  }
  if (!units[5].text.includes('Here the oldest MS. ends')
    || !units[6].text.includes('What follows is Christian and is only in Rec. 2')) {
    throw new Error('يجب إبقاء حد الرواية القديمة وملحق الرواية الثانية ظاهراً في بيانات سُلّم يعقوب');
  }
  return units;
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
  `).get(BOOK_CODE, LADDER_OF_JACOB_SOURCE.nameAr, 'الإنجليزية', LADDER_OF_JACOB_SOURCE.sourceUrl,
    LADDER_OF_JACOB_SOURCE.sourceType, SOURCE_NOTES_AR, BOOK_CODE, BOOK_CODE, BOOK_CODE,
    LADDER_OF_JACOB_SOURCE.translationSlug);
}

function sourceIsReady(state) {
  return state && state.language === 'en' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === LADDER_OF_JACOB_SOURCE.sourceType
    && state.display_order === DISPLAY_ORDER
    && state.unit_count === 8 && state.chapter_count === 1 && state.book_chapter_count === 1
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

export async function ensureLadderOfJacobImported() {
  const db = getDb();
  const book = db.prepare('SELECT name_ar, name_en FROM bible_books WHERE code=?').get(BOOK_CODE);
  if (!book || book.name_ar !== 'سُلّم يعقوب' || book.name_en !== 'The Ladder of Jacob') {
    throw new Error('سجل سُلّم يعقوب غير معرف في فهرس الأسفار');
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
    `).run(LADDER_OF_JACOB_SOURCE.translationSlug, LADDER_OF_JACOB_SOURCE.nameAr,
      LADDER_OF_JACOB_SOURCE.nameEn, LADDER_OF_JACOB_SOURCE.abbreviation,
      LADDER_OF_JACOB_SOURCE.language, LADDER_OF_JACOB_SOURCE.sourceUrl,
      LADDER_OF_JACOB_SOURCE.sourceType, SOURCE_NOTES_AR, DISPLAY_ORDER);
    const translationId = db.prepare('SELECT id FROM bible_translations WHERE slug=?')
      .get(LADDER_OF_JACOB_SOURCE.translationSlug).id;
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
      UPDATE bible_book_metadata SET canonicality_status='apocryphal', textual_tradition='slavonic',
        original_language='السلافونية الكنسية', text_status='partial', english_status='available',
        source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run(LADDER_OF_JACOB_SOURCE.nameEn, LADDER_OF_JACOB_SOURCE.scanUrl,
      LADDER_OF_JACOB_SOURCE.notes, BOOK_CODE);
    db.prepare('UPDATE bible_books SET chapter_count=1 WHERE code=?').run(BOOK_CODE);
    db.prepare(`
      INSERT INTO bible_book_sources
        (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES (?, ?, ?, 'الإنجليزية', 'available', ?, ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
        label_en=excluded.label_en, availability_status='available',
        source_type=excluded.source_type, notes=excluded.notes
    `).run(BOOK_CODE, LADDER_OF_JACOB_SOURCE.nameAr, LADDER_OF_JACOB_SOURCE.nameEn,
      LADDER_OF_JACOB_SOURCE.sourceType, LADDER_OF_JACOB_SOURCE.sourceUrl, SOURCE_NOTES_AR);
  })();

  const imported = getSourceState(db);
  if (!sourceIsReady(imported) || !await sourceUnitsMatch(db, imported.id, units)) {
    throw new Error('تعذر تثبيت أقسام سُلّم يعقوب الثمانية ومصدرها كما روجعت');
  }
  return true;
}
