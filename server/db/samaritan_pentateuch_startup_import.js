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

export const SAMARITAN_HEBREW_SOURCE = {
  translationSlug: 'he-samaritan-caccht-tf-2026',
  sourceUrl: 'https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/tf/7.4.1/sign.tf',
  textFile: new URL('../importers/data/samaritan_pentateuch_textfabric_v7_4_1_he.json', import.meta.url),
  expectedSha256: '19e3dff6aded0719b1e687319af087367369a4fa41fad8313184539c74abfcc9',
  expectedUnitCount: 5841,
  sourceName: 'DT-UCPH CACCHT Samaritan Pentateuch Text-Fabric v7.4.1',
  nameAr: 'النص العبري السامري بالحرف العبري المربع — نسخة بيانات ٧٫٤٫١',
  notes: 'تفريغ ساكن بالحرف العبري المربع من مجموعة CACCHT Text-Fabric للتوراة السامرية، الإصدار ٧٫٤٫١، بواقع ٥٨٤١ وحدة في ١٨٧ إصحاحاً. مصدر النص مشروع السامريّات بجامعة هاله؛ ويعتمد مخطوط مكتبة تشستر بيتي ٧٥١ من التكوين إلى التثنية ٣٢:٣٦، ثم مخطوط جبل جرزيم ١ من التثنية ٣٢:٣٦ب إلى نهاية السفر. المصدر يعلن رخصة المشاع الإبداعي: النسب، غير تجاري، الإصدار ٤٫٠؛ النسبة إلى كريستيان كانو هويغارد ومارتين نايير وستيفان شورخ، مع بيانات المصدر في ملف المستودع. هذا شاهد مستقل عن ترجمة فلورنتين وتال الإنجليزية التي تتبع مخطوط نابلس ٦؛ لا تُدمج فروق الترقيم أو القراءات بينهما. الأعداد غير الموجودة في تقسيم هذا الإصدار هي خروج ٣٠:١–١٠، وتثنية ٣٤:٢–٣؛ لا تُنشأ وحدات لها من التخمين، وقد حفظت الفقرات المنقولة إلى خروج ٢٦:٣٥ ضمن نص ذلك العدد. [ملف الحروف ورخصته](https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/tf/7.4.1/sign.tf)؛ [تعريف بيانات الشاهد والمخطوطات](https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/README.md)؛ [الرخصة](https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/LICENSE)؛ [بيانات الإصدار والاستشهاد](https://doi.org/10.5281/zenodo.7734632).',
  books: [
    { code: 'SAM-GEN', chapterCount: 50, unitCount: 1533 },
    { code: 'SAM-EXO', chapterCount: 40, unitCount: 1203 },
    { code: 'SAM-LEV', chapterCount: 27, unitCount: 859 },
    { code: 'SAM-NUM', chapterCount: 36, unitCount: 1289 },
    { code: 'SAM-DEU', chapterCount: 34, unitCount: 957 }
  ]
};

const EXPECTED_MISSING = new Set([
  'SAM-EXO:28:38', 'SAM-EXO:29:21',
  ...Array.from({ length: 10 }, (_, index) => `SAM-EXO:30:${index + 1}`),
  'SAM-EXO:37:2', 'SAM-DEU:7:22', 'SAM-DEU:34:2', 'SAM-DEU:34:3'
]);

const SOURCE_NOTES_AR = `يتوفر في المشروع شاهدان مستقلان للتوراة السامرية. الترجمة الإنجليزية الكاملة بحسب متن طبعة فلورنتين وتال (٢٠٢٤)، الصفحات المطبوعة ٨٥–٨٩٦، تتبع مخطوط نابلس ٦؛ وملف الطبعة يصرح برخصة المشاع الإبداعي: النسب، غير تجاري، الإصدار ٤٫٠، والنسبة إلى موشيه فلورنتين وأبراهام تال. أما النص العبري السامري الساكن بالحرف العبري المربع فهو تفريغ مجموعة CACCHT Text-Fabric ٧٫٤٫١، المستندة إلى مخطوط مكتبة تشستر بيتي ٧٥١ من التكوين إلى التثنية ٣٢:٣٦، ومخطوط جبل جرزيم ١ لبقية التثنية؛ ويصرح المصدر برخصة المشاع الإبداعي: النسب، غير تجاري، الإصدار ٤٫٠. الشاهدان مختلفان ولا تُدمج قراءاتهما أو ترقيمهما. تحفظ وحدات كل شاهد رابط الصفحة أو موضع المصدر. في الترجمة الإنجليزية، تُدرج الفقرات المقابلة لخروج ٣٠:١–١٠ تحت خروج ٢٦:٣٥ وفق حاشية الطبعة، وتُحفظ بقية فروق الترقيم والمواضع الفارغة كما في المصدر. وفي النص العبري، لا تظهر أعداد مستقلة لخروج ٣٠:١–١٠ وتثنية ٣٤:٢–٣؛ لا تُنشأ وحدات بديلة أو نصوص مخترعة. حُفظت هذه الفروق لتكون القراءة كاملة بحسب كل شاهد وتقسيمه المنشور. [طبعة فلورنتين وتال ورخصتها](https://www.openbookpublishers.com/books/10.11647/OBP.0415)؛ [بيانات وترخيص مجموعة CACCHT](https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/README.md)؛ [الرخصة](https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/LICENSE).`;

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

async function readVerifiedHebrewUnits() {
  const raw = await readFile(SAMARITAN_HEBREW_SOURCE.textFile, 'utf8');
  const hash = createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
  if (hash !== SAMARITAN_HEBREW_SOURCE.expectedSha256) {
    throw new Error('بصمة تفريغ التوراة السامرية العبري لا تطابق النسخة المدققة');
  }
  let units;
  try {
    units = JSON.parse(raw);
  } catch {
    throw new Error('ملف وحدات التوراة السامرية العبري ليس بصيغة صحيحة');
  }
  if (!Array.isArray(units) || units.length !== SAMARITAN_HEBREW_SOURCE.expectedUnitCount) {
    throw new Error('عدد وحدات النص العبري السامري لا يطابق النسخة المدققة');
  }

  const bookMap = new Map(SAMARITAN_HEBREW_SOURCE.books.map((book) => [book.code, book]));
  const seen = new Set();
  const chapterSets = new Map();
  const bookCounts = new Map();
  const expectedSourcePrefix = 'https://github.com/DT-UCPH/sp/blob/e8a120f2e92b6558fd39bbe72f830ded871a0a47/tf/7.4.1/sign.tf#L';
  let previousOrder = -1;
  for (const unit of units) {
    const book = bookMap.get(unit.bookCode);
    const sourceLines = /#L(\d+)-L(\d+)$/.exec(unit.sourceUrl || '');
    const key = `${unit.bookCode}:${unit.chapter}:${unit.verse}`;
    const bookIndex = SAMARITAN_HEBREW_SOURCE.books.findIndex((item) => item.code === unit.bookCode);
    const order = bookIndex * 10000000 + unit.chapter * 100000 + unit.verse;
    if (!book || !Number.isInteger(unit.chapter) || unit.chapter < 1 || unit.chapter > book.chapterCount
      || !Number.isInteger(unit.verse) || unit.verse < 1 || !sourceLines
      || !unit.sourceUrl.startsWith(expectedSourcePrefix) || Number(sourceLines[1]) < 16
      || Number(sourceLines[2]) < Number(sourceLines[1]) || Number(sourceLines[2]) > 399408
      || typeof unit.text !== 'string' || !unit.text.trim()
      || !/^[\u05D0-\u05EA\s]+$/u.test(unit.text) || seen.has(key) || order <= previousOrder) {
      throw new Error(`ترقيم أو حروف أو رابط مصدر غير صالح في النص العبري السامري ${key}`);
    }
    seen.add(key);
    previousOrder = order;
    bookCounts.set(unit.bookCode, (bookCounts.get(unit.bookCode) || 0) + 1);
    if (!chapterSets.has(unit.bookCode)) chapterSets.set(unit.bookCode, new Map());
    if (!chapterSets.get(unit.bookCode).has(unit.chapter)) chapterSets.get(unit.bookCode).set(unit.chapter, new Set());
    chapterSets.get(unit.bookCode).get(unit.chapter).add(unit.verse);
  }

  for (const book of SAMARITAN_HEBREW_SOURCE.books) {
    const chapters = chapterSets.get(book.code);
    if (bookCounts.get(book.code) !== book.unitCount || chapters?.size !== book.chapterCount
      || Array.from({ length: book.chapterCount }, (_, index) => index + 1).some((chapter) => !chapters.has(chapter))) {
      throw new Error(`عدد وحدات أو فصول النص العبري في ${book.code} لا يطابق النسخة المدققة`);
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
  const expectedMissing = new Set([
    ...Array.from({ length: 10 }, (_, index) => `SAM-EXO:30:${index + 1}`),
    'SAM-DEU:34:2', 'SAM-DEU:34:3'
  ]);
  if (actualMissing.size !== expectedMissing.size
    || [...expectedMissing].some((location) => !actualMissing.has(location))) {
    throw new Error('مواضع الأعداد غير المفردة في المصدر العبري السامري لا تطابق النسخة المدققة');
  }
  const relocatedPassage = units.find((unit) => unit.bookCode === 'SAM-EXO' && unit.chapter === 26 && unit.verse === 35)?.text || '';
  if (!relocatedPassage.includes('מזבח מקטיר') || !relocatedPassage.includes('ועשית')) {
    throw new Error('لم يُعثر على نص موضع خروج ٣٠ المنقول في خروج ٢٦:٣٥ في الشاهد العبري');
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
    const englishSource = db.prepare(`
      SELECT 1 FROM bible_book_sources WHERE book_code=? AND label_ar=? AND language='الإنجليزية'
        AND source_url=? AND source_type='parallel-text' AND availability_status='available' AND notes=?
    `).get(book.code, SAMARITAN_PENTATEUCH_SOURCE.nameAr, PDF_URL, SAMARITAN_PENTATEUCH_SOURCE.notes);
    const hebrewSource = db.prepare(`
      SELECT 1 FROM bible_book_sources WHERE book_code=? AND label_ar=? AND language='العبرية'
        AND source_url=? AND source_type='parallel-text' AND availability_status='available' AND notes=?
    `).get(book.code, SAMARITAN_HEBREW_SOURCE.nameAr, SAMARITAN_HEBREW_SOURCE.sourceUrl, SAMARITAN_HEBREW_SOURCE.notes);
    return metadata?.text_status === 'complete' && metadata.english_status === 'available'
      && metadata.textual_tradition === 'sam'
      && metadata.original_language === 'العبرية السامرية بالحرف العبري المربع'
      && metadata.summary_ar === SAMARITAN_HEBREW_SOURCE.notes
      && metadata.source_name === SAMARITAN_HEBREW_SOURCE.sourceName
      && metadata.source_url === SAMARITAN_HEBREW_SOURCE.sourceUrl
      && metadata.source_notes === SAMARITAN_HEBREW_SOURCE.notes
      && Boolean(englishSource) && Boolean(hebrewSource);
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

function translationIsReady(db, translation, units, language) {
  if (!translation || translation.language !== language || translation.is_active !== 1 || translation.site_scope !== 'both'
    || translation.source_type !== 'cc-by-nc-4.0') return false;
  const count = db.prepare('SELECT COUNT(*) AS count FROM bible_verses WHERE translation_id=?').get(translation.id).count;
  return count === units.length;
}

export async function ensureSamaritanPentateuchImported() {
  const db = getDb();
  const englishUnits = await readVerifiedUnits();
  const hebrewUnits = await readVerifiedHebrewUnits();
  const witnesses = [
    { source: SAMARITAN_PENTATEUCH_SOURCE, units: englishUnits, language: 'en', abbreviation: 'SP-FT-2024', displayOrder: 2, url: PDF_URL },
    { source: SAMARITAN_HEBREW_SOURCE, units: hebrewUnits, language: 'he', abbreviation: 'SP-CACCHT-2026', displayOrder: 3, url: SAMARITAN_HEBREW_SOURCE.sourceUrl }
  ];
  const getTranslation = db.prepare(`
    SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE slug=?
  `);
  const currentTranslations = witnesses.map(({ source, units, language }) => ({
    source, units, language, translation: getTranslation.get(source.translationSlug)
  }));
  if (currentTranslations.every(({ units, language, translation }) => translationIsReady(db, translation, units, language))
    && metadataIsReady(db)
    && (await Promise.all(currentTranslations.map(({ units, translation }) => importedUnitsMatch(db, translation.id, units))))
      .every(Boolean)) return false;

  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes,
        site_scope, is_active, display_order, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, 'cc-by-nc-4.0', ?, 'both', 1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language, source_url=excluded.source_url, source_type=excluded.source_type,
      source_notes=excluded.source_notes, site_scope='both', is_active=1,
      display_order=excluded.display_order, updated_at=CURRENT_TIMESTAMP
  `);
  const translationIds = db.transaction(() => {
    const ids = new Map();
    const insertVerse = db.prepare(`
      INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const { source, units, language, abbreviation, displayOrder, url } of witnesses) {
      insertTranslation.run(source.translationSlug, source.nameAr, source.sourceName, abbreviation,
        language, url, source.notes, displayOrder);
      const id = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.translationSlug).id;
      ids.set(source.translationSlug, id);
      db.prepare('DELETE FROM bible_verses WHERE translation_id=?').run(id);
      for (const unit of units) {
        insertVerse.run(id, unit.bookCode, unit.chapter, unit.verse, unit.text.trim(),
          unit.text.trim().toLocaleLowerCase('en'), unit.sourceUrl);
      }
    }

    const updateMetadata = db.prepare(`
      UPDATE bible_book_metadata SET textual_tradition='sam',
        original_language='العبرية السامرية بالحرف العبري المربع', text_status='complete', english_status='available',
        summary_ar=?, source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP WHERE book_code=?
    `);
    const upsertSource = db.prepare(`
      INSERT INTO bible_book_sources (book_code, label_ar, label_en, language, availability_status,
        source_type, source_url, notes)
      VALUES (?, ?, ?, ?, 'available', 'parallel-text', ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET label_en=excluded.label_en,
        availability_status='available', source_type='parallel-text', notes=excluded.notes
    `);
    for (const book of SAMARITAN_PENTATEUCH_SOURCE.books) {
      updateMetadata.run(SAMARITAN_HEBREW_SOURCE.notes, SAMARITAN_HEBREW_SOURCE.sourceName,
        SAMARITAN_HEBREW_SOURCE.sourceUrl, SAMARITAN_HEBREW_SOURCE.notes, book.code);
      upsertSource.run(book.code, SAMARITAN_PENTATEUCH_SOURCE.nameAr, SAMARITAN_PENTATEUCH_SOURCE.sourceName,
        'الإنجليزية', PDF_URL, SAMARITAN_PENTATEUCH_SOURCE.notes);
      upsertSource.run(book.code, SAMARITAN_HEBREW_SOURCE.nameAr, SAMARITAN_HEBREW_SOURCE.sourceName,
        'العبرية', SAMARITAN_HEBREW_SOURCE.sourceUrl, SAMARITAN_HEBREW_SOURCE.notes);
    }
    return ids;
  })();

  const updatedTranslations = witnesses.map(({ source, units, language }) => ({
    units,
    language,
    translation: db.prepare(`
      SELECT id, language, is_active, site_scope, source_type FROM bible_translations WHERE id=?
    `).get(translationIds.get(source.translationSlug))
  }));
  if (!updatedTranslations.every(({ translation, units, language }) => translationIsReady(db, translation, units, language))
    || !metadataIsReady(db)
    || !(await Promise.all(updatedTranslations.map(({ translation, units }) => importedUnitsMatch(db, translation.id, units))))
      .every(Boolean)) {
    throw new Error('لم تتطابق وحدات التوراة السامرية ومصادرها بعد الاستيراد');
  }
  return true;
}
