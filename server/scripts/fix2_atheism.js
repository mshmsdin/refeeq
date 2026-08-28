import Database from "better-sqlite3";
const db = new Database("./db/library.db");

// فحص الأفكار الضالة - ما الذي انتقل؟
const ideology = db.prepare("SELECT id, filename, folder_path FROM documents WHERE sect='إلحاد' AND folder_path LIKE '%الهجوم%'").all();
console.log("وثائق الهجوم:", ideology.length);
ideology.forEach(d => console.log(" -", d.filename, "|", d.folder_path));

// فحص مجموع الإلزام + الدفاع + الهجوم
const total = db.prepare("SELECT COUNT(*) as c FROM documents WHERE sect='إلحاد'").get();
console.log("\nإجمالي وثائق الإلحاد:", total.c);

// إصلاح العدد في مجلد الهجوم الرئيسي
const subCounts = db.prepare("SELECT SUM(file_count) as total FROM folders WHERE sect='إلحاد' AND parent_path='الهجوم — فضائح الإلحاد ونقد منظريه'").get();
db.prepare("UPDATE folders SET file_count = ? WHERE path = 'الهجوم — فضائح الإلحاد ونقد منظريه'").run(subCounts.total || 0);

// الآن لنرى المجلد الرئيسي للأيديولوجيات
const check = db.prepare("SELECT * FROM folders WHERE sect='إلحاد' AND name LIKE '%الأيديولوجيات%'").get();
console.log("\nمجلد الأيديولوجيات:", check);

// تحديث file_count للمجلدات الفرعية من الوثائق المنقولة
const folderCounts = db.prepare("SELECT folder_path, COUNT(*) as c FROM documents WHERE sect='إلحاد' GROUP BY folder_path").all();
db.prepare("UPDATE folders SET file_count = 0 WHERE sect='إلحاد'").run();
const updateStmt = db.prepare("UPDATE folders SET file_count = file_count + ? WHERE path = ?");
const updateParent = db.prepare("UPDATE folders SET file_count = file_count + ? WHERE path = ?");
for (const row of folderCounts) {
  updateStmt.run(row.c, row.folder_path);
  const parent = row.folder_path.includes("\\") ? row.folder_path.split("\\").slice(0,-1).join("\\") : null;
  if (parent) updateParent.run(row.c, parent);
}

const folders2 = db.prepare("SELECT name, path, file_count FROM folders WHERE sect='إلحاد' ORDER BY path").all();
console.log("\n📊 بعد الإصلاح:");
folders2.forEach(f => {
  const indent = f.path.includes("\\") ? "   " : "";
  console.log(indent + "📁 " + f.name + " (" + f.file_count + ")");
});

db.close();
