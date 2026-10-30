import { recountArchiveFolders } from './archive_metadata.js';

const imageExtension = /\.(?:jpe?g|png|webp|gif|bmp|svg)$/i;
const numberedImage = /_(\d+)(?=\.[^.]+$)/;

function readImagePaths(imagesJson, relativePath) {
  if (imagesJson) {
    try {
      const paths = JSON.parse(imagesJson);
      if (Array.isArray(paths)) return paths.filter(value => typeof value === 'string' && imageExtension.test(value));
    } catch {}
  }
  return imageExtension.test(relativePath || '') ? [relativePath] : [];
}

export function reorganizeNumberedImageAlbums(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS document_aliases (
    alias_id INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
  )`);

  return db.transaction(() => {
    const docs = db.prepare('SELECT * FROM documents ORDER BY id').all();
    const groups = new Map();
    for (const doc of docs) {
      const match = doc.filename.match(numberedImage);
      if (!match || readImagePaths(doc.images_json, doc.relative_path).length > 1) continue;
      const stem = doc.filename.replace(numberedImage, '');
      const key = JSON.stringify([doc.sect, doc.folder_path, doc.book_source || '', doc.category || '', stem]);
      if (!groups.has(key)) groups.set(key, { stem, rows: [] });
      groups.get(key).rows.push({ doc, sequence: Number(match[1]) });
    }

    const alias = db.prepare('INSERT OR REPLACE INTO document_aliases(alias_id,document_id) VALUES(?,?)');
    const mergeBoxes = db.prepare('UPDATE ocr_boxes SET document_id=? WHERE document_id=?');
    const mergeTags = db.prepare(`INSERT OR IGNORE INTO document_tags(document_id,tag,is_manual,created_at)
      SELECT ?,tag,is_manual,created_at FROM document_tags WHERE document_id=?`);
    const mergeFavorites = db.prepare(`INSERT OR IGNORE INTO favorites(document_id,notes,display_order,created_at)
      SELECT ?,notes,display_order,created_at FROM favorites WHERE document_id=?`);
    const mergeFolders = db.prepare(`INSERT OR IGNORE INTO document_folders(document_id,folder_id,folder_path,created_at)
      SELECT ?,folder_id,folder_path,created_at FROM document_folders WHERE document_id=?`);
    const removeFolderLinks = db.prepare('DELETE FROM document_folders WHERE document_id=?');
    const removeDocument = db.prepare('DELETE FROM documents WHERE id=?');
    const updateAlbum = db.prepare(`UPDATE documents
      SET filename=?,images_json=?,image_count=?,file_size=?,ocr_text=?,ocr_status=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=?`);
    const albumsBySect = {};
    let mergedAlbums = 0;
    let removedRows = 0;
    let groupedImages = 0;

    for (const group of groups.values()) {
      const numberedRows = group.rows.slice().sort((a, b) => a.sequence - b.sequence);
      const sequences = numberedRows.map(row => row.sequence);
      const isContiguousAlbum = numberedRows.length > 1 &&
        new Set(sequences).size === numberedRows.length &&
        sequences.every((sequence, index) => sequence === index + 1) &&
        numberedRows.every(row => imageExtension.test(row.doc.relative_path || ''));
      if (!isContiguousAlbum) continue;

      const canonical = numberedRows[0].doc;
      const images = numberedRows.flatMap(({ doc }) => readImagePaths(doc.images_json, doc.relative_path));
      if (images.length !== numberedRows.length) continue;
      const texts = [...new Set(numberedRows.map(({ doc }) => (doc.ocr_text || '').trim()).filter(Boolean))];
      const allOcrComplete = numberedRows.every(({ doc }) => doc.ocr_status === 'completed');
      const anyOcrComplete = numberedRows.some(({ doc }) => doc.ocr_status === 'completed');
      const ocrStatus = allOcrComplete ? 'completed' : anyOcrComplete ? 'pending' : (canonical.ocr_status || 'pending');

      updateAlbum.run(
        group.stem,
        JSON.stringify(images),
        images.length,
        numberedRows.reduce((sum, { doc }) => sum + (Number(doc.file_size) || 0), 0),
        texts.join('\n\n'),
        ocrStatus,
        canonical.id
      );

      for (const { doc } of numberedRows.slice(1)) {
        alias.run(doc.id, canonical.id);
        mergeBoxes.run(canonical.id, doc.id);
        mergeTags.run(canonical.id, doc.id);
        mergeFavorites.run(canonical.id, doc.id);
        mergeFolders.run(canonical.id, doc.id);
        removeFolderLinks.run(doc.id);
        removeDocument.run(doc.id);
        removedRows++;
      }

      albumsBySect[canonical.sect] = (albumsBySect[canonical.sect] || 0) + 1;
      mergedAlbums++;
      groupedImages += images.length;
    }

    if (mergedAlbums > 0) {
      db.prepare("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')").run();
      recountArchiveFolders(db);
    }

    return { scannedDocuments: docs.length, mergedAlbums, removedRows, groupedImages, albumsBySect };
  })();
}
