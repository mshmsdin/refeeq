/**
 * استيراد نصوص إنجليزية كاملة من طبعات قديمة معلنة الملكية العامة.
 * تُحفظ النصوص بوحدة واحدة لكل إصحاح لأن هذه الأعمال لا تملك تقسيماً موحداً
 * إلى أعداد في المصادر المختارة.
 */

import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const SOURCES = [
  {
    bookCode: 'ENO',
    slug: 'en-charles-enoch',
    nameAr: 'ترجمة تشارلز الإنجليزية لسفر أخنوخ الأول',
    nameEn: 'R. H. Charles English 1 Enoch',
    abbreviation: 'ENO-EN',
    url: 'https://enocharchive.com/books/the-book-of-enoch/{chapter}',
    kind: 'structured-html',
    maxChapter: 108,
    language: 'en',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز، طبعة 1917، من نسخة منظمة تنقل النص الإنجليزي المعلن ملكيته العامة.'
  },
  {
    bookCode: 'JUB',
    slug: 'en-charles-jubilees',
    nameAr: 'ترجمة تشارلز الإنجليزية لسفر اليوبيلات',
    nameEn: 'R. H. Charles English Jubilees',
    abbreviation: 'JUB-EN',
    url: 'https://enocharchive.com/books/the-book-of-jubilees/{chapter}',
    kind: 'structured-html',
    maxChapter: 50,
    language: 'en',
    sourceType: 'public-domain-text',
    notes: 'ترجمة آر. هـ. تشارلز، طبعة 1902، من نسخة منظمة تنقل النص الإنجليزي المعلن ملكيته العامة.'
  },
  {
    bookCode: 'DIDAS',
    slug: 'en-gibson-didascalia',
    nameAr: 'الترجمة الإنجليزية لغيبسون للدسقولية الرسولية',
    nameEn: 'Margaret Dunlop Gibson English Didascalia',
    abbreviation: 'DID-EN',
    url: 'https://archive.org/download/didascaliaaposto00gibsuoft/didascaliaaposto00gibsuoft_djvu.txt',
    anchor: '\nCHAPTER   I.',
    maxChapter: 26,
    language: 'en',
    sourceType: 'public-domain-text',
    notes: 'ترجمة مارغريت دنلوب غيبسون من السريانية، طبعة 1903، من نسخة أرشيفية معلنة الملكية العامة.'
  },
  {
    bookCode: 'ENO',
    slug: 'gez-dillmann-enoch',
    nameAr: 'النص الجعزي لأخنوخ الأول',
    nameEn: 'August Dillmann Digital Ethiopic 1 Enoch',
    abbreviation: 'ENO-GEZ',
    url: 'https://www.tau.ac.il/~hacohen/Henoch/Henoch%201.html',
    kind: 'tau-ethiopic-html',
    maxChapter: 108,
    language: 'gez',
    sourceType: 'critical-ethiopic',
    notes: 'نسخة رقمية من طبعة أغسطس دِلمن الجعزية المنشورة في 1851، بصفحة مستقلة لكل إصحاح حتى الإصحاح 108؛ تحفظ هذه النسخة وحدة نصية واحدة لكل إصحاح لأن صفحات المصدر لا تقدم تقسيماً عددياً موحداً.'
  },
  {
    bookCode: 'MOS',
    slug: 'en-charles-assumption-moses',
    nameAr: 'الترجمة الإنجليزية لصعود موسى / وصية موسى',
    nameEn: 'R. H. Charles English Assumption of Moses',
    abbreviation: 'MOS-EN',
    url: 'https://www.sacredthings.org/docs/assumption-1/',
    kind: 'sacredthings-html',
    maxChapter: 12,
    language: 'en',
    sourceType: 'html',
    notes: 'نص إنجليزي منسوب إلى طبعة آر. هـ. تشارلز، مع التنبيه إلى أن المخطوط الباقي ناقص وأن الاسم الأكاديمي الشائع هو وصية موسى.'
  },
  {
    bookCode: 'MOS',
    slug: 'la-ocp-assumption-moses',
    nameAr: 'الشاهد اللاتيني لصعود موسى',
    nameEn: 'OCP Latin Assumption of Moses',
    abbreviation: 'MOS-LA',
    url: 'https://raw.githubusercontent.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha/master/static/docs/Mois.xml',
    kind: 'ocp-xml',
    maxChapter: 12,
    language: 'la',
    sourceType: 'tei-xml',
    notes: 'الشاهد اللاتيني الإلكتروني من Online Critical Pseudepigrapha، مع حفظ التقسيم الإصحاحي والعددي للشاهد.'
  }
];

function romanToNumber(value) {
  const digits = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = digits[value[index]];
    const next = digits[value[index + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Rafeeq-Bible-Importer/1.0' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[Illustration[^\]]*\]/gi, '')
    .trim();
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)));
}

function cleanHtmlVerse(html) {
  return cleanText(decodeHtml(html
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<span[^>]*class="[^"]*dropcap-fallback[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span[^>]*class="[^"]*verse-link-icon[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<sup[^>]*class="[^"]*verse-number[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, ' ')));
}

async function parseStructuredHtmlChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const html = await fetchText(source.url.replace('{chapter}', String(chapter)));
    const container = html.match(/<div class="chapter-text">([\s\S]*?)<\/div>/i)?.[1];
    if (!container) throw new Error(`لم يُعثر على نص الإصحاح ${chapter} في ${source.slug}`);
    const verses = [...container.matchAll(/<p[^>]*class="[^"]*\bverse\b[^"]*"[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match, index) => {
        const verse = Number(match[1].match(/<sup[^>]*class="[^"]*verse-number[^"]*"[^>]*>\s*(\d+)\s*<\/sup>/i)?.[1] || index + 1);
        return { chapter, verse, text: cleanHtmlVerse(match[1]) };
      })
      .filter((row) => row.text.length > 10);
    if (!verses.length) throw new Error(`لم تُكتشف أعداد الإصحاح ${chapter} في ${source.slug}`);
    chapters.push(...verses);
  }
  return chapters;
}

function stripHtml(html) {
  return cleanText(decodeHtml(html.replace(/<[^>]+>/g, ' ')));
}

async function parseSacredThingsChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const url = chapter === 1
      ? source.url
      : `https://www.sacredthings.org/docs/assumption-${chapter}`;
    const html = await fetchText(url);
    const verses = [...html.matchAll(/<p>\s*<strong>(\d+)<\/strong>\s*([\s\S]*?)<\/p>/gi)]
      .map((match) => ({
        chapter,
        verse: Number(match[1]),
        text: stripHtml(match[2]),
        sourceUrl: url
      }))
      .filter((row) => row.text.length > 10);
    if (!verses.length) throw new Error(`لم تُكتشف أعداد الإصحاح ${chapter} في ${source.slug}`);
    chapters.push(...verses);
  }
  return chapters;
}

async function parseTauEthiopicChapters(source) {
  const chapters = [];
  for (let chapter = 1; chapter <= source.maxChapter; chapter += 1) {
    const url = chapter === 1
      ? source.url
      : `https://www.tau.ac.il/~hacohen/Henoch/Henoch%20${chapter}.html`;
    const html = await fetchText(url);
    const paragraph = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => match[1])
      .find((value) => value.includes('Cap.'));
    const text = stripHtml(paragraph || '').replace(new RegExp(`^${chapter}\\s+`), '').trim();
    if (text.length < 20) throw new Error(`لم يُكتشف نص الإصحاح ${chapter} في ${source.slug}`);
    chapters.push({ chapter, verse: 1, text, sourceUrl: url });
  }
  return chapters;
}

function parseOcpChapters(xml, source) {
  const version = xml.match(new RegExp(`<version\\b[^>]*language="${source.language === 'gez' ? 'Ethiopic' : 'Latin'}"[\\s\\S]*?<\\/version>`, 'i'))?.[0];
  if (!version) throw new Error(`لم يُعثر على النسخة اللغوية في ${source.slug}`);
  const textStart = version.indexOf('<text>');
  if (textStart < 0) throw new Error(`لم يُعثر على قسم النص في ${source.slug}`);
  const body = version.slice(textStart);
  const tokenPattern = /<div\s+number="(\d+)"\s*>|<\/div\s*>|<unit\b[^>]*>|<\/unit\s*>|<reading\b[^>]*option="(\d+)"[^>]*>([\s\S]*?)<\/reading\s*>/gi;
  const chapters = [];
  let depth = 0;
  let currentChapter = null;
  let currentVerse = null;
  let currentParts = [];
  let currentUnitReadings = [];
  for (const match of body.matchAll(tokenPattern)) {
    if (match[1]) {
      const number = Number(match[1]);
      if (depth === 0) currentChapter = number;
      if (depth === 1) {
        currentVerse = number;
        currentParts = [];
      }
      depth += 1;
      continue;
    }
    if (match[0].startsWith('</div')) {
      if (depth === 2 && currentChapter && currentVerse) {
        const text = cleanText(currentParts.join(' '));
        if (text.length > 2) chapters.push({ chapter: currentChapter, verse: currentVerse, text, sourceUrl: source.url });
        currentVerse = null;
        currentParts = [];
      }
      depth -= 1;
      if (depth === 0) currentChapter = null;
      continue;
    }
    if (match[0].startsWith('<unit')) {
      currentUnitReadings = [];
      continue;
    }
    if (match[0].startsWith('</unit')) {
      const selected = currentUnitReadings.find((reading) => reading.option === 0) || currentUnitReadings[0];
      if (selected) currentParts.push(decodeHtml(selected.text));
      currentUnitReadings = [];
      continue;
    }
    if (match[2] !== undefined) {
      currentUnitReadings.push({ option: Number(match[2]), text: match[3] });
    }
  }
  const chaptersSeen = new Set(chapters.map((row) => row.chapter));
  if (chaptersSeen.size !== source.maxChapter) {
    throw new Error(`اكتُشف ${chaptersSeen.size} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return chapters;
}

async function parseChapters(content, source) {
  if (source.kind === 'structured-html') return parseStructuredHtmlChapters(source);
  if (source.kind === 'sacredthings-html') return parseSacredThingsChapters(source);
  if (source.kind === 'tau-ethiopic-html') return parseTauEthiopicChapters(source);
  if (source.kind === 'ocp-xml') return parseOcpChapters(content, source);
  const start = content.indexOf(source.anchor);
  if (start < 0) throw new Error(`لم يُعثر على بداية النص في ${source.slug}`);
  const body = content.slice(start);
  const pattern = source.bookCode === 'DIDAS'
    ? /(?:^|\n)CHAPTER\s+([IVXLCDM]+)\./gi
    : /(?:^|\n)\s*([IVXLCDM]+)\.\s+/g;
  const headings = [];
  for (const match of body.matchAll(pattern)) {
    const chapter = romanToNumber(match[1].toUpperCase());
    if (chapter === headings.length + 1 && chapter <= source.maxChapter) {
      headings.push({ chapter, start: match.index + match[0].length });
    }
  }
  if (headings.length !== source.maxChapter) {
    throw new Error(`اكتُشف ${headings.length} إصحاحاً فقط في ${source.slug}، والمتوقع ${source.maxChapter}`);
  }
  return headings.map((heading, index) => ({
    chapter: heading.chapter,
    verse: 1,
    text: cleanText(body.slice(heading.start, headings[index + 1]?.start || body.length))
  })).filter((row) => row.text.length > 40);
}

async function run() {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  const insertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language,
      source_url=excluded.source_url, source_type=excluded.source_type, source_notes=excluded.source_notes,
      site_scope='bible', is_active=1
  `);
  const insertVerse = db.prepare(`
    INSERT INTO bible_verses
      (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(translation_id, book_code, chapter, verse)
    DO UPDATE SET text=excluded.text, search_text=excluded.search_text, source_url=excluded.source_url, imported_at=CURRENT_TIMESTAMP
  `);
  const insertMany = db.transaction((rows) => rows.forEach((row) => insertVerse.run(...row)));
  const legacyEthiopic = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('gez-ocp-enoch');
  if (legacyEthiopic) {
    db.prepare('UPDATE bible_translations SET is_active=0 WHERE id=?').run(legacyEthiopic.id);
  }

  for (const [index, source] of SOURCES.entries()) {
    const result = insertTranslation.run(
      source.slug, source.nameAr, source.nameEn, source.abbreviation,
      source.language, source.url, source.sourceType, source.notes, 40 + index
    );
    const translationId = result.lastInsertRowid || db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(source.slug).id;
    const content = ['structured-html', 'sacredthings-html'].includes(source.kind)
      ? null
      : await fetchText(source.url);
    const parsedChapters = await parseChapters(content, source);
    const rows = parsedChapters.map((chapter) => [
      translationId, source.bookCode, chapter.chapter, chapter.verse, chapter.text,
      normalizeArabicText(chapter.text), chapter.sourceUrl || source.url
    ]);
    insertMany(rows);
    db.prepare('UPDATE bible_books SET chapter_count = CASE WHEN chapter_count < ? THEN ? ELSE chapter_count END WHERE code=?')
      .run(source.maxChapter, source.maxChapter, source.bookCode);
    db.prepare(`
      UPDATE bible_book_metadata
      SET text_status='complete', english_status=CASE WHEN ?='en' THEN 'available' ELSE english_status END,
          source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP
      WHERE book_code=?
    `).run(source.language, source.nameEn, source.url, source.notes, source.bookCode);
    db.prepare('UPDATE bible_translations SET imported_at=CURRENT_TIMESTAMP WHERE id=?').run(translationId);
    console.log(`[Bible] ${source.slug}: ${new Set(parsedChapters.map((row) => row.chapter)).size} إصحاحاً، ${rows.length} وحدة`);
  }
}

run().catch((error) => {
  console.error('[Bible noncanonical import]', error.message);
  process.exit(1);
});
