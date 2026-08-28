import Database from 'better-sqlite3';
const db = new Database('./db/library.db');

console.log('══════════════════════════════════════════════════════════');
console.log('⚡ فحص وتدقيق سريع وشامل لقاعدة البيانات وإزالة التكرارات');
console.log('══════════════════════════════════════════════════════════');

// 1. Remove duplicate documents
const dups = db.prepare(`
  SELECT folder_path, filename, GROUP_CONCAT(id) as id_list
  FROM documents
  GROUP BY folder_path, filename
  HAVING COUNT(*) > 1
`).all();

let removedDocs = 0;
const delDocTx = db.transaction(() => {
  for (const d of dups) {
    const ids = d.id_list.split(',').map(Number);
    const docRecords = ids.map(id => db.prepare("SELECT id, ocr_status, LENGTH(ocr_text) as len FROM documents WHERE id = ?").get(id)).filter(Boolean);
    if (docRecords.length <= 1) continue;

    docRecords.sort((a, b) => {
      if (a.ocr_status === 'completed' && b.ocr_status !== 'completed') return -1;
      if (b.ocr_status === 'completed' && a.ocr_status !== 'completed') return 1;
      return (b.len || 0) - (a.len || 0);
    });

    const removeIds = docRecords.slice(1).map(r => r.id);
    for (const rId of removeIds) {
      db.prepare("DELETE FROM ocr_boxes WHERE document_id = ?").run(rId);
      db.prepare("DELETE FROM document_tags WHERE document_id = ?").run(rId);
      db.prepare("DELETE FROM favorites WHERE document_id = ?").run(rId);
      db.prepare("DELETE FROM documents WHERE id = ?").run(rId);
      removedDocs++;
    }
  }
});
delDocTx();
console.log(`✅ تم حذف ${removedDocs} وثيقة مكررة.`);

// 2. Remove Empty Leaf Folders (Fast index-based approach)
console.log('\n--- تنظيف المجلدات الفارغة اليتيمة ---');
// Get all folder paths currently referenced by documents
const usedFolderPaths = new Set(db.prepare("SELECT DISTINCT folder_path FROM documents").all().map(r => r.folder_path));
const allFolders = db.prepare("SELECT id, path, parent_path, name FROM folders").all();
const folderMap = new Map(allFolders.map(f => [f.path, f]));

// Find which folders have descendants in usedFolderPaths
const liveFolderPaths = new Set();
for (const uPath of usedFolderPaths) {
  let curr = uPath;
  while (curr) {
    liveFolderPaths.add(curr);
    const fObj = folderMap.get(curr);
    curr = fObj ? fObj.parent_path : null;
  }
}

// Delete folders not in liveFolderPaths
let removedFolders = 0;
const delFoldersTx = db.transaction(() => {
  for (const f of allFolders) {
    if (!liveFolderPaths.has(f.path)) {
      db.prepare("DELETE FROM folders WHERE id = ?").run(f.id);
      removedFolders++;
    }
  }
});
delFoldersTx();
console.log(`✅ تم حذف ${removedFolders} مجلداً فارغاً غير مستخدم.`);

// 3. Fast Accurate Update of file_counts
console.log('\n--- تحديث أعداد الوثائق في المجلدات بدقة فائقة ---');
// Count direct documents per folder
const directCounts = db.prepare(`
  SELECT folder_path, COUNT(*) as c 
  FROM documents 
  GROUP BY folder_path
`).all();

const countsMap = new Map();
for (const row of directCounts) {
  let curr = row.folder_path;
  while (curr) {
    countsMap.set(curr, (countsMap.get(curr) || 0) + row.c);
    const fObj = folderMap.get(curr);
    curr = fObj ? fObj.parent_path : null;
  }
}

const updateCountTx = db.transaction(() => {
  const updateStmt = db.prepare("UPDATE folders SET file_count = ? WHERE path = ?");
  for (const [fPath, count] of countsMap.entries()) {
    updateStmt.run(count, fPath);
  }
  // Zero out remaining
  db.prepare("UPDATE folders SET file_count = 0 WHERE path NOT IN (" + Array.from(countsMap.keys()).map(() => '?').join(',') + ")").run(...Array.from(countsMap.keys()));
});
updateCountTx();
console.log('✅ تم تحديث أعداد جميع المجلدات فورياً.');

// 4. Cleanup orphaned metadata
db.prepare("DELETE FROM document_tags WHERE document_id NOT IN (SELECT id FROM documents)").run();
db.prepare("DELETE FROM ocr_boxes WHERE document_id NOT IN (SELECT id FROM documents)").run();
db.prepare("DELETE FROM favorites WHERE document_id NOT IN (SELECT id FROM documents)").run();

console.log('\n══════════════════════════════════════════════════════');
console.log('📊 تقرير الفحص النهائي:');
const totalDocs = db.prepare("SELECT COUNT(*) as c FROM documents").get().c;
const totalFolders = db.prepare("SELECT COUNT(*) as c FROM folders").get().c;
console.log(`- إجمالي الوثائق المعتمدة الفريدة: ${totalDocs}`);
console.log(`- إجمالي المجلدات النشطة المعتمدة: ${totalFolders}`);

const sectCounts = db.prepare("SELECT sect, COUNT(*) as count FROM documents GROUP BY sect").all();
console.log('\nتوزيع الوثائق حسب الأقسام:');
sectCounts.forEach(s => console.log(`  - قسم ${s.sect}: ${s.count} وثيقة`));

db.close();
