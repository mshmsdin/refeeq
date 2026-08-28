import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support configurable DB path for containerized persistent volume (e.g. /app/data/library.db)
const dbPath = process.env.DB_PATH || path.join(__dirname, 'library.db');

// Ensure parent directory exists for DB path
const parentDir = path.dirname(dbPath);
if (!fs.existsSync(parentDir)) {
  fs.mkdirSync(parentDir, { recursive: true });
}

let dbInstance = null;

export function initDatabase() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  // 1. Create base tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      parent_path TEXT,
      sect TEXT DEFAULT 'شيعة',
      category TEXT DEFAULT NULL, -- 'attack' (هجوم), 'obligation' (إلزام), 'defense' (دفاع)
      file_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      relative_path TEXT UNIQUE NOT NULL,
      full_path TEXT NOT NULL,
      folder_name TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      sect TEXT DEFAULT 'شيعة',
      category TEXT DEFAULT NULL, -- 'attack' (هجوم), 'obligation' (إلزام), 'defense' (دفاع)
      book_source TEXT,
      file_size INTEGER DEFAULT 0,
      ocr_status TEXT DEFAULT 'pending',
      ocr_text TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ocr_boxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      line_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      box_json TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      is_manual INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_id, tag),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      folder_id INTEGER NOT NULL,
      folder_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_id, folder_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER UNIQUE NOT NULL,
      notes TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  // 2. Migration: Ensure 'sect' & 'category' columns exist in existing tables
  try {
    const docCols = db.prepare("PRAGMA table_info(documents)").all();
    if (!docCols.some(c => c.name === 'sect')) {
      db.exec("ALTER TABLE documents ADD COLUMN sect TEXT DEFAULT 'شيعة'");
    }
    if (!docCols.some(c => c.name === 'category')) {
      db.exec("ALTER TABLE documents ADD COLUMN category TEXT DEFAULT NULL");
    }
  } catch (e) {
    console.error("Migration warning (documents):", e.message);
  }

  try {
    const folderCols = db.prepare("PRAGMA table_info(folders)").all();
    if (!folderCols.some(c => c.name === 'sect')) {
      db.exec("ALTER TABLE folders ADD COLUMN sect TEXT DEFAULT 'شيعة'");
    }
    if (!folderCols.some(c => c.name === 'category')) {
      db.exec("ALTER TABLE folders ADD COLUMN category TEXT DEFAULT NULL");
    }
  } catch (e) {
    console.error("Migration warning (folders):", e.message);
  }

  // 3. Create Indexes & FTS5
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_docs_folder ON documents(folder_path);
    CREATE INDEX IF NOT EXISTS idx_docs_sect ON documents(sect);
    CREATE INDEX IF NOT EXISTS idx_docs_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_docs_ocr_status ON documents(ocr_status);
    CREATE INDEX IF NOT EXISTS idx_ocr_boxes_doc ON ocr_boxes(document_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_doc ON favorites(document_id);
    CREATE INDEX IF NOT EXISTS idx_doc_tags_tag ON document_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_doc_tags_doc ON document_tags(document_id);
    CREATE INDEX IF NOT EXISTS idx_doc_folders_doc ON document_folders(document_id);
    CREATE INDEX IF NOT EXISTS idx_doc_folders_folder ON document_folders(folder_id);
    CREATE INDEX IF NOT EXISTS idx_doc_folders_path ON document_folders(folder_path);

    -- FTS5 Full-Text Search Virtual Table
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      filename,
      folder_name,
      book_source,
      ocr_text,
      content=documents,
      content_rowid=id,
      tokenize="unicode61 remove_diacritics 2"
    );

    -- Triggers to keep FTS index synchronized with documents table
    CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
      INSERT INTO documents_fts(rowid, filename, folder_name, book_source, ocr_text)
      VALUES (new.id, new.filename, new.folder_name, new.book_source, new.ocr_text);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, filename, folder_name, book_source, ocr_text)
      VALUES('delete', old.id, old.filename, old.folder_name, old.book_source, old.ocr_text);
    END;

    CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
      INSERT INTO documents_fts(documents_fts, rowid, filename, folder_name, book_source, ocr_text)
      VALUES('delete', old.id, old.filename, old.folder_name, old.book_source, old.ocr_text);
      INSERT INTO documents_fts(rowid, filename, folder_name, book_source, ocr_text)
      VALUES (new.id, new.filename, new.folder_name, new.book_source, new.ocr_text);
    END;
  `);

  dbInstance = db;
  return db;
}

export function getDb() {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  dbInstance = db;
  return db;
}
