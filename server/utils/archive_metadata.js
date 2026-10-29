import crypto from 'node:crypto';

export const DEBATE_TYPES = new Set(['attack', 'obligation', 'defense']);

export function declaredDebateType(value, folderPath = '') {
  if (DEBATE_TYPES.has(value)) return value;
  for (const text of [value, folderPath.split(/[\\/]/)[0]]) {
    if (typeof text !== 'string') continue;
    if (/^(?:الهجوم|هجوم)(?:\s|$)/u.test(text)) return 'attack';
    if (/^(?:الإلزام|الالزام|إلزام|الزام)(?:\s|$)/u.test(text)) return 'obligation';
    if (/^(?:الدفاع|دفاع)(?:\s|$)/u.test(text)) return 'defense';
  }
  return null;
}

export function recountArchiveFolders(db) {
  db.exec(`WITH RECURSIVE hierarchy(ancestor, descendant) AS (
    SELECT id, id FROM folders
    UNION
    SELECT h.ancestor, child.id FROM hierarchy h
    JOIN folders parent ON parent.id=h.descendant
    JOIN folders child ON child.parent_path=parent.path AND child.sect=parent.sect
  ), membership(folder_id, document_id) AS (
    SELECT f.id,d.id FROM folders f JOIN documents d ON d.folder_path=f.path AND d.sect=f.sect
    UNION SELECT df.folder_id,df.document_id FROM document_folders df
      JOIN documents d ON d.id=df.document_id JOIN folders f ON f.id=df.folder_id AND f.sect=d.sect
  ), totals AS (
    SELECT h.ancestor,COUNT(DISTINCT m.document_id) AS c
    FROM hierarchy h JOIN membership m ON m.folder_id=h.descendant GROUP BY h.ancestor
  ) UPDATE folders SET file_count=COALESCE((SELECT c FROM totals WHERE ancestor=folders.id),0)`);
}

export function auditArchiveMetadata(db) {
  const invalid = table => db.prepare(`SELECT COUNT(*) AS c FROM ${table}
    WHERE category IS NOT NULL AND category NOT IN ('attack','obligation','defense')`).get().c;
  const orphanParents = db.prepare(`SELECT f.id,f.name,f.path,f.parent_path,f.sect FROM folders f
    WHERE f.parent_path IS NOT NULL AND f.parent_path!=''
      AND NOT EXISTS (SELECT 1 FROM folders p WHERE p.path=f.parent_path AND p.sect=f.sect)`).all();
  const missingFolders = db.prepare(`SELECT COUNT(*) AS c FROM documents d WHERE
    NOT EXISTS (SELECT 1 FROM folders f WHERE f.path=d.folder_path AND f.sect=d.sect)`).get().c;
  const fingerprint = crypto.createHash('sha256');
  for (const row of db.prepare('SELECT id,sect,filename,relative_path,ocr_text,images_json,book_source FROM documents ORDER BY id').iterate()) {
    fingerprint.update(JSON.stringify(row));
    fingerprint.update('\n');
  }
  const settings = crypto.createHash('sha256');
  for (const table of ['document_tags','favorites']) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
    settings.update(table);
    for (const row of db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).iterate()) settings.update(JSON.stringify(row)+'\n');
  }
  return {
    settings_fingerprint: settings.digest('hex'),
    documents: db.prepare('SELECT COUNT(*) AS c FROM documents').get().c,
    folders: db.prepare('SELECT COUNT(*) AS c FROM folders').get().c,
    sections: db.prepare(`SELECT d.sect,COUNT(*) AS documents,
      (SELECT COUNT(*) FROM folders f WHERE f.sect=d.sect) AS folders,
      (SELECT COUNT(*) FROM folders f WHERE f.sect=d.sect AND COALESCE(f.parent_path,'')='') AS roots
      FROM documents d GROUP BY d.sect ORDER BY d.sect`).all(),
    orphan_parents: orphanParents,
    missing_primary_folders: missingFolders,
    invalid_document_categories: invalid('documents'),
    invalid_folder_categories: invalid('folders'),
    content_fingerprint: fingerprint.digest('hex')
  };
}

export function repairArchiveMetadata(db, {rebuildSearch = false} = {}) {
  return db.transaction(() => {
    const folders = new Map(db.prepare('SELECT * FROM folders').all().map(f=>[f.path,f]));
    const insert = db.prepare('INSERT INTO folders (path,name,parent_path,sect,category) VALUES (?,?,?,?,?)');
    let created = 0, normalizedDocuments = 0, normalizedFolders = 0;
    function ensureFolder(folderPath, sect, name) {
      if (!folderPath) return;
      if (folders.has(folderPath)) {
        if (folders.get(folderPath).sect !== sect) throw new Error('Folder belongs to a different section');
        return;
      }
      const parent = folderPath.replace(/[\\/][^\\/]+$/, '');
      const parentPath = parent === folderPath ? '' : parent;
      if (parentPath) ensureFolder(parentPath, sect);
      const folderName = name || folderPath.split(/[\\/]/).pop();
      const category = declaredDebateType(null, folderPath);
      const result = insert.run(folderPath, folderName, parentPath, sect, category);
      folders.set(folderPath,{id:result.lastInsertRowid,path:folderPath,parent_path:parentPath,sect,name:folderName,category});
      created++;
    }
    for (const f of [...folders.values()]) if (f.parent_path) ensureFolder(f.parent_path,f.sect);
    for (const d of db.prepare('SELECT folder_path,folder_name,sect FROM documents GROUP BY folder_path,sect').all()) {
      ensureFolder(d.folder_path,d.sect,d.folder_name);
    }
    const updateFolder = db.prepare('UPDATE folders SET category=? WHERE id=?');
    for (const f of folders.values()) {
      const category = f.category ? declaredDebateType(f.category,f.path) : null;
      if ((f.category || null) !== category) {updateFolder.run(category,f.id);normalizedFolders++;}
    }
    const updateDocument = db.prepare('UPDATE documents SET category=? WHERE id=?');
    for (const d of db.prepare('SELECT id,category,folder_path FROM documents').all()) {
      const category = d.category ? declaredDebateType(d.category,d.folder_path) : null;
      if ((d.category || null) !== category) {updateDocument.run(category,d.id);normalizedDocuments++;}
    }
    recountArchiveFolders(db);
    if (rebuildSearch) db.exec("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')");
    return {created_parents:created,normalized_documents:normalizedDocuments,normalized_folders:normalizedFolders,
      totalFiles:db.prepare('SELECT COUNT(*) AS c FROM documents').get().c,search_rebuilt:rebuildSearch};
  })();
}
