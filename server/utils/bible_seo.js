import { getDb } from '../db/schema.js';
import { getBook } from './bible_service.js';

const MAX_DESCRIPTION_LENGTH = 165;

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength = MAX_DESCRIPTION_LENGTH) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trim()}…`;
}

function getRelativeBiblePath(pathname, appBasePath) {
  let relative = String(pathname || '').split('?')[0];
  if (appBasePath && relative.startsWith(appBasePath)) {
    relative = relative.slice(appBasePath.length);
  }
  return relative.replace(/^\/+|\/+$/g, '');
}

function getAvailableTranslation(db, bookCode) {
  return db.prepare(`
    SELECT bt.id, bt.slug, bt.name_ar, bt.language
    FROM bible_translations bt
    JOIN bible_verses bv ON bv.translation_id = bt.id
    WHERE bv.book_code = ?
      AND bt.is_active = 1
      AND (bt.site_scope = 'both' OR bt.site_scope = 'bible')
    ORDER BY bt.display_order, bt.id
    LIMIT 1
  `).get(bookCode);
}

export function getBibleSeoContext({ pathname, publicBaseUrl, appBasePath }) {
  const relative = getRelativeBiblePath(pathname, appBasePath);
  const parts = relative ? relative.split('/').filter(Boolean) : [];
  const code = parts[0] ? parts[0].toUpperCase() : null;
  const chapter = parts[1] && /^\d+$/.test(parts[1]) ? Number(parts[1]) : null;
  const verse = parts[2] && /^\d+$/.test(parts[2]) ? Number(parts[2]) : null;

  if (!code) {
    return {
      kind: 'home',
      url: publicBaseUrl,
      title: 'البيبل | Bible',
      description: 'البيبل باللغة العربية: تصفح الأسفار والأصحاحات والأعداد، وابحث وقارن الترجمات مع توثيق المرجع.',
      summary: 'موسوعة نصية لتصفح البيبل، قراءة الشواهد، البحث، والمقارنة بين الترجمات والتقاليد النصية.',
      book: null,
      chapter: null,
      verse: null
    };
  }

  const book = getBook(code);
  if (!book) return null;

  const db = getDb();
  const translation = getAvailableTranslation(db, code);
  const metadata = book.metadata || {};
  const summary = cleanText(metadata.summary_ar) || `نص ${book.name_ar} ضمن ${book.collection_name_ar || 'موسوعة البيبل'}.`;
  let excerpt = summary;
  let verseText = '';

  if (chapter && translation) {
    const rows = db.prepare(`
      SELECT verse, text
      FROM bible_verses
      WHERE translation_id = ? AND book_code = ? AND chapter = ?
      ORDER BY verse
      LIMIT 3
    `).all(translation.id, code, chapter);
    if (verse) {
      const selected = db.prepare(`
        SELECT text FROM bible_verses
        WHERE translation_id = ? AND book_code = ? AND chapter = ? AND verse = ?
      `).get(translation.id, code, chapter, verse);
      verseText = cleanText(selected?.text);
    }
    excerpt = verseText || rows.map((row) => cleanText(row.text)).filter(Boolean).join(' ') || summary;
  }

  const title = `${book.name_ar}${chapter ? ` — الإصحاح ${chapter}${verse ? `:${verse}` : ''}` : ''} | البيبل`;
  const description = truncate(
    verseText
      ? `${book.name_ar} ${chapter}:${verse}: ${verseText}`
      : chapter
        ? `${book.name_ar} — الإصحاح ${chapter}: ${excerpt}`
        : `${book.name_ar}: ${summary}`
  );
  const url = `${publicBaseUrl}${code}${chapter ? `/${chapter}` : ''}${verse ? `/${verse}` : ''}`;

  return {
    kind: verse ? 'verse' : chapter ? 'chapter' : 'book',
    url,
    title,
    description,
    summary,
    excerpt: truncate(excerpt, 400),
    book,
    chapter,
    verse,
    translation
  };
}
