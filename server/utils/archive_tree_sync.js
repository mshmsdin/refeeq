import fs from 'node:fs';
import { recountArchiveFolders } from './archive_metadata.js';

export function archiveDocumentHighWater(db) {
  let highWater = db.prepare('SELECT COALESCE(MAX(id), 0) AS c FROM documents').get().c;
  for (const table of ['document_tags', 'ocr_boxes', 'document_folders', 'favorites']) {
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) {
      highWater = Math.max(highWater, db.prepare(`SELECT COALESCE(MAX(document_id), 0) AS c FROM ${table}`).get().c);
    }
  }
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'").get()) {
    highWater = Math.max(highWater, db.prepare("SELECT seq FROM sqlite_sequence WHERE name='documents'").get()?.seq || 0);
  }
  return highWater;
}

// Restore an archive hierarchy atomically, keeping live document IDs and text.
export function prepareArchiveRestore(db, manifest, resolveMedia) {
  const fail = message => { const error = new Error(message); error.status = 400; throw error; };
  if (!manifest || !Array.isArray(manifest.folders) || manifest.folders.length > 5000 ||
      !Array.isArray(manifest.documents) || manifest.documents.length > 20000 ||
      !Array.isArray(manifest.links) || manifest.links.length > 30000 ||
      !Array.isArray(manifest.renames) || manifest.renames.length > 100) fail('Invalid archive manifest');
  const existingFolders = db.prepare('SELECT id, path, parent_path, name, sect FROM folders').all();
  const folderMap = new Map(existingFolders.map(f => [f.path, f]));
  const newFolders = new Map();
  const validPath = value => typeof value === 'string' && value.length > 0 &&
    value.split(/[\\/]/).every(part => part && part !== '.' && part !== '..');
  for (const folder of manifest.folders) {
    if (!validPath(folder.path) || typeof folder.name !== 'string' || !folder.name.trim() ||
        typeof folder.sect !== 'string' || !folder.sect.trim() || typeof folder.parent_path !== 'string' ||
        (folder.parent_path && !folder.path.startsWith(`${folder.parent_path}\\`))) fail('Invalid folder hierarchy');
    if (newFolders.has(folder.path)) fail('Duplicate folder path');
    if (folderMap.has(folder.path) && folderMap.get(folder.path).sect !== folder.sect) fail('Folder sect conflict');
    newFolders.set(folder.path, folder);
    folderMap.set(folder.path, { ...folderMap.get(folder.path), ...folder });
  }
  for (const folder of manifest.folders) {
    if (folder.parent_path && (!folderMap.has(folder.parent_path) || folderMap.get(folder.parent_path).sect !== folder.sect)) fail('Missing folder parent');
  }
  for (const rename of manifest.renames) {
    const from = existingFolders.find(f => f.path === rename.old_path);
    const to = newFolders.get(rename.path);
    if (!to || (from && from.sect !== to.sect)) fail('Invalid folder move');
    if (from && existingFolders.some(f => f.parent_path === from.path)) fail('Only leaf folders can be moved by this restore');
    if (from && existingFolders.some(f => f.path === rename.path && f.id !== from.id)) fail('Folder move conflict');
    if (!from && !existingFolders.some(f => f.path === rename.path)) fail('Original folder missing');
  }
  const rows = db.prepare('SELECT id, relative_path FROM documents').all();
  const ids = new Map(rows.map(d => [d.id, d.relative_path]));
  const paths = new Map(rows.map(d => [d.relative_path, d.id]));
  const missing = [];
  const seenIds = new Set();
  const seenPaths = new Set();
  for (const document of manifest.documents) {
    const folder = folderMap.get(document.folder_path);
    if (!Number.isSafeInteger(document.id) || document.id <= 0 || !validPath(document.relative_path) ||
        typeof document.filename !== 'string' || !document.filename.trim() || !folder || folder.sect !== document.sect ||
        seenIds.has(document.id) || seenPaths.has(document.relative_path)) fail('Invalid document metadata');
    seenIds.add(document.id); seenPaths.add(document.relative_path);
    if (ids.has(document.id)) {
      if (ids.get(document.id) !== document.relative_path) fail('Document ID conflict');
    } else {
      if (paths.has(document.relative_path)) fail('Document path conflict');
      const resolved = resolveMedia(document.relative_path);
      if (!resolved) fail(`Missing media for document ${document.id}`);
      missing.push({ ...document, resolved, file_size: fs.statSync(resolved).size, folder_name: folder.name });
    }
    ids.set(document.id, document.relative_path);
  }
  const baseCount = manifest.expected_document_count;
  const newCount = manifest.documents.length;
  if (!Number.isSafeInteger(baseCount) || (rows.length !== baseCount &&
      !(rows.length === baseCount + newCount && missing.length === 0))) fail('Live archive changed; prepare a fresh manifest');
  const maxId = Math.max(0, ...rows.map(d => d.id));
  if (missing.length && maxId !== manifest.expected_max_id) fail('Live document IDs changed');
  const highWater = archiveDocumentHighWater(db);
  if (missing.some(d => d.id <= highWater)) fail('Recovered document IDs would reuse old archive references');
  for (const link of manifest.links) {
    if (!ids.has(link.document_id) || !folderMap.has(link.folder_path)) fail('Invalid document-folder link');
  }
  return { missing, currentCount: rows.length };
}

export function applyArchiveRestore(db, manifest, prepared) {
  return db.transaction(() => {
    if (db.prepare('SELECT COUNT(*) AS c FROM documents').get().c !== prepared.currentCount) {
      throw new Error('Live archive changed during backup');
    }
    const moveFolder = db.prepare('UPDATE folders SET path = ?, name = ?, parent_path = ? WHERE path = ?');
    const moveDocuments = db.prepare('UPDATE documents SET folder_path = ?, folder_name = ? WHERE folder_path = ?');
    const moveLinks = db.prepare('UPDATE document_folders SET folder_path = ? WHERE folder_path = ?');
    const moveChildren = db.prepare('UPDATE folders SET parent_path = ? WHERE parent_path = ?');
    for (const move of manifest.renames) {
      const folder = manifest.folders.find(f => f.path === move.path);
      moveDocuments.run(move.path, folder.name, move.old_path);
      moveLinks.run(move.path, move.old_path);
      moveChildren.run(move.path, move.old_path);
      moveFolder.run(move.path, folder.name, folder.parent_path, move.old_path);
    }
    const upsertFolder = db.prepare(`INSERT INTO folders (path, name, parent_path, sect)
      VALUES (@path, @name, @parent_path, @sect) ON CONFLICT(path) DO UPDATE SET
      name=excluded.name, parent_path=excluded.parent_path`);
    for (const folder of manifest.folders) upsertFolder.run(folder);
    const insertDocument = db.prepare(`INSERT INTO documents
      (id, filename, relative_path, full_path, folder_name, folder_path, sect, book_source, file_size)
      VALUES (@id, @filename, @relative_path, @resolved, @folder_name, @folder_path, @sect, @book_source, @file_size)`);
    for (const document of prepared.missing) insertDocument.run({ ...document, book_source: document.book_source || null });
    const findFolder = db.prepare('SELECT id FROM folders WHERE path = ?');
    const insertLink = db.prepare(`INSERT OR IGNORE INTO document_folders (document_id, folder_id, folder_path) VALUES (?, ?, ?)`);
    let linked = 0;
    for (const link of manifest.links) linked += insertLink.run(link.document_id, findFolder.get(link.folder_path).id, link.folder_path).changes;
    // Roll up distinct documents through real parent relationships, including aliases.
    recountArchiveFolders(db);
    return { inserted: prepared.missing.length, linked,
      documents_count: db.prepare('SELECT COUNT(*) AS c FROM documents').get().c,
      folders_count: db.prepare('SELECT COUNT(*) AS c FROM folders').get().c };
  })();
}
