import path from 'node:path';
import { recountArchiveFolders } from './archive_metadata.js';

const imageSuffix = /_(\d+)(?=\.[^.]+$)/;
const imageExtension = /\.(?:jpe?g|png|webp|gif|bmp|svg)$/i;
const assignedChildFolders = [
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\عبادة المسيح والقديسين',
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\المسيح يعبد الله ويصلي له',
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\الثالوث والأقانيم',
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\التجسد والطبيعة البشرية للمسيح',
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\نصوص الاستدلال بألوهية المسيح',
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\نشأة العقيدة والخلافات الكنسية',
  'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\التحريف والإضافات والحذف',
  'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\المخطوطات والترجمات والنقد النصي',
  'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\تناقضات روايات الأناجيل',
  'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\مصادر الأناجيل وقانونية الأسفار',
  'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\البشارات والنبوات في الكتاب المقدس'
];
const existingRoots = new Set([
  'ألوهية المسيح وعقيدة الثالوث ونقد التجسد',
  'الأخلاق والتشريعات والعنف والحروب في الكتاب المقدس',
  'المرأة والأسرة والزواج والطلاق في المسيحية',
  'تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس',
  'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل',
  'دراسات العهد الجديد ورسائل بولس ونقد تلاميذه',
  'دراسات وبشارات العهد القديم ونبوءات النبي محمد ﷺ',
  'شهادات واعترافات علماء وباحثي اللاهوت الغربيين',
  'قضية الصلب والفداء والقيامة والصلب المزعوم',
  'مناظرات وردود عامة على الشبهات المسيحية'
]);

function destination(title, currentPath, childPaths) {
  const currentChild = childPaths.get(currentPath);
  if (/حجاب|المرأة|المراة|النساء|زواج|الزواج|الطلاق|الأسرة|الزوجة|تعدد الزوجات|ختان المرأة/u.test(title)) return 'المرأة والأسرة والزواج والطلاق في المسيحية';
  if (/انحراف خلقي|الانحراف الخلقي|أخلاق|أخلاقي|نوح وابنه|شرب من الخمر|قتل|حرب|عنف|سبي|إبادة|جزية|زنى|زنا/u.test(title)) return 'الأخلاق والتشريعات والعنف والحروب في الكتاب المقدس';
  if (/عبادة[_\s-]*(?:المسيح|يسوع)|(?:المسيح|يسوع)[_\s-]*عبادة|عبادة.*(?:المسيح|يسوع)|يعبد(?:ون|ه).*المسيح|يسجد(?:ون|له).*المسيح|تأليه[_\s-]*(?:المسيح|مريم|العذراء)|عبادة[_\s-]*القديسين|كلمة[_\s-]+الشرك|الشرك/u.test(title)) return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\عبادة المسيح والقديسين';
  if (/المسيح.*(?:يعبد الله|يصلي لله|يصلي إلى الله|عبد الله)|(?:يعبد الله|يصلي لله|يصلي إلى الله).*المسيح|إياه وحده تعبد|وإياه وحده نعبد|إلهي وإلهكم|إلى إلهي|رسول الله وليس|ليس إله|ليس الله|ليس بإله|المسيح.*غير (?:الله|الإله)|(?:غير الله|غير الإله).*المسيح|يسوع.*نبي|المسيح.*نبي|نبي.*المسيح/u.test(title)) return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\المسيح يعبد الله ويصلي له';
  if (/أهم الخلافات.*(?:الأرثوذ|الكاثوليك)|(?:الأرثوذ|الكاثوليك).*الخلافات|الفروق بين.*(?:الأرثوذ|الكاثوليك)|(?:الأرثوذ|الكاثوليك).*الفروق/u.test(title)) return 'تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس';
  if (/نشأة العقيدة|تطور العقيدة|الخلافات الكنسية|مجمع نيقية|الأريوسية|الهرطقة|أثناسيوس|أوريجانوس/u.test(title)) return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\نشأة العقيدة والخلافات الكنسية';
  if (/نشأة العقيدة|تطور العقيدة|الخلافات الكنسية|مجمع نيقية|الأريوسية|الهرطقة|أثناسيوس|أوريجانوس|الأساقفة|تاريخ المسيحية|الطوائف المسيحية|تاريخ الكنيسة|المجامع الكنسية|آباء الكنيسة|البابا|الكنيسة/u.test(title)) return 'تاريخ الكنيسة والمجامع والرهبنة والباباوات والطقوس';
  if (/بارقليط|البراكلي|الفارقليط|المعزي|البشارات والنبوات|نبوءة|نبوة|نبؤة|بشارة.*محمد|محمد.*بشارة/u.test(title)) return 'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\البشارات والنبوات في الكتاب المقدس';
  if (/قانونية الأسفار|مصادر الأناجيل|مصادر الاناجيل|الأناجيل الأبوكريفية|الإنجيل الأبوكريفي|الأبوكريف|الأسفار القانونية|كاتب إنجيل|مؤلف إنجيل|إنجيل يعقوب/u.test(title)) return 'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\مصادر الأناجيل وقانونية الأسفار';
  if (/تناقض|تعارض|اختلاف روايات|اختلاف الأناجيل|اختلاف الاناجيل/u.test(title)) return 'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\تناقضات روايات الأناجيل';
  if (/مخطوط|النص اليوناني|النقد النصي|الترجمة|ترجمات|النساخ|السرياني|اللاتيني|السبعينية/u.test(title)) return 'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\المخطوطات والترجمات والنقد النصي';
  if (/تحريف|إضافات|اضافات|حذف|زيادة|إقحام|اقحام|تغيير النص/u.test(title)) return 'تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل\\التحريف والإضافات والحذف';
  if (/بارقليط|فاران|نبوء|نبؤ|بشارة|أشعياء|إشعياء|مزمور|العهد القديم|التوراة|سفر التكوين|المسيا ابن داود|الأنبياء/u.test(title)) return 'دراسات وبشارات العهد القديم ونبوءات النبي محمد ﷺ';
  if (/صلب|الصليب|الفداء|القيامة|قبر المسيح/u.test(title)) return 'قضية الصلب والفداء والقيامة والصلب المزعوم';
  if (/اعتراف|شهادة عالم|عالم مسيحي|عالم لاهوت|باحث مسيحي/u.test(title)) return 'شهادات واعترافات علماء وباحثي اللاهوت الغربيين';
  if (/بولس|رسائل بولس|رسالة بولس|العهد الجديد|إنجيل|الإنجيل|الأناجيل|(?:متى|مرقس|لوقا|يوحنا)\s*[_:\-]?\s*\d/u.test(title)) return 'دراسات العهد الجديد ورسائل بولس ونقد تلاميذه';
  if (/الثالوث|ثالوث|الأقانيم|أقنوم/u.test(title)) return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\الثالوث والأقانيم';
  if (/التجسد|الناسوت|طبيعة المسيح|جسد المسيح/u.test(title)) return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\التجسد والطبيعة البشرية للمسيح';
  if (/ألوهية المسيح|ألوهية|إله المسيح|الألف والياء|الذي رآني|أنا والآب|الابن.*والآب/u.test(title)) return 'ألوهية المسيح وعقيدة الثالوث ونقد التجسد\\نصوص الاستدلال بألوهية المسيح';
  if (currentChild) return currentPath;
  if (/(?:^|[\\/])الأرشيف المحلي(?:[\\/]|$)/u.test(currentPath)) return currentPath;
  return existingRoots.has(currentPath.split(/[\\/]/)[0]) ? currentPath.split(/[\\/]/)[0] : 'مناظرات وردود عامة على الشبهات المسيحية';
}

export function reorganizeChristianArchive(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS document_aliases (
    alias_id INTEGER PRIMARY KEY,
    document_id INTEGER NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
  )`);
  return db.transaction(() => {
    const docs = db.prepare("SELECT * FROM documents WHERE sect='نصارى' ORDER BY id").all();
    const groups = new Map();
    for (const doc of docs) {
      const match = doc.filename.match(imageSuffix);
      const title = match ? doc.filename.replace(imageSuffix, '') : doc.filename;
      const categoryBoundary = /(?:^|[\\/])الأرشيف المحلي(?:[\\/]|$)/u.test(doc.folder_path) ? doc.folder_path : doc.folder_path.split(/[\\/]/)[0];
      const key = JSON.stringify([doc.book_source || '', title, categoryBoundary, match ? '' : doc.id]);
      if (!groups.has(key)) groups.set(key, { title, docs: [] });
      groups.get(key).docs.push(doc);
    }
    const childPaths = new Map(assignedChildFolders.map(folderPath => [folderPath, folderPath]));
    const mergeDocs = db.prepare(`UPDATE documents SET filename=?,folder_name=?,folder_path=?,images_json=?,image_count=?,file_size=?,ocr_text=?,ocr_status=?,category=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`);
    const alias = db.prepare('INSERT OR REPLACE INTO document_aliases(alias_id,document_id) VALUES(?,?)');
    const boxes = db.prepare('UPDATE ocr_boxes SET document_id=? WHERE document_id=?');
    const tagMerge = db.prepare('INSERT OR IGNORE INTO document_tags(document_id,tag,is_manual,created_at) SELECT ?,tag,is_manual,created_at FROM document_tags WHERE document_id=?');
    const favoriteMerge = db.prepare(`INSERT OR IGNORE INTO favorites(document_id,notes,display_order,created_at)
      SELECT ?,notes,display_order,created_at FROM favorites WHERE document_id=?`);
    const folderLinks = db.prepare(`INSERT OR IGNORE INTO document_folders(document_id,folder_id,folder_path,created_at)
      SELECT ?,folder_id,folder_path,created_at FROM document_folders WHERE document_id=?`);
    const removeAliases = db.prepare('DELETE FROM document_folders WHERE document_id=?');
    const removeDoc = db.prepare('DELETE FROM documents WHERE id=?');
    const targetFolder = db.prepare('SELECT id FROM folders WHERE path=? AND sect=\'نصارى\'');
    const priorChildPaths = new Map(db.prepare('SELECT df.document_id,f.path FROM document_folders df JOIN folders f ON f.id=df.folder_id WHERE f.sect=\'نصارى\' AND f.parent_path IS NOT NULL ORDER BY f.id').all().map(row=>[row.document_id,row.path]));
    const generatedChildPaths = [...assignedChildFolders,
      ['ألوهية المسيح وعقيدة الثالوث ونقد التجسد', 'موضوعات أخرى تحتاج مراجعة'].join('\\'),
      ['تحريف الكتاب المقدس والنقد النصي وتناقضات الأناجيل', 'موضوعات أخرى تحتاج مراجعة'].join('\\')];
    const deleteGeneratedLinks = db.prepare(`DELETE FROM document_folders WHERE folder_id IN (SELECT id FROM folders WHERE path IN (${generatedChildPaths.map(()=>'?').join(',')}))`);
    deleteGeneratedLinks.run(...generatedChildPaths);
    const addFolderLink = db.prepare('INSERT OR IGNORE INTO document_folders(document_id,folder_id,folder_path) VALUES(?,?,?)');
    const groupsWithImages = [];
    let merged = 0;
    for (const group of groups.values()) {
      const rows = group.docs;
      const numbered = rows.filter(row => imageSuffix.test(row.filename));
      const suffixes = numbered.map(row => Number(row.filename.match(imageSuffix)[1]));
      const isAlbum = rows.length > 1 && numbered.length === rows.length && new Set(suffixes).size === rows.length && rows.every(row => imageExtension.test(row.relative_path));
      const canonical = rows[0];
      const imageRows = isAlbum ? rows.slice().sort((a,b) => Number(a.filename.match(imageSuffix)[1])-Number(b.filename.match(imageSuffix)[1])) : [canonical];
      const linkedChild = priorChildPaths.get(canonical.id);
      const destinationPath = destination(group.title, linkedChild && childPaths.has(linkedChild) ? linkedChild : canonical.folder_path, childPaths);
      const paths = imageRows.map(row => row.relative_path);
      const displayTitle = group.title.replace(/\.[^.]+$/, '');
      if (isAlbum) {
        const ocr = rows.slice().sort((a,b) => (b.ocr_text||'').length-(a.ocr_text||'').length)[0];
        const status = rows.some(row => row.ocr_status === 'completed') ? 'completed' : canonical.ocr_status;
        mergeDocs.run(displayTitle, destinationPath.split(/[\\/]/).pop(), destinationPath, JSON.stringify(paths), paths.length,
          rows.reduce((sum,row)=>sum+(row.file_size||0),0), ocr.ocr_text||'', status, canonical.category, canonical.id);
        groupsWithImages.push({id:canonical.id,title:group.title,count:paths.length});
      } else if (canonical.folder_path !== destinationPath || canonical.filename !== displayTitle) {
        mergeDocs.run(displayTitle, destinationPath.split(/[\\/]/).pop(), destinationPath,
          canonical.images_json, canonical.image_count, canonical.file_size, canonical.ocr_text, canonical.ocr_status, canonical.category, canonical.id);
      }
      if (!isAlbum) {
        for (const row of rows.slice(1)) {
          const rowLinkedChild = priorChildPaths.get(row.id);
          const rowDestination = destination(group.title, rowLinkedChild && childPaths.has(rowLinkedChild) ? rowLinkedChild : row.folder_path, childPaths);
          if (row.folder_path !== rowDestination || row.filename !== displayTitle) {
            mergeDocs.run(displayTitle, rowDestination.split(/[\\/]/).pop(), rowDestination,
              row.images_json, row.image_count, row.file_size, row.ocr_text, row.ocr_status, row.category, row.id);
          }
          const rowFolder = targetFolder.get(rowDestination);
          if (rowFolder) addFolderLink.run(row.id,rowFolder.id,rowDestination);
        }
      }
      for (const row of (isAlbum ? rows.slice(1) : [])) {
        alias.run(row.id, canonical.id);
        boxes.run(canonical.id,row.id);tagMerge.run(canonical.id,row.id);favoriteMerge.run(canonical.id,row.id);folderLinks.run(canonical.id,row.id);
        removeAliases.run(row.id);removeDoc.run(row.id);merged++;
      }
      const folder = targetFolder.get(destinationPath);
      if (folder) addFolderLink.run(canonical.id,folder.id,destinationPath);
    }
    const deleteReviewFolder = db.prepare("DELETE FROM folders WHERE sect='نصارى' AND path=?");
    for (const reviewPath of generatedChildPaths.slice(-2)) deleteReviewFolder.run(reviewPath);
    db.prepare("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')").run();
    recountArchiveFolders(db);
    const destinations = db.prepare("SELECT folder_path,COUNT(*) AS count FROM documents WHERE sect='نصارى' GROUP BY folder_path ORDER BY count DESC").all();
    return {before:docs.length,after:db.prepare("SELECT COUNT(*) c FROM documents WHERE sect='نصارى'").get().c,merged,albums:groupsWithImages.length,
      imagePages:groupsWithImages.reduce((sum,group)=>sum+group.count,0),destinations,groups:groupsWithImages.slice(0,8)};
  })();
}
