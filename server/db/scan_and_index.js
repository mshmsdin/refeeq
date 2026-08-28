import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb } from './schema.js';
import { extractDistinctKeywords } from '../utils/arabic_nlp.js';

// Base target archive directories (can support multiple roots for different sects)
const DEFAULT_ARCHIVE_ROOT = process.env.ARCHIVE_PATH || (process.platform === 'win32' ? 'E:\\المكتبة الشيعية\\الرافضة' : '/app/data/archive');

// Supported image extensions
const VALID_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff']);

function detectSectFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (/رافضة|شيعة|رافضي|اثنا عشرية/i.test(normalized)) {
    return 'شيعة';
  }
  if (/سنة|سلفية|وهابية|اشاعرة|ماتريدية/i.test(normalized)) {
    return 'سلفية';
  }
  if (/نصارى|مسيحية|انجيل|كنيسة|يسوع|بولس/i.test(normalized)) {
    return 'نصارى';
  }
  if (/الحاد|لادينية|ملاحدة/i.test(normalized)) {
    return 'إلحاد';
  }
  return 'شيعة'; // Default primary collection
}

function extractBookSource(filename) {
  const nameWithoutExt = path.parse(filename).name;
  if (nameWithoutExt.includes('،')) {
    const parts = nameWithoutExt.split('،');
    return parts[parts.length - 1].trim();
  }
  if (nameWithoutExt.includes(' - ')) {
    const parts = nameWithoutExt.split(' - ');
    return parts[parts.length - 1].trim();
  }
  return '';
}

export function scanAndIndex(targetDir = DEFAULT_ARCHIVE_ROOT) {
  console.log(`[Indexer] Starting scanning directory: ${targetDir}`);
  const startTime = Date.now();
  initDatabase();
  const db = getDb();

  const insertFolderStmt = db.prepare(`
    INSERT INTO folders (path, name, parent_path, sect)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      name=excluded.name,
      parent_path=excluded.parent_path,
      sect=excluded.sect
  `);

  const insertDocStmt = db.prepare(`
    INSERT INTO documents (filename, relative_path, full_path, folder_name, folder_path, sect, book_source, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      filename=excluded.filename,
      full_path=excluded.full_path,
      folder_name=excluded.folder_name,
      folder_path=excluded.folder_path,
      sect=excluded.sect,
      book_source=excluded.book_source,
      file_size=excluded.file_size
  `);

  const updateFolderCountsStmt = db.prepare(`
    UPDATE folders
    SET file_count = (
      SELECT COUNT(*) FROM documents WHERE documents.folder_path = folders.path
    )
  `);

  let scannedFolders = 0;
  let scannedFiles = 0;

  const insertDocsTransaction = db.transaction((docsList, foldersList) => {
    for (const f of foldersList) {
      insertFolderStmt.run(f.path, f.name, f.parent_path, f.sect);
    }
    for (const d of docsList) {
      insertDocStmt.run(
        d.filename,
        d.relative_path,
        d.full_path,
        d.folder_name,
        d.folder_path,
        d.sect,
        d.book_source,
        d.file_size
      );
    }
  });

  const docsBatch = [];
  const foldersBatch = [];

  function traverse(currentDir, relativeCurrent = '') {
    scannedFolders++;
    const folderName = path.basename(currentDir);
    const parentRelative = path.dirname(relativeCurrent) === '.' ? '' : path.dirname(relativeCurrent);
    const sect = detectSectFromPath(currentDir);

    foldersBatch.push({
      path: relativeCurrent || '/',
      name: folderName || 'الرئيسية',
      parent_path: parentRelative,
      sect: sect
    });

    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      console.error(`Error reading directory ${currentDir}:`, err.message);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativeEntryPath = relativeCurrent ? path.join(relativeCurrent, entry.name) : entry.name;

      if (entry.isDirectory()) {
        traverse(fullPath, relativeEntryPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VALID_EXTENSIONS.has(ext)) {
          scannedFiles++;
          let stat = { size: 0 };
          try {
            stat = fs.statSync(fullPath);
          } catch (e) {}

          const bookSource = extractBookSource(entry.name);
          const docSect = detectSectFromPath(fullPath);

          docsBatch.push({
            filename: entry.name,
            relative_path: relativeEntryPath,
            full_path: fullPath,
            folder_name: folderName,
            folder_path: relativeCurrent || '/',
            sect: docSect,
            book_source: bookSource,
            file_size: stat.size
          });
        }
      }
    }
  }

  traverse(targetDir, '');

  console.log(`[Indexer] Scanned ${scannedFolders} folders and ${scannedFiles} images. Committing to SQLite DB...`);
  insertDocsTransaction(docsBatch, foldersBatch);
  updateFolderCountsStmt.run();

  // Populate initial distinct tags for completed documents if any
  try {
    const completedDocs = db.prepare("SELECT id, filename, ocr_text FROM documents WHERE ocr_status = 'completed'").all();
    const insertTagStmt = db.prepare("INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, 0)");
    
    const tagTx = db.transaction((docs) => {
      for (const d of docs) {
        const keywords = extractDistinctKeywords(d.ocr_text, d.filename, 8);
        for (const kw of keywords) {
          insertTagStmt.run(d.id, kw);
        }
      }
    });
    tagTx(completedDocs);
  } catch (e) {
    console.error("[Indexer] Error updating initial tags:", e.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Indexer] Finished indexing in ${duration}s. Total documents indexed: ${scannedFiles}`);

  return { scannedFolders, scannedFiles, duration };
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scanAndIndex();
}
