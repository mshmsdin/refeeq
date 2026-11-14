// استيراد كتاب ممسوح من أرشيف الإنترنت: يحفظ نص كل صفحة وإحداثيات كلماته عندنا، ولا يحفظ صور الصفحات.
import { getDb, initDatabase } from '../db/schema.js';
import { initBibleSchema } from '../db/bible_schema.js';
import { SCAN_BOOK_SOURCES, djvuXmlUrl, imageUrlTemplate } from './scan_book_sources.js';
import { encodeWords, pageSearchText, parseDjvuXml } from '../utils/scan_books.js';

// أول وآخر ورقة يظهر فيها رأس «سفر ...» لكل سفر، بحسب أول كلمات الصفحة.
export function detectSections(pages, sectionHeads) {
  const ranges = new Map();
  for (const page of pages) {
    const head = page.words.slice(0, 12).map((word) => word[0]).join(' ');
    const match = /سفر\s+(\S+)/.exec(head);
    const section = match && sectionHeads[match[1]];
    if (!section) continue;
    const current = ranges.get(section.code);
    if (current) current.lastLeaf = page.leaf;
    else ranges.set(section.code, { code: section.code, nameAr: section.nameAr, firstLeaf: page.leaf, lastLeaf: page.leaf });
  }
  return [...ranges.values()].sort((a, b) => a.firstLeaf - b.firstLeaf);
}

export function scanBookIsReady(db, source) {
  const book = db.prepare('SELECT id, page_count FROM bible_scan_books WHERE slug=? AND is_active=1').get(source.slug);
  if (!book || book.page_count !== source.expectedPageCount) return false;
  const stored = db.prepare('SELECT COUNT(*) AS n FROM bible_scan_pages WHERE book_id=?').get(book.id).n;
  return stored === source.expectedPageCount;
}

export function storeScanBook(db, source, pages) {
  if (pages.length !== source.expectedPageCount) {
    throw new Error(`عدد صفحات ${source.slug} ${pages.length} والمتوقع ${source.expectedPageCount}`);
  }
  const wordTotal = pages.reduce((sum, page) => sum + page.words.length, 0);
  if (wordTotal < source.expectedMinWords) {
    throw new Error(`نص ${source.slug} ناقص: ${wordTotal} كلمة فقط`);
  }
  const sections = detectSections(pages, source.sectionHeads || {});

  const upsertBook = db.prepare(`
    INSERT INTO bible_scan_books (slug, title_ar, title_en, editor_ar, textual_tradition, archive_identifier, archive_url,
      image_url_template, page_count, sections_json, notes, site_scope, is_active, imported_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'both', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET title_ar=excluded.title_ar, title_en=excluded.title_en, editor_ar=excluded.editor_ar,
      textual_tradition=excluded.textual_tradition, archive_identifier=excluded.archive_identifier,
      archive_url=excluded.archive_url, image_url_template=excluded.image_url_template, page_count=excluded.page_count,
      sections_json=excluded.sections_json, notes=excluded.notes, is_active=1, imported_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
  `);
  const insertPage = db.prepare(`
    INSERT INTO bible_scan_pages (book_id, leaf, width, height, search_text, words_gz) VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    upsertBook.run(
      source.slug, source.titleAr, source.titleEn, source.editorAr, source.textualTradition,
      source.archiveIdentifier, source.archiveUrl, imageUrlTemplate(source), pages.length,
      JSON.stringify(sections), source.notes
    );
    const bookId = db.prepare('SELECT id FROM bible_scan_books WHERE slug=?').get(source.slug).id;
    db.prepare('DELETE FROM bible_scan_pages WHERE book_id=?').run(bookId);
    for (const page of pages) {
      insertPage.run(bookId, page.leaf, page.width, page.height, pageSearchText(page.words), encodeWords(page.words));
    }
  })();
  return { pages: pages.length, words: wordTotal, sections };
}

export async function fetchDjvuXml(source) {
  const response = await fetch(djvuXmlUrl(source), { signal: AbortSignal.timeout(300000) });
  if (!response.ok) throw new Error(`تعذر تنزيل نص ${source.slug} من أرشيف الإنترنت: ${response.status}`);
  return response.text();
}

export async function importScanBook(source, { db = getDb(), xml = null } = {}) {
  const text = xml ?? await fetchDjvuXml(source);
  return storeScanBook(db, source, parseDjvuXml(text));
}

export async function run(slugs = SCAN_BOOK_SOURCES.map(({ slug }) => slug), { initializeDatabase = true } = {}) {
  if (initializeDatabase) {
    initDatabase();
    initBibleSchema();
  }
  const results = [];
  for (const source of SCAN_BOOK_SOURCES.filter(({ slug }) => slugs.includes(slug))) {
    results.push({ slug: source.slug, ...(await importScanBook(source)) });
  }
  return results;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  run(process.argv.slice(2).length ? process.argv.slice(2) : undefined)
    .then((results) => console.log(JSON.stringify(results, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
