/**
 * Bible Query Service — all DB reads for the Bible module
 */

import { getDb } from '../db/schema.js';
import { normalizeArabicText } from './arabic_nlp.js';
import { parseReference } from './bible_reference_parser.js';
import { BOOK_CANON_DATA, getCanonInfoForBook } from './bible_canon_data.js';

// ── Translations ───────────────────────────────────────────────────────────

export function getTranslations() {
  return getDb().prepare(`
    SELECT * FROM bible_translations WHERE is_active = 1 ORDER BY display_order, id
  `).all();
}

export function getTranslationBySlug(slug) {
  return getDb().prepare('SELECT * FROM bible_translations WHERE slug = ?').get(slug);
}

// ── Collections ────────────────────────────────────────────────────────────

export function getCollections() {
  return getDb().prepare('SELECT * FROM bible_collections ORDER BY display_order').all();
}

// ── Books ─────────────────────────────────────────────────────────────────

export function getBooks(collectionSlug) {
  const db = getDb();
  let rows = [];
  if (collectionSlug) {
    rows = db.prepare(`
      WITH RankedBooks AS (
        SELECT 
          bb.*, 
          ROW_NUMBER() OVER (ORDER BY bc.display_order, bb.canonical_order, bb.id) as book_number,
          ROW_NUMBER() OVER (PARTITION BY bb.collection_id ORDER BY bb.canonical_order, bb.id) as collection_book_number,
          bc.slug as collection_slug, 
          bc.name_ar as collection_name_ar
        FROM bible_books bb
        JOIN bible_collections bc ON bb.collection_id = bc.id
      )
      SELECT * FROM RankedBooks
      WHERE collection_slug = ?
      ORDER BY book_number
    `).all(collectionSlug);
  } else {
    rows = db.prepare(`
      WITH RankedBooks AS (
        SELECT 
          bb.*, 
          ROW_NUMBER() OVER (ORDER BY bc.display_order, bb.canonical_order, bb.id) as book_number,
          ROW_NUMBER() OVER (PARTITION BY bb.collection_id ORDER BY bb.canonical_order, bb.id) as collection_book_number,
          bc.slug as collection_slug, 
          bc.name_ar as collection_name_ar
        FROM bible_books bb
        JOIN bible_collections bc ON bb.collection_id = bc.id
      )
      SELECT * FROM RankedBooks
      ORDER BY book_number
    `).all();
  }

  // Pre-fetch available translation slugs for all books
  const transMap = new Map();
  try {
    const transRows = db.prepare(`
      SELECT DISTINCT bv.book_code, bt.slug
      FROM bible_verses bv
      JOIN bible_translations bt ON bv.translation_id = bt.id
    `).all();
    for (const r of transRows) {
      if (!transMap.has(r.book_code)) transMap.set(r.book_code, []);
      transMap.get(r.book_code).push(r.slug);
    }
  } catch (e) {
    console.error('Error fetching available translations map:', e.message);
  }

  // Attach is_disputed and available_translations
  return rows.map(b => ({
    ...b,
    is_disputed: !!BOOK_CANON_DATA[b.code]?.is_disputed,
    available_translations: transMap.get(b.code) || []
  }));
}

export function getBook(code) {
  const db = getDb();
  const book = db.prepare(`
    WITH RankedBooks AS (
      SELECT 
        bb.*, 
        ROW_NUMBER() OVER (ORDER BY bc.display_order, bb.canonical_order, bb.id) as book_number,
        ROW_NUMBER() OVER (PARTITION BY bb.collection_id ORDER BY bb.canonical_order, bb.id) as collection_book_number,
        bc.slug as collection_slug, 
        bc.name_ar as collection_name_ar
      FROM bible_books bb
      JOIN bible_collections bc ON bb.collection_id = bc.id
    )
    SELECT * FROM RankedBooks
    WHERE code = ?
  `).get(code);

  if (!book) return null;

  // Query which translations have verses for this book
  const transRows = db.prepare(`
    SELECT DISTINCT bt.slug
    FROM bible_verses bv
    JOIN bible_translations bt ON bv.translation_id = bt.id
    WHERE bv.book_code = ?
  `).all(code);

  const canonInfo = getCanonInfoForBook(code);

  return {
    ...book,
    is_disputed: canonInfo.is_disputed,
    canon_info: canonInfo,
    available_translations: transRows.map(r => r.slug)
  };
}



// ── Chapters ──────────────────────────────────────────────────────────────

export function getChapterList(translationId, bookCode) {
  return getDb().prepare(`
    SELECT DISTINCT chapter FROM bible_verses
    WHERE translation_id = ? AND book_code = ?
    ORDER BY chapter
  `).all(translationId, bookCode);
}

// ── Verses ────────────────────────────────────────────────────────────────

export function getChapter(translationId, bookCode, chapter) {
  return getDb().prepare(`
    SELECT * FROM bible_verses
    WHERE translation_id = ? AND book_code = ? AND chapter = ?
    ORDER BY verse
  `).all(translationId, bookCode, chapter);
}

export function getVerse(translationId, bookCode, chapter, verse) {
  return getDb().prepare(`
    SELECT * FROM bible_verses
    WHERE translation_id = ? AND book_code = ? AND chapter = ? AND verse = ?
  `).get(translationId, bookCode, chapter, verse);
}

export function getVerseRange(translationId, bookCode, chapter, verseStart, verseEnd) {
  return getDb().prepare(`
    SELECT * FROM bible_verses
    WHERE translation_id = ? AND book_code = ? AND chapter = ?
      AND verse >= ? AND verse <= ?
    ORDER BY verse
  `).all(translationId, bookCode, chapter, verseStart, verseEnd);
}

export function getVerseAcrossTranslations(bookCode, chapter, verse, translationIds) {
  if (!translationIds || translationIds.length === 0) return [];
  const db = getDb();
  const placeholders = translationIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT bv.*, bt.name_ar as translation_name, bt.slug as translation_slug, bt.abbreviation as translation_abbr
    FROM bible_verses bv
    JOIN bible_translations bt ON bv.translation_id = bt.id
    WHERE bv.book_code = ? AND bv.chapter = ? AND bv.verse = ?
      AND bv.translation_id IN (${placeholders})
    ORDER BY bt.display_order
  `).all(bookCode, chapter, verse, ...translationIds);
}

export function getChapterAcrossTranslations(bookCode, chapter, translationIds) {
  if (!translationIds || translationIds.length === 0) return [];
  const db = getDb();
  const placeholders = translationIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT bv.*, bt.name_ar as translation_name, bt.slug as translation_slug, bt.abbreviation as translation_abbr
    FROM bible_verses bv
    JOIN bible_translations bt ON bv.translation_id = bt.id
    WHERE bv.book_code = ? AND bv.chapter = ?
      AND bv.translation_id IN (${placeholders})
    ORDER BY bv.verse, bt.display_order
  `).all(bookCode, chapter, ...translationIds);
}


// ── Navigation ────────────────────────────────────────────────────────────

/**
 * Get prev/next verse navigation info across chapter/book boundaries.
 */
export function getVerseNavigation(translationId, bookCode, chapter, verse) {
  const db = getDb();

  // All chapters in this book for this translation
  const chapters = db.prepare(`
    SELECT DISTINCT chapter FROM bible_verses
    WHERE translation_id = ? AND book_code = ? ORDER BY chapter
  `).all(translationId, bookCode).map(r => r.chapter);

  const maxVerse = db.prepare(`
    SELECT MAX(verse) as mv FROM bible_verses
    WHERE translation_id = ? AND book_code = ? AND chapter = ?
  `).get(translationId, bookCode, chapter)?.mv || 0;

  const minVerse = db.prepare(`
    SELECT MIN(verse) as mv FROM bible_verses
    WHERE translation_id = ? AND book_code = ? AND chapter = ?
  `).get(translationId, bookCode, chapter)?.mv || 1;

  // Previous verse
  let prev = null;
  if (verse > minVerse) {
    prev = { bookCode, chapter, verse: verse - 1 };
  } else {
    // Go to previous chapter
    const prevChapIdx = chapters.indexOf(chapter) - 1;
    if (prevChapIdx >= 0) {
      const prevChap = chapters[prevChapIdx];
      const lastV = db.prepare(`SELECT MAX(verse) as mv FROM bible_verses WHERE translation_id=? AND book_code=? AND chapter=?`).get(translationId, bookCode, prevChap)?.mv;
      prev = { bookCode, chapter: prevChap, verse: lastV };
    } else {
      // Go to previous book
      const prevBook = _getPrevBook(db, translationId, bookCode);
      if (prevBook) {
        const lastChap = db.prepare(`SELECT MAX(chapter) as mc FROM bible_verses WHERE translation_id=? AND book_code=?`).get(translationId, prevBook)?.mc;
        const lastV = db.prepare(`SELECT MAX(verse) as mv FROM bible_verses WHERE translation_id=? AND book_code=? AND chapter=?`).get(translationId, prevBook, lastChap)?.mv;
        prev = { bookCode: prevBook, chapter: lastChap, verse: lastV };
      }
    }
  }

  // Next verse
  let next = null;
  if (verse < maxVerse) {
    next = { bookCode, chapter, verse: verse + 1 };
  } else {
    const nextChapIdx = chapters.indexOf(chapter) + 1;
    if (nextChapIdx < chapters.length) {
      const nextChap = chapters[nextChapIdx];
      const firstV = db.prepare(`SELECT MIN(verse) as mv FROM bible_verses WHERE translation_id=? AND book_code=? AND chapter=?`).get(translationId, bookCode, nextChap)?.mv;
      next = { bookCode, chapter: nextChap, verse: firstV };
    } else {
      const nextBook = _getNextBook(db, translationId, bookCode);
      if (nextBook) {
        const firstChap = db.prepare(`SELECT MIN(chapter) as mc FROM bible_verses WHERE translation_id=? AND book_code=?`).get(translationId, nextBook)?.mc;
        const firstV = db.prepare(`SELECT MIN(verse) as mv FROM bible_verses WHERE translation_id=? AND book_code=? AND chapter=?`).get(translationId, nextBook, firstChap)?.mv;
        next = { bookCode: nextBook, chapter: firstChap, verse: firstV };
      }
    }
  }

  return { prev, next };
}

export function getChapterNavigation(translationId, bookCode, chapter) {
  const db = getDb();
  const chapters = db.prepare(`
    SELECT DISTINCT chapter FROM bible_verses
    WHERE translation_id = ? AND book_code = ? ORDER BY chapter
  `).all(translationId, bookCode).map(r => r.chapter);

  const idx = chapters.indexOf(chapter);
  let prevChapter = null, nextChapter = null;

  if (idx > 0) prevChapter = { bookCode, chapter: chapters[idx - 1] };
  else {
    const prevBook = _getPrevBook(db, translationId, bookCode);
    if (prevBook) {
      const mc = db.prepare(`SELECT MAX(chapter) as mc FROM bible_verses WHERE translation_id=? AND book_code=?`).get(translationId, prevBook)?.mc;
      prevChapter = { bookCode: prevBook, chapter: mc };
    }
  }

  if (idx < chapters.length - 1) nextChapter = { bookCode, chapter: chapters[idx + 1] };
  else {
    const nextBook = _getNextBook(db, translationId, bookCode);
    if (nextBook) {
      const mc = db.prepare(`SELECT MIN(chapter) as mc FROM bible_verses WHERE translation_id=? AND book_code=?`).get(translationId, nextBook)?.mc;
      nextChapter = { bookCode: nextBook, chapter: mc };
    }
  }

  return { prevChapter, nextChapter };
}

function _getPrevBook(db, translationId, bookCode) {
  const book = db.prepare(`
    SELECT bb.canonical_order, bb.collection_id FROM bible_books bb WHERE bb.code = ?
  `).get(bookCode);
  if (!book) return null;
  // Try same collection first
  const prev = db.prepare(`
    SELECT bb.code FROM bible_books bb
    WHERE bb.collection_id = ? AND bb.canonical_order < ?
      AND bb.code IN (SELECT DISTINCT book_code FROM bible_verses WHERE translation_id = ?)
    ORDER BY bb.canonical_order DESC LIMIT 1
  `).get(book.collection_id, book.canonical_order, translationId);
  if (prev) return prev.code;
  // Previous collection
  const col = db.prepare('SELECT display_order FROM bible_collections WHERE id = ?').get(book.collection_id);
  const prevCol = db.prepare('SELECT id FROM bible_collections WHERE display_order < ? ORDER BY display_order DESC LIMIT 1').get(col.display_order);
  if (!prevCol) return null;
  const lastBook = db.prepare(`
    SELECT bb.code FROM bible_books bb
    WHERE bb.collection_id = ?
      AND bb.code IN (SELECT DISTINCT book_code FROM bible_verses WHERE translation_id = ?)
    ORDER BY bb.canonical_order DESC LIMIT 1
  `).get(prevCol.id, translationId);
  return lastBook?.code || null;
}

function _getNextBook(db, translationId, bookCode) {
  const book = db.prepare(`SELECT canonical_order, collection_id FROM bible_books WHERE code = ?`).get(bookCode);
  if (!book) return null;
  const next = db.prepare(`
    SELECT bb.code FROM bible_books bb
    WHERE bb.collection_id = ? AND bb.canonical_order > ?
      AND bb.code IN (SELECT DISTINCT book_code FROM bible_verses WHERE translation_id = ?)
    ORDER BY bb.canonical_order ASC LIMIT 1
  `).get(book.collection_id, book.canonical_order, translationId);
  if (next) return next.code;
  const col = db.prepare('SELECT display_order FROM bible_collections WHERE id = ?').get(book.collection_id);
  const nextCol = db.prepare('SELECT id FROM bible_collections WHERE display_order > ? ORDER BY display_order ASC LIMIT 1').get(col.display_order);
  if (!nextCol) return null;
  const firstBook = db.prepare(`
    SELECT bb.code FROM bible_books bb
    WHERE bb.collection_id = ?
      AND bb.code IN (SELECT DISTINCT book_code FROM bible_verses WHERE translation_id = ?)
    ORDER BY bb.canonical_order ASC LIMIT 1
  `).get(nextCol.id, translationId);
  return firstBook?.code || null;
}

// ── Search ────────────────────────────────────────────────────────────────

/**
 * Search verses by text (normalized Arabic) or resolve a reference.
 * Returns { type: 'reference'|'text', reference?, results?, total }
 */
export function searchBible({ query, translationIds, bookCode, collectionSlug, page = 1, limit = 30 }) {
  const db = getDb();
  const offset = (page - 1) * limit;

  // Try reference parse first
  const ref = parseReference(query);
  if (ref && ref.chapter) {
    return { type: 'reference', reference: ref };
  }

  // Text search
  const normalized = normalizeArabicText(query || '');
  if (!normalized) return { type: 'text', results: [], total: 0 };

  const where = [];
  const params = [];

  if (translationIds && translationIds.length > 0) {
    where.push(`bv.translation_id IN (${translationIds.map(() => '?').join(',')})`);
    params.push(...translationIds);
  }

  if (bookCode) {
    where.push('bv.book_code = ?');
    params.push(bookCode);
  }

  if (collectionSlug) {
    const col = db.prepare('SELECT id FROM bible_collections WHERE slug = ?').get(collectionSlug);
    if (col) {
      where.push('bb.collection_id = ?');
      params.push(col.id);
    }
  }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

  // Use FTS when possible
  const ftsTokens = normalized.split(/\s+/).filter(Boolean);
  const ftsQuery = ftsTokens.map(t => `"${t.replace(/"/g, '""')}"`).join(' ');

  const sql = `
    SELECT bv.book_code, bv.chapter, bv.verse, bv.text,
           bb.name_ar as book_name, bt.name_ar as translation_name, bt.slug as translation_slug
    FROM bible_verses bv
    JOIN bible_books bb ON bv.book_code = bb.code
    JOIN bible_translations bt ON bv.translation_id = bt.id
    ${whereStr}
    ${whereStr ? 'AND' : 'WHERE'} bv.id IN (SELECT rowid FROM bible_verses_fts WHERE bible_verses_fts MATCH ?)
    ORDER BY bv.book_code, bv.chapter, bv.verse, bt.display_order
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) as total
    FROM bible_verses bv
    JOIN bible_books bb ON bv.book_code = bb.code
    ${whereStr}
    ${whereStr ? 'AND' : 'WHERE'} bv.id IN (SELECT rowid FROM bible_verses_fts WHERE bible_verses_fts MATCH ?)
  `;

  try {
    const results = db.prepare(sql).all(...params, ftsQuery, limit, offset);
    return { type: 'text', results, total, page, limit };
  } catch {
    // Fallback to LIKE search
    const likeQ = `%${normalized}%`;
    const sqlLike = `
      SELECT bv.book_code, bv.chapter, bv.verse, bv.text,
             bb.name_ar as book_name, bt.name_ar as translation_name, bt.slug as translation_slug
      FROM bible_verses bv
      JOIN bible_books bb ON bv.book_code = bb.code
      JOIN bible_translations bt ON bv.translation_id = bt.id
      ${whereStr}
      AND bv.search_text LIKE ?
      ORDER BY bv.book_code, bv.chapter, bv.verse
      LIMIT ? OFFSET ?
    `;
    const results = db.prepare(sqlLike).all(...params, likeQ, limit, offset);
    const total = db.prepare(sqlLike.replace(/SELECT bv\.book_code.*FROM/s, 'SELECT COUNT(*) as total FROM').replace(/LIMIT.*/, '')).get(...params, likeQ)?.total || 0;
    return { type: 'text', results, total, page, limit };
  }
}

// ── Stats ────────────────────────────────────────────────────────────────

export function getBibleStats() {
  const db = getDb();
  const translations = db.prepare(`
    SELECT bt.*, COUNT(bv.id) as verse_count
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id = bt.id
    GROUP BY bt.id
  `).all();

  const bookCounts = db.prepare(`
    SELECT book_code, COUNT(*) as verse_count
    FROM bible_verses GROUP BY book_code
  `).all();

  return { translations, bookCounts };
}
