import { getDb } from './schema.js';
import { SCAN_BOOK_SOURCES } from '../importers/scan_book_sources.js';
import { importScanBook, scanBookIsReady } from '../importers/import_ia_scan_book.js';

// يستورد نص الكتب الممسوحة (والإحداثيات) من أرشيف الإنترنت إن لم تكن مكتملة عندنا. الصور لا تُنزَّل.
export async function ensureScanBooksImported() {
  const db = getDb();
  const missing = SCAN_BOOK_SOURCES.filter((source) => !scanBookIsReady(db, source));
  for (const source of missing) await importScanBook(source, { db });
  return missing.map(({ slug }) => slug);
}
