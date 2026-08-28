import Database from "better-sqlite3";
const db = new Database("./db/library.db");

console.log("🔄 تطبيق إعادة التصنيف في قاعدة البيانات...");

// دالة التصنيف
function classifyDoc(doc) {
  const fp = doc.folder_path || "";
  const fn = doc.filename || "";

  if (/دليل|وجود الله|وجود الخالق|الإيجاد|دليل الفطرة|دليل الكون|دليل التصميم|كيف نعرف الله|القواعد العقلية|الإيمان بالله/.test(fn)) return ["الدفاع — أدلة الإيمان والثوابت", "أدلة وجود الله"];
  if (/الجزء الأول|أدلة وجود/.test(fp)) return ["الدفاع — أدلة الإيمان والثوابت", "أدلة وجود الله"];
  if (/رسول|النبي|بشارة|إعجاز|قرآن|توحيد|ظهر الدين|الإخبار|المغيبات|معجزة|صحة الإسلام|السنة النبوية|سابقين/.test(fn)) return ["الدفاع — أدلة الإيمان والثوابت", "صحة الإسلام وأدلة نبوة النبي"];
  if (/رسول الأميين|الإعجاز العلمي|أعظم برهان|الإخبار|كيف ظهر|بصائر صحة|الجزء الثاني/.test(fp)) return ["الدفاع — أدلة الإيمان والثوابت", "صحة الإسلام وأدلة نبوة النبي"];
  if (/وسواس|شبهة|منهج|استدلال|يقين|لماذا أنا مسلم|منكرو السنة|علاج الوسواس|الفرق بين|هل يكفي الإيمان/.test(fn)) return ["الدفاع — أدلة الإيمان والثوابت", "أصول الاستدلال ومنهج الشبهات"];
  if (/الوسواس القهري|يقينية الإيمان|الإسلام والإلحاد وجهاً لوجه|تفكيك الشبهة/.test(fp)) return ["الدفاع — أدلة الإيمان والثوابت", "أصول الاستدلال ومنهج الشبهات"];
  if (/أخلاق|قيم|تحريم|يُحرّم|الإرادة الحرة|مسؤولية|عقوبة|جريمة|أيهما أكرم|قوامة|تعدد الزوجات|المثلية|مثلية|الحب والكراهية|المرأة عورة|المرأة بين/.test(fn)) return ["الإلزام — تناقضات الإلحاد وإفحام الملحد", "تناقضات الإلحاد الأخلاقية"];
  if (/أفكار ضالة|الفصل الثاني.*مرأة|الفصل الرابع.*مثلية/.test(fp)) return ["الإلزام — تناقضات الإلحاد وإفحام الملحد", "تناقضات الإلحاد الأخلاقية"];
  if (/تطور|داروين|صدفة|العلموية|بيلتداون|نبراسكا|هايكل|أجنة|فراشة|التزوير|خطأ في نظرية|حفريات|الهومو/.test(fn)) return ["الإلزام — تناقضات الإلحاد وإفحام الملحد", "تناقضات الإلحاد العلمية والفلسفية"];
  if (/تنوير|نسوية|قانون الجذب|طاقة|نباتية|أفكار ضالة|الفصل الأول.*تنوير|الفصل الثالث.*نسو|الفصل الخامس/.test(fn)) return ["الهجوم — فضائح الإلحاد ونقد منظريه", "الأيديولوجيات الضالة المعاصرة"];
  if (/أفكار ضالة/.test(fp)) return ["الهجوم — فضائح الإلحاد ونقد منظريه", "الأيديولوجيات الضالة المعاصرة"];
  if (/الجزء الثالث|الرد على أشهر شبهات/.test(fp)) return ["الإلزام — تناقضات الإلحاد وإفحام الملحد", "إلزام الملحد بلوازم مذهبه"];
  if (/الجزء الأول/.test(fp)) return ["الدفاع — أدلة الإيمان والثوابت", "أدلة وجود الله"];
  if (/الجزء الثاني/.test(fp)) return ["الدفاع — أدلة الإيمان والثوابت", "صحة الإسلام وأدلة نبوة النبي"];
  return ["الدفاع — أدلة الإيمان والثوابت", "أصول الاستدلال ومنهج الشبهات"];
}

const allDocs = db.prepare("SELECT id, filename, folder_path, folder_name, book_source FROM documents WHERE sect='" + "إلحاد'" + " ORDER BY id").all();

// ─── حذف المجلدات القديمة للإلحاد ───────────────────────────────────────
db.prepare("DELETE FROM folders WHERE sect='إلحاد'").run();
console.log("🗑️ تم حذف المجلدات القديمة");

// ─── إنشاء المجلدات الجديدة ──────────────────────────────────────────────
const mainDoors = [
  "الدفاع — أدلة الإيمان والثوابت",
  "الإلزام — تناقضات الإلحاد وإفحام الملحد",
  "الهجوم — فضائح الإلحاد ونقد منظريه"
];

const subDoors = {
  "الدفاع — أدلة الإيمان والثوابت": ["أدلة وجود الله", "صحة الإسلام وأدلة نبوة النبي", "أصول الاستدلال ومنهج الشبهات"],
  "الإلزام — تناقضات الإلحاد وإفحام الملحد": ["تناقضات الإلحاد الأخلاقية", "تناقضات الإلحاد العلمية والفلسفية", "إلزام الملحد بلوازم مذهبه"],
  "الهجوم — فضائح الإلحاد ونقد منظريه": ["فضائح رموز الإلحاد الجديد", "تزوير الأدلة التطورية", "الأيديولوجيات الضالة المعاصرة"]
};

const insertFolder = db.prepare(`
  INSERT INTO folders (name, path, parent_path, sect, category, file_count, created_at)
  VALUES (?, ?, ?, 'إلحاد', ?, 0, datetime('now'))
`);

const folderIds = {};
for (const main of mainDoors) {
  const result = insertFolder.run(main, main, null, 'إلحاد');
  folderIds[main] = result.lastInsertRowid;
  for (const sub of subDoors[main]) {
    const subPath = main + "\\" + sub;
    const r2 = insertFolder.run(sub, subPath, main, 'إلحاد');
    folderIds[subPath] = r2.lastInsertRowid;
  }
}
console.log("📁 تم إنشاء", Object.keys(folderIds).length, "مجلداً جديداً");

// ─── تحديث وثائق الإلحاد بالمجلدات الجديدة ──────────────────────────────
const updateDoc = db.prepare(`
  UPDATE documents SET
    folder_name = ?, folder_path = ?, category = ?
  WHERE id = ?
`);

const updateTx = db.transaction(() => {
  let updated = 0;
  for (const doc of allDocs) {
    const [main, sub] = classifyDoc(doc);
    const newFolderPath = main + "\\" + sub;
    updateDoc.run(sub, newFolderPath, main, doc.id);
    updated++;
  }
  return updated;
});

const updated = updateTx();
console.log("✏️ تم تحديث", updated, "وثيقة");

// ─── تحديث أعداد المجلدات ─────────────────────────────────────────────────
const directCounts = db.prepare("SELECT folder_path, COUNT(*) as c FROM documents WHERE sect='إلحاد' GROUP BY folder_path").all();
for (const row of directCounts) {
  db.prepare("UPDATE folders SET file_count = ? WHERE path = ?").run(row.c, row.folder_path);
  // تحديث الأب
  const parts = row.folder_path.split("\\");
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join("\\");
    db.prepare("UPDATE folders SET file_count = file_count + ? WHERE path = ?").run(row.c, parentPath);
  }
}

// ─── تقرير نهائي ─────────────────────────────────────────────────────────
console.log("\n📊 التقرير النهائي:");
const finalFolders = db.prepare("SELECT name, path, file_count FROM folders WHERE sect='إلحاد' ORDER BY path").all();
finalFolders.forEach(f => {
  const indent = f.path.includes("\\") ? "   " : "";
  console.log(indent + "📁", f.name, "(" + f.file_count + ")");
});

db.close();
console.log("\n✅ تمت إعادة التصنيف بنجاح!");
