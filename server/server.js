import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { initDatabase, getDb, closeDb, getDbPath } from './db/schema.js';
import { initBibleSchema } from './db/bible_schema.js';
import {
  getTranslations, getTranslationBySlug, getCollections,
  getBooks, getBook, getChapterList, getChapter, getVerse,
  getVerseRange, getVerseAcrossTranslations, getChapterAcrossTranslations,
  getVerseNavigation, getChapterNavigation,
  searchBible, getBibleStats
} from './utils/bible_service.js';
import { parseReference, looksLikeReference } from './utils/bible_reference_parser.js';
import { scanAndIndex } from './db/scan_and_index.js';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { extractDistinctKeywords, normalizeArabicText } from './utils/arabic_nlp.js';
import { resolveImagePath } from './utils/path_resolver.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema
initDatabase();
initBibleSchema();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Enable proxy trust for Traefik / Cloudflare
app.set('trust proxy', 1);

// Security & Parsing Middleware (support chunk uploads up to 60MB)
app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}


// ----------------------------------------------------
// Health Check & Readiness Endpoints (Mandatory Rules)
// ----------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      error: err.message
    });
  }
});

// Helper to attach tags to document objects
function attachTagsToDocuments(db, docs) {
  if (!docs || docs.length === 0) return docs;
  const docIds = docs.map(d => d.id);
  const placeholders = docIds.map(() => '?').join(',');
  const tagsRows = db.prepare(`
    SELECT document_id, tag, is_manual 
    FROM document_tags 
    WHERE document_id IN (${placeholders})
    ORDER BY is_manual DESC, id ASC
  `).all(...docIds);

  const tagsByDoc = new Map();
  for (const r of tagsRows) {
    if (!tagsByDoc.has(r.document_id)) {
      tagsByDoc.set(r.document_id, []);
    }
    tagsByDoc.get(r.document_id).push(r.tag);
  }

  return docs.map(d => {
    let images = [];
    if (d.images_json) {
      try {
        images = JSON.parse(d.images_json);
      } catch (e) {
        images = [d.relative_path || d.filename];
      }
    } else if (d.relative_path || d.full_path) {
      images = [d.relative_path || d.full_path];
    }

    return {
      ...d,
      images,
      image_count: d.image_count || (images ? images.length : 1),
      tags: tagsByDoc.get(d.id) || (d.ocr_text ? extractDistinctKeywords(d.ocr_text, d.filename, 6) : [])
    };
  });
}


// 1. Stats endpoint (Multi-sect aware)
app.get('/api/stats', (req, res) => {
  try {
    const db = getDb();
    const { sect } = req.query;

    let sectFilter = '';
    let params = [];
    if (sect && sect !== 'all') {
      sectFilter = ' WHERE sect = ?';
      params.push(sect);
    }

    const docCount = db.prepare(`SELECT COUNT(*) as count FROM documents${sectFilter}`).get(...params).count;
    const folderCount = db.prepare(`SELECT COUNT(*) as count FROM folders${sectFilter}`).get(...params).count;
    const ocrCompleted = db.prepare(`SELECT COUNT(*) as count FROM documents WHERE ocr_status = 'completed'${sect && sect !== 'all' ? ' AND sect = ?' : ''}`).get(...params).count;
    const ocrPending = db.prepare(`SELECT COUNT(*) as count FROM documents WHERE ocr_status = 'pending'${sect && sect !== 'all' ? ' AND sect = ?' : ''}`).get(...params).count;
    const favCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;

    const topBooks = db.prepare(`
      SELECT book_source, COUNT(*) as count 
      FROM documents 
      WHERE book_source != '' AND book_source IS NOT NULL ${sect && sect !== 'all' ? 'AND sect = ?' : ''}
      GROUP BY book_source 
      ORDER BY count DESC 
      LIMIT 15
    `).all(...params);

    const sectsStats = db.prepare(`
      SELECT sect, COUNT(*) as count 
      FROM documents 
      GROUP BY sect 
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      stats: {
        totalDocuments: docCount,
        totalFolders: folderCount,
        completedOcr: ocrCompleted,
        pendingOcr: ocrPending,
        totalFavorites: favCount,
        topSources: topBooks,
        sects: sectsStats
      },
      totalDocuments: docCount,
      totalFolders: folderCount,
      ocrCompleted,
      ocrPending,
      totalFavorites: favCount,
      topBooks,
      sects: sectsStats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Sects list endpoint
app.get('/api/sects', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT sect, COUNT(*) as count 
      FROM documents 
      GROUP BY sect 
      ORDER BY count DESC
    `).all();

    const defaultSects = [
      { sect: 'all', name: 'جميع الفرق والمصادر', count: rows.reduce((acc, r) => acc + r.count, 0) },
      { sect: 'شيعة', name: 'الشيعة الإمامية', count: 0 },
      { sect: 'نصارى', name: 'النصارى والمسيحية', count: 0 },
      { sect: 'إلحاد', name: 'الإلحاد واللادينية', count: 0 }
    ];

    const countsMap = new Map(rows.map(r => [r.sect, r.count]));
    const result = defaultSects.map(s => ({
      ...s,
      count: s.sect === 'all' ? s.count : (countsMap.get(s.sect) || 0)
    }));

    res.json({ success: true, sects: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Top Distinctive Keywords / Tags
app.get('/api/tags/top', (req, res) => {
  try {
    const db = getDb();
    const { limit = 25, sect } = req.query;

    let sql = `
      SELECT t.tag, COUNT(*) as count 
      FROM document_tags t
    `;
    let params = [];

    if (sect && sect !== 'all') {
      sql += ` JOIN documents d ON t.document_id = d.id WHERE d.sect = ? `;
      params.push(sect);
    }

    sql += ` GROUP BY t.tag ORDER BY count DESC LIMIT ? `;
    params.push(parseInt(limit));

    const tags = db.prepare(sql).all(...params);
    res.json({ success: true, tags });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Folder Hierarchy Tree endpoint
app.get('/api/tree', (req, res) => {
  try {
    const db = getDb();
    const { sect } = req.query;

    let sql = 'SELECT * FROM folders';
    let params = [];
    if (sect && sect !== 'all') {
      sql += ' WHERE sect = ?';
      params.push(sect);
    }
    sql += ' ORDER BY path ASC';

    const folders = db.prepare(sql).all(...params);
    
    const map = new Map();
    const roots = [];

    for (const f of folders) {
      map.set(f.path, { ...f, children: [] });
    }

    for (const f of folders) {
      const node = map.get(f.path);
      if (f.parent_path && map.has(f.parent_path)) {
        map.get(f.parent_path).children.push(node);
      } else if (f.path !== '') {
        roots.push(node);
      }
    }

    res.json({ success: true, tree: roots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4b. Folder Detail by ID endpoint
app.get('/api/folder/:id', (req, res) => {
  try {
    const db = getDb();
    const folderId = parseInt(req.params.id, 10);
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    const subfolders = db.prepare('SELECT * FROM folders WHERE parent_path = ? ORDER BY name ASC').all(folder.path);
    res.json({ success: true, folder, subfolders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Documents & Search endpoint
app.get('/api/documents', (req, res) => {
  try {
    const db = getDb();
    let {
      q,
      tag,
      sect,
      folder,
      folder_id,
      category,
      book,
      ocr_status,
      filter,
      favorites_only,
      page = 1,
      limit = 24
    } = req.query;

    if (folder_id && !folder) {
      const fObj = db.prepare('SELECT path, sect FROM folders WHERE id = ?').get(parseInt(folder_id, 10));
      if (fObj) {
        folder = fObj.path;
        if (!sect || sect === 'all') sect = fObj.sect;
      }
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const isFavFilter = favorites_only === 'true' || filter === 'favorites';
    const isOcrFilter = ocr_status === 'completed' || filter === 'ocr_completed';

    // Query subfolders for navigation
    let subfolders = [];
    try {
      if (folder) {
        subfolders = db.prepare('SELECT * FROM folders WHERE parent_path = ? ORDER BY name ASC').all(folder);
      } else if (q && q.trim()) {
        const cleanQ = q.trim();
        const v1 = `%${cleanQ}%`;
        const v2 = `%${cleanQ.replace(/ة/g, 'ه')}%`;
        const v3 = `%${cleanQ.replace(/ه$/g, 'ة')}%`;
        let sectClause = '';
        let sectParams = [];
        if (sect && sect !== 'all') {
          sectClause = ' AND sect = ?';
          sectParams.push(sect);
        }
        subfolders = db.prepare(`
          SELECT * FROM folders 
          WHERE (name LIKE ? OR name LIKE ? OR name LIKE ?)${sectClause}
          ORDER BY name ASC LIMIT 30
        `).all(v1, v2, v3, ...sectParams);
      } else {
        let sectClause = '';
        let sectParams = [];
        if (sect && sect !== 'all') {
          sectClause = ' AND sect = ?';
          sectParams.push(sect);
        }
        subfolders = db.prepare(`SELECT * FROM folders WHERE (parent_path = '' OR parent_path IS NULL)${sectClause} ORDER BY name ASC`).all(...sectParams);
      }
    } catch (e) {
      console.error('Error fetching subfolders:', e);
    }

    // High Precision Prioritized Search (Filenames > Folder Names > Tags > OCR)
    if (q && q.trim()) {
      const cleanQ = q.trim();
      const v1 = `%${cleanQ}%`;
      const v2 = `%${cleanQ.replace(/ة/g, 'ه')}%`;
      const v3 = `%${cleanQ.replace(/ه$/g, 'ة')}%`;
      const tokens = cleanQ.split(/\s+/).filter(Boolean);
      const ftsQuery = tokens.map(t => `"${t.replace(/"/g, '""')}"*`).join(' ');

      let extraWhere = '';
      let extraParams = [];

      if (sect && sect !== 'all') {
        extraWhere += ' AND d.sect = ?';
        extraParams.push(sect);
      }
      if (category && category !== 'all') {
        extraWhere += ' AND d.category = ?';
        extraParams.push(category);
      }
      if (tag) {
        extraWhere += ' AND d.id IN (SELECT document_id FROM document_tags WHERE tag = ?)';
        extraParams.push(tag);
      }
      if (isFavFilter) {
        extraWhere += ' AND f.id IS NOT NULL';
      }
      if (isOcrFilter) {
        extraWhere += " AND d.ocr_status = 'completed'";
      }
      if (folder) {
        extraWhere += ' AND (d.folder_path = ? OR d.folder_path LIKE ? OR d.folder_path LIKE ? OR d.id IN (SELECT document_id FROM document_folders WHERE folder_path = ? OR folder_path LIKE ? OR folder_path LIKE ?))';
        extraParams.push(folder, `${folder}/%`, `${folder}\\%`, folder, `${folder}/%`, `${folder}\\%`);
      }
      if (book) {
        extraWhere += ' AND d.book_source = ?';
        extraParams.push(book);
      }

      const sql = `
        SELECT d.*, 
          f.id as fav_id, f.notes as fav_notes,
          CASE 
            WHEN d.filename LIKE ? OR d.filename LIKE ? OR d.filename LIKE ? THEN 100
            WHEN d.folder_name LIKE ? OR d.folder_name LIKE ? OR d.folder_name LIKE ? THEN 80
            WHEN d.id IN (SELECT document_id FROM document_tags WHERE tag LIKE ? OR tag LIKE ?) THEN 70
            WHEN d.book_source LIKE ? THEN 60
            ELSE 30
          END as search_score
        FROM documents d
        LEFT JOIN favorites f ON d.id = f.document_id
        WHERE (
          d.filename LIKE ? OR d.filename LIKE ? OR d.filename LIKE ?
          OR d.folder_name LIKE ? OR d.folder_name LIKE ? OR d.folder_name LIKE ?
          OR d.id IN (SELECT document_id FROM document_tags WHERE tag LIKE ? OR tag LIKE ?)
          OR d.book_source LIKE ?
          OR d.id IN (SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?)
          OR d.ocr_text LIKE ?
        ) ${extraWhere}
        ORDER BY search_score DESC, d.id ASC
        LIMIT ? OFFSET ?
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM documents d
        LEFT JOIN favorites f ON d.id = f.document_id
        WHERE (
          d.filename LIKE ? OR d.filename LIKE ? OR d.filename LIKE ?
          OR d.folder_name LIKE ? OR d.folder_name LIKE ? OR d.folder_name LIKE ?
          OR d.id IN (SELECT document_id FROM document_tags WHERE tag LIKE ? OR tag LIKE ?)
          OR d.book_source LIKE ?
          OR d.id IN (SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?)
          OR d.ocr_text LIKE ?
        ) ${extraWhere}
      `;

      const scoreParams = [v1, v2, v3, v1, v2, v3, v1, v2, v1];
      const matchParams = [v1, v2, v3, v1, v2, v3, v1, v2, v1, ftsQuery, v1];
      const countMatchParams = [v1, v2, v3, v1, v2, v3, v1, v2, v1, ftsQuery, v1];

      const items = db.prepare(sql).all(...scoreParams, ...matchParams, ...extraParams, limitNum, offset);
      const total = db.prepare(countSql).get(...countMatchParams, ...extraParams).total;

      const enrichedItems = attachTagsToDocuments(db, items);

      return res.json({ 
        success: true, 
        documents: enrichedItems, 
        items: enrichedItems, 
        subfolders,
        total, 
        page: parseInt(page), 
        limit: limitNum 
      });
    }

    // Standard list / folder / tag / sect browsing when no search query
    let whereClauses = [];
    let params = [];

    if (sect && sect !== 'all') {
      whereClauses.push('d.sect = ?');
      params.push(sect);
    }
    if (category && category !== 'all') {
      whereClauses.push('d.category = ?');
      params.push(category);
    }
    if (tag) {
      whereClauses.push('d.id IN (SELECT document_id FROM document_tags WHERE tag = ?)');
      params.push(tag);
    }
    if (folder) {
      whereClauses.push('(d.folder_path = ? OR d.folder_path LIKE ? OR d.folder_path LIKE ? OR d.id IN (SELECT document_id FROM document_folders WHERE folder_path = ? OR folder_path LIKE ? OR folder_path LIKE ?))');
      params.push(folder, `${folder}/%`, `${folder}\\%`, folder, `${folder}/%`, `${folder}\\%`);
    }
    if (book) {
      whereClauses.push('d.book_source = ?');
      params.push(book);
    }
    if (isOcrFilter) {
      whereClauses.push("d.ocr_status = 'completed'");
    }
    if (isFavFilter) {
      whereClauses.push('f.id IS NOT NULL');
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT d.*, f.id as fav_id, f.notes as fav_notes
      FROM documents d
      LEFT JOIN favorites f ON d.id = f.document_id
      ${whereStr}
      ORDER BY d.id ASC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN favorites f ON d.id = f.document_id
      ${whereStr}
    `;

    const items = db.prepare(sql).all(...params, limitNum, offset);
    const total = db.prepare(countSql).get(...params).total;

    const enrichedItems = attachTagsToDocuments(db, items);

    res.json({ 
      success: true, 
      documents: enrichedItems, 
      items: enrichedItems, 
      subfolders,
      total, 
      page: parseInt(page), 
      limit: limitNum 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Single Document Detail with OCR Boxes, Tags & Multi-Folders
app.get('/api/document/:id', (req, res) => {
  try {
    const db = getDb();
    const docId = parseInt(req.params.id, 10);
    const doc = db.prepare(`
      SELECT d.*, f.id as fav_id, f.notes as fav_notes
      FROM documents d
      LEFT JOIN favorites f ON d.id = f.document_id
      WHERE d.id = ?
    `).get(docId);

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const boxes = db.prepare('SELECT * FROM ocr_boxes WHERE document_id = ? ORDER BY line_index ASC').all(docId);
    const tags = db.prepare('SELECT id, tag, is_manual FROM document_tags WHERE document_id = ? ORDER BY is_manual DESC, id ASC').all(docId);

    // Linked Folders
    let linkedFolders = db.prepare(`
      SELECT f.id, f.name, f.path, f.sect, f.category
      FROM document_folders df
      JOIN folders f ON df.folder_id = f.id
      WHERE df.document_id = ?
    `).all(docId);

    // Ensure primary folder is included
    const primaryFolder = db.prepare('SELECT id, name, path, sect, category FROM folders WHERE path = ?').get(doc.folder_path);
    if (primaryFolder && !linkedFolders.some(f => f.id === primaryFolder.id)) {
      linkedFolders.unshift({ ...primaryFolder, is_primary: 1 });
    }

    let tagsList = tags.map(t => t.tag);
    if (tagsList.length === 0 && doc.ocr_text) {
      const autoTags = extractDistinctKeywords(doc.ocr_text, doc.filename, 8);
      const insertTag = db.prepare("INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, 0)");
      for (const t of autoTags) {
        insertTag.run(docId, t);
      }
      tagsList = autoTags;
    }

    const formattedBoxes = boxes.map(b => ({
      id: b.id,
      line_index: b.line_index,
      text: b.text,
      box: JSON.parse(b.box_json || '[]'),
      confidence: b.confidence
    }));

    const prevDoc = db.prepare('SELECT id FROM documents WHERE id < ? ORDER BY id DESC LIMIT 1').get(docId);
    const nextDoc = db.prepare('SELECT id FROM documents WHERE id > ? ORDER BY id ASC LIMIT 1').get(docId);

    let images = [];
    if (doc.images_json) {
      try {
        images = JSON.parse(doc.images_json);
      } catch (e) {
        images = [doc.relative_path || doc.filename];
      }
    } else if (doc.relative_path || doc.full_path) {
      images = [doc.relative_path || doc.full_path];
    }

    res.json({
      success: true,
      document: {
        ...doc,
        images,
        image_count: doc.image_count || (images ? images.length : 1),
        tags: tagsList
      },
      folders: linkedFolders,
      tags,

      boxes: formattedBoxes,
      prevDoc,
      nextDoc
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6b. Document Multi-Folders Assignment (Link document to another folder)
app.post('/api/document/:id/folders', (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { folder_id, folder_path } = req.body;
    const db = getDb();
    
    let folder = null;
    if (folder_id) {
      folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(parseInt(folder_id, 10));
    } else if (folder_path) {
      folder = db.prepare('SELECT * FROM folders WHERE path = ?').get(folder_path);
    }

    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    db.prepare(`
      INSERT OR IGNORE INTO document_folders (document_id, folder_id, folder_path)
      VALUES (?, ?, ?)
    `).run(docId, folder.id, folder.path);

    const linkedFolders = db.prepare(`
      SELECT f.id, f.name, f.path, f.sect, f.category
      FROM document_folders df
      JOIN folders f ON df.folder_id = f.id
      WHERE df.document_id = ?
    `).all(docId);

    res.json({ success: true, folders: linkedFolders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/document/:id/folders/:folderId', (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const folderId = parseInt(req.params.folderId, 10);
    const db = getDb();

    db.prepare('DELETE FROM document_folders WHERE document_id = ? AND folder_id = ?').run(docId, folderId);

    const linkedFolders = db.prepare(`
      SELECT f.id, f.name, f.path, f.sect, f.category
      FROM document_folders df
      JOIN folders f ON df.folder_id = f.id
      WHERE df.document_id = ?
    `).all(docId);

    res.json({ success: true, folders: linkedFolders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Manual Tags Management (Editor tags)
app.post('/api/document/:id/tags', (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { tag } = req.body;
    if (!tag || !tag.trim()) {
      return res.status(400).json({ success: false, error: 'Tag cannot be empty' });
    }

    const cleanTag = tag.trim();
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO document_tags (document_id, tag, is_manual)
      VALUES (?, ?, 1)
    `).run(docId, cleanTag);

    const updatedTags = db.prepare('SELECT id, tag, is_manual FROM document_tags WHERE document_id = ?').all(docId);
    res.json({ success: true, tags: updatedTags });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/document/:id/tags/:tag', (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const tag = decodeURIComponent(req.params.tag);
    const db = getDb();
    db.prepare('DELETE FROM document_tags WHERE document_id = ? AND tag = ?').run(docId, tag);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7b. Category Classification (هجوم / إلزام / دفاع)
app.post('/api/document/:id/category', (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { category } = req.body; // 'attack' | 'obligation' | 'defense' | null
    const cleanCat = category && ['attack', 'obligation', 'defense'].includes(category) ? category : null;
    const db = getDb();
    db.prepare('UPDATE documents SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cleanCat, docId);
    const doc = db.prepare('SELECT id, category FROM documents WHERE id = ?').get(docId);
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/folder/:id/category', (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { category, apply_to_docs = true } = req.body;
    const cleanCat = category && ['attack', 'obligation', 'defense'].includes(category) ? category : null;
    const db = getDb();
    
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    db.prepare('UPDATE folders SET category = ? WHERE id = ?').run(cleanCat, folderId);

    if (apply_to_docs) {
      db.prepare('UPDATE documents SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE folder_path = ? OR folder_path LIKE ? OR folder_path LIKE ?')
        .run(cleanCat, folder.path, `${folder.path}/%`, `${folder.path}\\%`);
    }

    res.json({ success: true, folderId, category: cleanCat, path: folder.path });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Image Streaming / Raw File (Smart Cross-Platform Resolution)
app.get('/api/image/raw', (req, res) => {
  try {
    const rawPath = req.query.path;
    if (!rawPath) {
      return res.status(400).send('Missing path parameter');
    }

    const resolved = resolveImagePath(rawPath);
    if (!resolved || !fs.existsSync(resolved)) {
      return res.status(404).send('Image file not found on disk');
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(resolved);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ====================================================
// Cloudflare-Safe Chunked Sync & Media Upload APIs
// ====================================================
const SYNC_SECRET = process.env.SYNC_SECRET_TOKEN || 'rafeeq-almunazer-sync-2026-secure';

function requireSyncAuth(req, res, next) {
  const token = req.headers['x-sync-token'] || req.query.token || req.body?.token;
  if (!token || token !== SYNC_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or missing sync token' });
  }
  next();
}

function getSyncTmpDir() {
  const primary = process.env.SYNC_TMP_DIR || (process.env.DB_PATH ? path.join(path.dirname(process.env.DB_PATH), 'tmp_sync') : path.join(__dirname, 'storage', 'tmp_sync'));
  try {
    if (!fs.existsSync(primary)) fs.mkdirSync(primary, { recursive: true });
    const testF = path.join(primary, '.write_test');
    fs.writeFileSync(testF, 'ok');
    fs.unlinkSync(testF);
    return primary;
  } catch (e) {
    const fallback = path.join(path.resolve('/tmp'), 'rafeeq_sync');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

// 1. Sync Status & Health Check
app.get('/api/sync/status', requireSyncAuth, (req, res) => {
  try {
    const db = getDb();
    const docCount = db.prepare('SELECT COUNT(*) as c FROM documents').get()?.c || 0;
    const folderCount = db.prepare('SELECT COUNT(*) as c FROM folders').get()?.c || 0;
    const dbFilePath = getDbPath();

    res.json({
      success: true,
      platform: process.platform,
      db_path: dbFilePath,
      db_exists: fs.existsSync(dbFilePath),
      db_size_bytes: fs.existsSync(dbFilePath) ? fs.statSync(dbFilePath).size : 0,
      documents_count: docCount,
      folders_count: folderCount,
      archive_path: process.env.ARCHIVE_PATH || '/app/data/archive',
      media_path: process.env.MEDIA_PATH || '/app/data/media',
      tmp_sync_dir: getSyncTmpDir(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Upload Single Chunk as Raw Binary Stream (High-Performance)
app.post('/api/sync/chunk-stream', requireSyncAuth, (req, res) => {
  try {
    const upload_id = req.query.upload_id || req.headers['x-upload-id'];
    const chunk_index = req.query.chunk_index !== undefined ? parseInt(req.query.chunk_index, 10) : parseInt(req.headers['x-chunk-index'], 10);
    const total_chunks = req.query.total_chunks ? parseInt(req.query.total_chunks, 10) : parseInt(req.headers['x-total-chunks'], 10);

    if (!upload_id || isNaN(chunk_index)) {
      return res.status(400).json({ success: false, error: 'Missing upload_id or chunk_index' });
    }

    const uploadDir = path.join(getSyncTmpDir(), upload_id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const chunkFile = path.join(uploadDir, `chunk_${String(chunk_index).padStart(5, '0')}`);
    const writeStream = fs.createWriteStream(chunkFile);

    let bytesReceived = 0;
    req.on('data', (data) => {
      bytesReceived += data.length;
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.json({
        success: true,
        upload_id,
        chunk_index,
        total_chunks,
        received_bytes: bytesReceived
      });
    });

    writeStream.on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2b. Upload Single Chunk (base64 JSON payload fallback)
app.post('/api/sync/chunk', requireSyncAuth, (req, res) => {
  try {
    const { upload_id, chunk_index, total_chunks, filename, chunk_data } = req.body;
    if (!upload_id || chunk_index === undefined || !chunk_data) {
      return res.status(400).json({ success: false, error: 'Missing required chunk fields' });
    }

    const uploadDir = path.join(getSyncTmpDir(), upload_id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const chunkFile = path.join(uploadDir, `chunk_${String(chunk_index).padStart(5, '0')}`);
    const buffer = Buffer.from(chunk_data, 'base64');
    fs.writeFileSync(chunkFile, buffer);

    res.json({
      success: true,
      upload_id,
      chunk_index,
      total_chunks,
      received_bytes: buffer.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Finalize & Extract Bundle
app.post('/api/sync/finalize', requireSyncAuth, (req, res) => {
  try {
    const { upload_id, filename = 'bundle.zip', total_chunks } = req.body;
    if (!upload_id || total_chunks === undefined) {
      return res.status(400).json({ success: false, error: 'Missing upload_id or total_chunks' });
    }

    const uploadDir = path.join(getSyncTmpDir(), upload_id);
    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({ success: false, error: 'Upload session not found' });
    }

    // Assemble assembled file
    const assembledFilePath = path.join(uploadDir, filename);
    const writeStream = fs.createWriteStream(assembledFilePath);

    for (let i = 0; i < total_chunks; i++) {
      const chunkFile = path.join(uploadDir, `chunk_${String(i).padStart(5, '0')}`);
      if (!fs.existsSync(chunkFile)) {
        writeStream.close();
        return res.status(400).json({ success: false, error: `Missing chunk ${i}` });
      }
      const data = fs.readFileSync(chunkFile);
      writeStream.write(data);
    }
    writeStream.end();


    writeStream.on('finish', () => {
      try {
        console.log(`[Sync] Assembled ${filename} (${fs.statSync(assembledFilePath).size} bytes). Extracting...`);

        // Target destinations
        const targetDataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '../media');
        const targetMediaDir = process.env.MEDIA_PATH || (process.env.ARCHIVE_PATH || path.join(targetDataDir, 'media'));

        if (!fs.existsSync(targetMediaDir)) {
          fs.mkdirSync(targetMediaDir, { recursive: true });
        }

        let extractedCount = 0;
        let dbReplaced = false;

        if (filename.endsWith('.zip')) {
          const zip = new AdmZip(assembledFilePath);
          const zipEntries = zip.getEntries();

          // Check if library.db is in the zip
          const dbEntry = zipEntries.find(e => e.entryName === 'library.db' || e.entryName.endsWith('/library.db'));
          if (dbEntry) {
            console.log('[Sync] Found library.db in archive. Hot-swapping database...');
            closeDb();
            const currentDbPath = getDbPath();
            const dbDir = path.dirname(currentDbPath);
            if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

            // Extract db
            fs.writeFileSync(currentDbPath, dbEntry.getData());
            dbReplaced = true;
            console.log('[Sync] Database replaced successfully. Reconnecting...');
            initDatabase();
          }

          // Extract media entries
          for (const entry of zipEntries) {
            if (entry.isDirectory || entry.entryName === 'library.db' || entry.entryName.endsWith('/library.db')) {
              continue;
            }

            let entryRel = entry.entryName.replace(/^media[\\/]/, '');
            const destPath = path.join(targetMediaDir, entryRel);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.writeFileSync(destPath, entry.getData());
            extractedCount++;
          }
        }

        // Clean up temporary chunks
        try {
          fs.rmSync(uploadDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('[Sync] Could not remove temp dir:', e.message);
        }

        // Recalculate stats
        const db = getDb();
        const docCount = db.prepare('SELECT COUNT(*) as c FROM documents').get()?.c || 0;
        const folderCount = db.prepare('SELECT COUNT(*) as c FROM folders').get()?.c || 0;

        res.json({
          success: true,
          message: 'Upload and sync finalized successfully!',
          extracted_files: extractedCount,
          database_replaced: dbReplaced,
          documents_count: docCount,
          folders_count: folderCount
        });
      } catch (err) {
        console.error('[Sync Error]', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    writeStream.on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Download and Extract Archive from Direct URL (e.g. Google Drive / Direct Cloud Link / GitHub Release)
app.post('/api/sync/pull-url', requireSyncAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Missing url parameter' });
    }

    console.log(`[Sync] Pulling archive from: ${url}...`);
    const tempZip = path.join(getSyncTmpDir(), `download_${Date.now()}.zip`);
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      redirect: 'follow'
    });

    if (!response.ok) {
      return res.status(400).json({ success: false, error: `Failed to fetch URL: HTTP ${response.status}` });
    }

    const fileStream = fs.createWriteStream(tempZip);
    await pipeline(Readable.fromWeb(response.body), fileStream);
    console.log(`[Sync] Downloaded ${fs.statSync(tempZip).size} bytes. Extracting...`);

    const zip = new AdmZip(tempZip);
    const zipEntries = zip.getEntries();
    
    // Check if library.db is in the zip
    const dbEntry = zipEntries.find(e => e.entryName === 'library.db' || e.entryName.endsWith('/library.db'));
    let dbReplaced = false;
    if (dbEntry) {
      console.log('[Sync] Found library.db in archive. Hot-swapping database...');
      closeDb();
      const currentDbPath = getDbPath();
      const dbDir = path.dirname(currentDbPath);
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(currentDbPath, dbEntry.getData());
      dbReplaced = true;
      initDatabase();
    }

    // Extract media entries
    const targetDataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, '../media');
    const targetMediaDir = process.env.MEDIA_PATH || (process.env.ARCHIVE_PATH || path.join(targetDataDir, 'media'));
    if (!fs.existsSync(targetMediaDir)) {
      fs.mkdirSync(targetMediaDir, { recursive: true });
    }

    let extractedCount = 0;
    for (const entry of zipEntries) {
      if (entry.isDirectory || entry.entryName === 'library.db' || entry.entryName.endsWith('/library.db')) {
        continue;
      }
      let entryRel = entry.entryName.replace(/^media[\\/]/, '');
      const destPath = path.join(targetMediaDir, entryRel);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.writeFileSync(destPath, entry.getData());
      extractedCount++;
    }

    try {
      fs.unlinkSync(tempZip);
    } catch (e) {}

    const db = getDb();
    const docCount = db.prepare('SELECT COUNT(*) as c FROM documents').get()?.c || 0;
    const folderCount = db.prepare('SELECT COUNT(*) as c FROM folders').get()?.c || 0;

    res.json({
      success: true,
      message: 'Archive pulled and extracted successfully!',
      extracted_files: extractedCount,
      database_replaced: dbReplaced,
      documents_count: docCount,
      folders_count: folderCount
    });
  } catch (err) {
    console.error('[Sync Pull Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});



// 9. Favorites / Live Debate Tray management
app.get('/api/favorites', (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT f.id as fav_id, f.notes, f.display_order, d.*
      FROM favorites f
      JOIN documents d ON f.document_id = d.id
      ORDER BY f.display_order ASC, f.id DESC
    `).all();
    const enriched = attachTagsToDocuments(db, items);
    res.json({ success: true, items: enriched, favorites: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/favorites', (req, res) => {
  try {
    const { document_id, notes } = req.body;
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO favorites (document_id, notes)
      VALUES (?, ?)
      ON CONFLICT(document_id) DO UPDATE SET notes=excluded.notes
    `);
    const result = stmt.run(document_id, notes || '');
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/favorites/:docId', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM favorites WHERE document_id = ?').run(req.params.docId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. OCR on-demand processing and automatic keyword tag extraction
app.post('/api/ocr/process-single/:docId', (req, res) => {
  const docId = parseInt(req.params.docId);
  const workerScript = path.join(__dirname, 'ocr_worker.py');
  
  const py = spawn('python', [workerScript, '--single-id', docId.toString()]);
  
  let output = '';
  py.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  py.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  py.on('close', (code) => {
    if (code === 0) {
      const db = getDb();
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
      const boxes = db.prepare('SELECT * FROM ocr_boxes WHERE document_id = ? ORDER BY line_index ASC').all(docId);
      
      if (doc && doc.ocr_text) {
        const keywords = extractDistinctKeywords(doc.ocr_text, doc.filename, 8);
        const insertTag = db.prepare("INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, 0)");
        for (const kw of keywords) {
          insertTag.run(docId, kw);
        }
      }

      const tags = db.prepare('SELECT id, tag, is_manual FROM document_tags WHERE document_id = ?').all(docId);

      res.json({
        success: true,
        document: {
          ...doc,
          tags: tags.map(t => t.tag)
        },
        tags,
        boxes: boxes.map(b => ({
          id: b.id,
          line_index: b.line_index,
          text: b.text,
          box: JSON.parse(b.box_json || '[]'),
          confidence: b.confidence
        }))
      });
    } else {
      res.status(500).json({ success: false, error: 'OCR process failed', output });
    }
  });
});

// 11. Rescan trigger
app.post('/api/scan', (req, res) => {
  try {
    const result = scanAndIndex();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// BIBLE MODULE API ROUTES
// ============================================================

// GET /api/bible/translations
app.get('/api/bible/translations', (req, res) => {
  try {
    res.json({ success: true, translations: getTranslations() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/collections
app.get('/api/bible/collections', (req, res) => {
  try {
    const cols = getCollections();
    // Add verse count per collection from default translation
    const db = getDb();
    const defaultTrans = db.prepare('SELECT id FROM bible_translations WHERE is_active=1 ORDER BY display_order LIMIT 1').get();
    const result = cols.map(col => {
      let verseCount = 0;
      if (defaultTrans) {
        const books = db.prepare('SELECT code FROM bible_books WHERE collection_id=?').all(col.id);
        const codes = books.map(b => b.code);
        if (codes.length > 0) {
          const ph = codes.map(() => '?').join(',');
          verseCount = db.prepare(`SELECT COUNT(*) as c FROM bible_verses WHERE translation_id=? AND book_code IN (${ph})`).get(defaultTrans.id, ...codes)?.c || 0;
        }
      }
      return { ...col, verseCount };
    });
    res.json({ success: true, collections: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/books?collection=old-testament
app.get('/api/bible/books', (req, res) => {
  try {
    const { collection } = req.query;
    res.json({ success: true, books: getBooks(collection || null) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/books/:code
app.get('/api/bible/books/:code', (req, res) => {
  try {
    const book = getBook(req.params.code.toUpperCase());
    if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
    res.json({ success: true, book });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/chapters?translation=ar-svd&book=MAT
app.get('/api/bible/chapters', (req, res) => {
  try {
    const db = getDb();
    let { translation = 'ar-svd', book } = req.query;
    if (!book) return res.status(400).json({ success: false, error: 'book required' });
    const bookCode = book.toUpperCase();
    const bookInfo = getBook(bookCode);

    let trans = db.prepare('SELECT id, slug FROM bible_translations WHERE slug=?').get(translation);
    let chapters = trans ? getChapterList(trans.id, bookCode) : [];

    if (chapters.length === 0 && bookInfo?.available_translations?.length > 0) {
      const fallbackSlug = bookInfo.available_translations[0];
      const fallbackTrans = db.prepare('SELECT id, slug FROM bible_translations WHERE slug=?').get(fallbackSlug);
      if (fallbackTrans) {
        chapters = getChapterList(fallbackTrans.id, bookCode);
      }
    }

    res.json({ success: true, chapters });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/chapter?translation=ar-svd&book=MAT&chapter=5
app.get('/api/bible/chapter', (req, res) => {
  try {
    const db = getDb();
    let { translation = 'ar-svd', book, chapter } = req.query;
    if (!book || !chapter) return res.status(400).json({ success: false, error: 'book and chapter required' });
    const bookCode = book.toUpperCase();
    const ch = parseInt(chapter);
    const bookInfo = getBook(bookCode);

    let trans = db.prepare('SELECT id, slug FROM bible_translations WHERE slug=?').get(translation);
    let verses = trans ? getChapter(trans.id, bookCode, ch) : [];
    let activeTranslation = trans ? trans.slug : translation;

    // Automatic fallback if translation has no verses for this book/chapter
    if (verses.length === 0 && bookInfo?.available_translations?.length > 0) {
      const fallbackSlug = bookInfo.available_translations[0];
      const fallbackTrans = db.prepare('SELECT id, slug FROM bible_translations WHERE slug=?').get(fallbackSlug);
      if (fallbackTrans) {
        trans = fallbackTrans;
        activeTranslation = fallbackSlug;
        verses = getChapter(fallbackTrans.id, bookCode, ch);
      }
    }

    const nav = trans ? getChapterNavigation(trans.id, bookCode, ch) : null;
    res.json({ success: true, verses, navigation: nav, book: bookInfo, activeTranslation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/verse?translation=ar-svd&book=MAT&chapter=5&verse=3
app.get('/api/bible/verse', (req, res) => {
  try {
    const db = getDb();
    let { translation = 'ar-svd', book, chapter, verse, verse_end } = req.query;
    if (!book || !chapter || !verse) return res.status(400).json({ success: false, error: 'book, chapter, verse required' });
    const bookCode = book.toUpperCase();
    const ch = parseInt(chapter), v = parseInt(verse);
    const bookInfo = getBook(bookCode);

    let trans = db.prepare('SELECT id, slug FROM bible_translations WHERE slug=?').get(translation);
    let activeTranslation = trans ? trans.slug : translation;
    let verses = [];

    if (trans) {
      if (verse_end) {
        verses = getVerseRange(trans.id, bookCode, ch, v, parseInt(verse_end));
      } else {
        const single = getVerse(trans.id, bookCode, ch, v);
        verses = single ? [single] : [];
      }
    }

    // Fallback if empty and available_translations exist
    if (verses.length === 0 && bookInfo?.available_translations?.length > 0) {
      const fallbackSlug = bookInfo.available_translations[0];
      const fallbackTrans = db.prepare('SELECT id, slug FROM bible_translations WHERE slug=?').get(fallbackSlug);
      if (fallbackTrans) {
        trans = fallbackTrans;
        activeTranslation = fallbackSlug;
        if (verse_end) {
          verses = getVerseRange(fallbackTrans.id, bookCode, ch, v, parseInt(verse_end));
        } else {
          const single = getVerse(fallbackTrans.id, bookCode, ch, v);
          verses = single ? [single] : [];
        }
      }
    }

    if (!verses.length) {
      return res.status(404).json({ success: false, error: 'هذا النص غير متوفر في الترجمة المحددة.' });
    }
    const nav = trans ? getVerseNavigation(trans.id, bookCode, ch, v) : null;
    res.json({ success: true, verses, navigation: nav, book: bookInfo, activeTranslation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/compare?book=MAT&chapter=5&verse=3&translations=ar-svd,ar-nav
app.get('/api/bible/compare', (req, res) => {
  try {
    const db = getDb();
    const { book, chapter, verse, translations } = req.query;
    if (!book || !chapter || !verse) return res.status(400).json({ success: false, error: 'book, chapter, verse required' });
    const slugs = (translations || '').split(',').filter(Boolean);
    if (!slugs.length) return res.status(400).json({ success: false, error: 'translations required' });
    const ids = slugs.map(s => {
      const t = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(s);
      return t?.id;
    }).filter(Boolean);
    const results = getVerseAcrossTranslations(book.toUpperCase(), parseInt(chapter), parseInt(verse), ids);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/compare-chapter?book=MAT&chapter=5&translations=ar-svd,ar-nav
app.get('/api/bible/compare-chapter', (req, res) => {
  try {
    const db = getDb();
    const { book, chapter, translations } = req.query;
    if (!book || !chapter) return res.status(400).json({ success: false, error: 'book and chapter required' });
    const bookCode = book.toUpperCase();
    const bookInfo = getBook(bookCode);

    let slugs = (translations || '').split(',').filter(Boolean);
    if (!slugs.length) return res.status(400).json({ success: false, error: 'translations required' });

    // Filter to available translations if known, or fallback
    if (bookInfo?.available_translations?.length > 0) {
      const validSlugs = slugs.filter(s => bookInfo.available_translations.includes(s));
      if (validSlugs.length > 0) {
        slugs = validSlugs;
      } else {
        slugs = bookInfo.available_translations.slice(0, 2);
      }
    }

    const transMap = {};
    const ids = slugs.map(s => {
      const t = db.prepare('SELECT id, slug, name_ar, abbreviation FROM bible_translations WHERE slug=?').get(s);
      if (t) transMap[t.id] = t;
      return t?.id;
    }).filter(Boolean);

    const verses = getChapterAcrossTranslations(bookCode, parseInt(chapter), ids);
    const nav = ids.length > 0 ? getChapterNavigation(ids[0], bookCode, parseInt(chapter)) : null;

    // Group by verse number for parallel reading
    const groupedMap = new Map();
    for (const row of verses) {
      if (!groupedMap.has(row.verse)) {
        groupedMap.set(row.verse, { verse: row.verse, translations: {} });
      }
      groupedMap.get(row.verse).translations[row.translation_slug] = {
        id: row.id,
        text: row.text,
        translation_id: row.translation_id,
        translation_name: row.translation_name,
        translation_slug: row.translation_slug,
        translation_abbr: row.translation_abbr
      };
    }
    const groupedVerses = Array.from(groupedMap.values()).sort((a, b) => a.verse - b.verse);

    res.json({
      success: true,
      verses: groupedVerses,
      rawVerses: verses,
      translations: slugs.map(s => {
        return db.prepare('SELECT id, slug, name_ar, abbreviation FROM bible_translations WHERE slug=?').get(s);
      }).filter(Boolean),
      navigation: nav,
      book: bookInfo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/bible/search?q=ملكوت السماوات&translations=ar-svd,ar-nav&book=MAT&collection=new-testament&page=1
app.get('/api/bible/search', (req, res) => {
  try {
    const db = getDb();
    const { q, translations, translation, book, collection, page = 1, limit = 30 } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ success: false, error: 'q required' });

    const rawSlugs = (translations || translation || 'all').split(',').map(s => s.trim()).filter(Boolean);
    let translationIds = null;
    if (!rawSlugs.includes('all')) {
      const transRows = db.prepare(`SELECT id FROM bible_translations WHERE slug IN (${rawSlugs.map(() => '?').join(',')})`).all(...rawSlugs);
      translationIds = transRows.map(r => r.id);
    }

    const result = searchBible({
      query: q.trim(),
      translationIds,
      bookCode: book ? book.toUpperCase() : null,
      collectionSlug: collection || null,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bible/stats
app.get('/api/bible/stats', (req, res) => {
  try {
    res.json({ success: true, ...getBibleStats() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Serve frontend static build files (client/dist)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/ready')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err.message);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// Start Express Server
const server = app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(` «رفيق المناظر» API Server running on http://${HOST}:${PORT}`);
  console.log(` Health check available at: http://${HOST}:${PORT}/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

// Graceful Shutdown Handlers (Rule 8)
function handleGracefulShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[Shutdown] HTTP server closed.');
    try {
      const db = getDb();
      if (db && db.close) {
        db.close();
        console.log('[Shutdown] Database connection closed.');
      }
    } catch (e) {
      console.error('[Shutdown Error]', e.message);
    }
    process.exit(0);
  });

  // Force shutdown after 10s if stuck
  setTimeout(() => {
    console.error('[Shutdown] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
