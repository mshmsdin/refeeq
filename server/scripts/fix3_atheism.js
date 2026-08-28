import Database from "better-sqlite3";
const db = new Database("./db/library.db");

// فحص المسار الفعلي في الوثائق
const sample = db.prepare("SELECT folder_path FROM documents WHERE sect='إلحاد' AND folder_name='الأيديولوجيات الضالة المعاصرة' LIMIT 1").get();
if (sample) {
  const fp = sample.folder_path;
  console.log("المسار الفعلي:", JSON.stringify(fp));
  
  // تحديث عدد هذا المجلد في جدول folders
  const docCount = db.prepare("SELECT COUNT(*) as c FROM documents WHERE folder_name='الأيديولوجيات الضالة المعاصرة' AND sect='إلحاد'").get();
  console.log("عدد الوثائق:", docCount.c);
  
  // تحديث المجلد بنفس المسار الفعلي من الوثائق
  const updated = db.prepare("UPDATE folders SET file_count = ? WHERE path = ?").run(docCount.c, fp);
  console.log("المجلدات المحدثة:", updated.changes);
  
  // تحديث الأب
  const parentPath = fp.substring(0, fp.lastIndexOf("\\"));
  const allSubCounts = db.prepare("SELECT SUM(file_count) as total FROM folders WHERE parent_path = ?").get(parentPath);
  console.log("مسار الأب:", JSON.stringify(parentPath), "الإجمالي:", allSubCounts?.total);
  db.prepare("UPDATE folders SET file_count = ? WHERE path = ?").run(allSubCounts?.total || 0, parentPath);
} else {
  console.log("لا توجد وثائق في مجلد الأيديولوجيات");
}

// عرض النهائي
const folders = db.prepare("SELECT name, file_count, path FROM folders WHERE sect='إلحاد' ORDER BY path").all();
console.log("\n📊 النتيجة:");
folders.forEach(f => {
  const indent = f.path.includes("\\") ? "   " : "";
  console.log(indent + "📁 " + f.name + " (" + f.file_count + ")");
});

db.close();
