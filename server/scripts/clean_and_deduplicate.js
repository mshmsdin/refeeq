import Database from 'better-sqlite3';
const db = new Database('./db/library.db');

console.log('══════════════════════════════════════════════════════════');
console.log('🧹 تنظيف وتدقيق قاعدة البيانات وإزالة التكرارات');
console.log('══════════════════════════════════════════════════════════');

const cleanupTx = db.transaction(() => {
  // 1. Remove Exact Duplicate Documents (Same folder, same filename, same file)
  console.log('\n--- 1. فحص وحذف الوثائق المكررة ---');
  
  // Find duplicate pairs
  const dups = db.prepare(`
    SELECT folder_path, filename, GROUP_CONCAT(id) as id_list
    FROM documents
    GROUP BY folder_path, filename
    HAVING COUNT(*) > 1
  `).all();

  let removedDocsCount = 0;
  for (const d of dups) {
    const ids = d.id_list.split(',').map(Number);
    // Sort so that documents with completed OCR or larger text come first
    const docRecords = ids.map(id => db.prepare("SELECT id, ocr_status, LENGTH(ocr_text) as len FROM documents WHERE id = ?").get(id));
    docRecords.sort((a, b) => {
      if (a.ocr_status === 'completed' && b.ocr_status !== 'completed') return -1;
      if (b.ocr_status === 'completed' && a.ocr_status !== 'completed') return 1;
      return (b.len || 0) - (a.len || 0);
    });

    const keepId = docRecords[0].id;
    const removeIds = docRecords.slice(1).map(r => r.id);

    for (const rId of removeIds) {
      db.prepare("DELETE FROM ocr_boxes WHERE document_id = ?").run(rId);
      db.prepare("DELETE FROM document_tags WHERE document_id = ?").run(rId);
      db.prepare("DELETE FROM favorites WHERE document_id = ?").run(rId);
      db.prepare("DELETE FROM documents WHERE id = ?").run(rId);
      removedDocsCount++;
    }
  }
  console.log(`✅ تم حذف ${removedDocsCount} وثيقة مكررة.`);

  // 2. Remove Empty / Dangling Leaf Folders (0 documents & 0 subfolders)
  console.log('\n--- 2. تنظيف المجلدات الفارغة غير المستخدمة ---');
  let removedFoldersCount = 0;
  let hasMore = true;

  while (hasMore) {
    const emptyLeafs = db.prepare(`
      SELECT id, path, name FROM folders f
      WHERE (
        SELECT COUNT(*) FROM documents d 
        WHERE d.folder_path = f.path OR d.folder_path LIKE f.path || '\\%' OR d.folder_path LIKE f.path || '/%'
      ) = 0
      AND (
        SELECT COUNT(*) FROM folders sub WHERE sub.parent_path = f.path
      ) = 0
    `).all();

    if (emptyLeafs.length === 0) {
      hasMore = false;
      break;
    }

    for (const ef of emptyLeafs) {
      db.prepare("DELETE FROM folders WHERE id = ?").run(ef.id);
      removedFoldersCount++;
    }
  }
  console.log(`✅ تم حذف ${removedFoldersCount} مجلداً فارغاً.`);

  // 3. Update File Counts for all folders
  console.log('\n--- 3. إعادة حساب وتحديث أعداد الوثائق في جميع المجلدات ---');
  db.prepare(`
    UPDATE folders SET file_count = (
      SELECT COUNT(*) FROM documents 
      WHERE folder_path = folders.path 
         OR folder_path LIKE folders.path || '\\%' 
         OR folder_path LIKE folders.path || '/%'
    )
  `).run();

  // 4. Remove orphaned tags and OCR boxes
  db.prepare("DELETE FROM document_tags WHERE document_id NOT IN (SELECT id FROM documents)").run();
  db.prepare("DELETE FROM ocr_boxes WHERE document_id NOT IN (SELECT id FROM documents)").run();
  db.prepare("DELETE FROM favorites WHERE document_id NOT IN (SELECT id FROM documents)").run();

  console.log('✅ تم تحديث الأعداد وإزالة الوسوم اليتيمة بنجاح.');
});

cleanupTx();

// Final Report
console.log('\n══════════════════════════════════════════════════════');
console.log('📊 تقرير الحالة النهائي بعد التدقيق والتنظيف:');
const totalDocs = db.prepare("SELECT COUNT(*) as c FROM documents").get().c;
const totalFolders = db.prepare("SELECT COUNT(*) as c FROM folders").get().c;
console.log(`- إجمالي الوثائق المعتمدة الفريدة: ${totalDocs}`);
console.log(`- إجمالي المجلدات النشطة: ${totalFolders}`);

const sectCounts = db.prepare("SELECT sect, COUNT(*) as count FROM documents GROUP BY sect").all();
console.log('\nتوزيع الوثائق حسب الأقسام:');
sectCounts.forEach(s => console.log(`  - قسم ${s.sect}: ${s.count} وثيقة`));

db.close();
