/**
 * Arabic Bible Reference Parser
 * Parses strings like: متى 5:3 | متى 5:3-10 | إنجيل يوحنا 3:16 | مت 5
 */

import { getDb } from '../db/schema.js';

let _aliasMap = null;

function getAliasMap() {
  if (_aliasMap) return _aliasMap;
  const db = getDb();
  const rows = db.prepare('SELECT alias, book_code FROM bible_book_aliases').all();
  _aliasMap = new Map();
  for (const r of rows) {
    _aliasMap.set(normalizeForMatch(r.alias), r.book_code);
  }
  // also add book names directly
  const books = db.prepare('SELECT code, name_ar, abbreviation_ar FROM bible_books').all();
  for (const b of books) {
    _aliasMap.set(normalizeForMatch(b.name_ar), b.code);
    if (b.abbreviation_ar) _aliasMap.set(normalizeForMatch(b.abbreviation_ar), b.code);
  }
  return _aliasMap;
}

function normalizeForMatch(str) {
  if (!str) return '';
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '')  // remove tashkeel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse an Arabic Bible reference string.
 * Returns: { bookCode, chapter, verseStart, verseEnd } or null
 */
export function parseReference(input) {
  if (!input || !input.trim()) return null;

  const map = getAliasMap();
  const text = normalizeForMatch(input);

  // Remove common prefixes: إنجيل، سفر
  const cleaned = text
    .replace(/^(انجيل|إنجيل|سفر|كتاب)\s+/i, '')
    .trim();

  // Try to find the longest alias that matches the start of cleaned
  let bookCode = null;
  let remainder = '';
  let bestLen = 0;

  for (const [alias, code] of map) {
    if (cleaned.startsWith(alias) && alias.length > bestLen) {
      bestLen = alias.length;
      bookCode = code;
      remainder = cleaned.slice(alias.length).trim();
    }
  }

  if (!bookCode) return null;

  // Parse chapter and verse from remainder
  // Patterns: "5", "5:3", "5:3-10", "5 3", "5 3 10"
  const ref = remainder
    .replace(/[:\s]+/g, ':')
    .replace(/[-–—]/g, '-');

  const m = ref.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?/);
  if (!m) {
    // No chapter — just book name
    return { bookCode, chapter: null, verseStart: null, verseEnd: null };
  }

  return {
    bookCode,
    chapter: parseInt(m[1], 10),
    verseStart: m[2] ? parseInt(m[2], 10) : null,
    verseEnd: m[3] ? parseInt(m[3], 10) : null,
  };
}

/**
 * Returns true if input looks like a Bible reference (not a text search).
 */
export function looksLikeReference(input) {
  return parseReference(input) !== null;
}

/** Invalidate alias cache (after import) */
export function invalidateAliasCache() {
  _aliasMap = null;
}
