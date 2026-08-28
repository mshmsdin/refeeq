import Database from "better-sqlite3";
const db = new Database("./db/library.db");

const SEP = "\\";

// إصلاح جميع مسارات وثائق الإلحاد التي فيها مسار ملتصق بدون فاصل
const allDocs = db.prepare("SELECT id, folder_path, folder_name FROM documents WHERE sect='إلحاد'").all();

const updateStmt = db.prepare("UPDATE documents SET folder_path = ? WHERE id = ?");

const fixTx = db.transaction(() => {
  let fixed = 0;
  for (const doc of allDocs) {
    const fp = doc.folder_path || "";
    // المسارات الصحيحة يجب أن تحتوي على \ 
    // المسارات المكسورة: "بابفرع" بدل "باب\فرع"
    const correctPath = doc.folder_path
      .replace("الدفاع — أدلة الإيمان والثواbtأدلة وجود الله", "الدفاع — أدلة الإيمان والثوابت" + SEP + "أدلة وجود الله")
      // نكتشف المسار بطريقة مختلفة
    
    // الطريقة الصحيحة: بناء المسار من folder_name والـ category
    let correctFP = fp;
    
    if (!fp.includes(SEP)) {
      // المسار ملتصق بدون فاصل
      // نبني المسار الصحيح من خلال الفئة والاسم
      const cat = db.prepare("SELECT category FROM documents WHERE id = ?").get(doc.id)?.category || "";
      if (cat && doc.folder_name) {
        correctFP = cat + SEP + doc.folder_name;
      }
    }
    
    if (correctFP !== fp) {
      updateStmt.run(correctFP, doc.id);
      fixed++;
    }
  }
  return fixed;
});

const fixed = fixTx();
console.log("✅ مسارات مصلحة:", fixed);

// تحديث أعداد المجلدات
db.prepare("UPDATE folders SET file_count = 0 WHERE sect='إلحاد'").run();
const folderCounts = db.prepare("SELECT folder_path, COUNT(*) as c FROM documents WHERE sect='إلحاد' GROUP BY folder_path").all();
console.log("مجموعات المجلدات:", folderCounts.length);
folderCounts.forEach(r => console.log(" path:", JSON.stringify(r.folder_path), "count:", r.c));

for (const row of folderCounts) {
  db.prepare("UPDATE folders SET file_count = file_count + ? WHERE path = ?").run(row.c, row.folder_path);
  if (row.folder_path.includes(SEP)) {
    const parentPath = row.folder_path.substring(0, row.folder_path.lastIndexOf(SEP));
    db.prepare("UPDATE folders SET file_count = file_count + ? WHERE path = ?").run(row.c, parentPath);
  }
}

const folders = db.prepare("SELECT name, file_count FROM folders WHERE sect='إلحاد' ORDER BY path").all();
console.log("\n📊 النتيجة:");
folders.forEach(f => console.log("📁 " + f.name + " (" + f.file_count + ")"));

db.close();
