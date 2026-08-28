import Database from "better-sqlite3";
const db = new Database("./db/library.db");

// تحديث الأفكار الضالة -> باب الهجوم
const r = db.prepare(`
  UPDATE documents SET 
    folder_name='الأيديولوجيات الضالة المعاصرة',
    folder_path='الهجوم — فضائح الإلحاد ونقد منظريه\الأيديولوجيات الضالة المعاصرة',
    category='الهجوم — فضائح الإلحاد ونقد منظريه'
  WHERE sect='إلحاد' AND (
    filename LIKE '%تنوير%' OR filename LIKE '%نسو%' OR filename LIKE '%مثلية%' 
    OR filename LIKE '%الجذب%' OR filename LIKE '%طاقة%' OR filename LIKE '%نباتية%'
    OR filename LIKE '%مرأة بين الإسلام%'
  )
`).run();
console.log("✅ وثائق الأيديولوجيات:", r.changes);

// إعادة حساب الأعداد
const counts = db.prepare("SELECT folder_path, COUNT(*) as c FROM documents WHERE sect='إلحاد' GROUP BY folder_path").all();
db.prepare("UPDATE folders SET file_count = 0 WHERE sect='إلحاد'").run();
for (const row of counts) {
  db.prepare("UPDATE folders SET file_count = ? WHERE path = ?").run(row.c, row.folder_path);
  const parts = row.folder_path.split("\\");
  if (parts.length > 1) {
    const parent = parts.slice(0,-1).join("\\");
    const parentCount = db.prepare("SELECT SUM(file_count) as total FROM folders WHERE parent_path = ?").get(parent);
    db.prepare("UPDATE folders SET file_count = ? WHERE path = ?").run(parentCount?.total || row.c, parent);
  }
}

// تقرير
console.log("\n📊 الهيكل النهائي:");
const folders = db.prepare("SELECT name, path, file_count FROM folders WHERE sect='إلحاد' ORDER BY path").all();
folders.forEach(f => {
  const indent = f.path.includes("\\") ? "   " : "";
  console.log(indent + "📁 " + f.name + " (" + f.file_count + ")");
});

db.close();
