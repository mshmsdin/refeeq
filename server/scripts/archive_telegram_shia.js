import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import { extractDistinctKeywords } from '../utils/arabic_nlp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = 'C:/Users/mshms/Downloads/Telegram Desktop/ChatExport_2026-08-22';
const TARGET_DIR = 'E:/المكتبة الشيعية/الرافضة/وثائق للرد على الشيعة';
const FOLDER_PATH = 'الرد والمناظرة\\وثائق للرد على الشيعة';
const FOLDER_NAME = 'وثائق للرد على الشيعة';

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const htmlContent = fs.readFileSync(path.join(EXPORT_DIR, 'messages.html'), 'utf8');

// Title definitions / mappings based on the Telegram channel posts
const TOPIC_TITLES = {
  1: '01 - وثيقة توثيقية من كتب الشيعة',
  2: '02 - وثيقة في العقيدة الشيعية',
  3: '03 - الشيعة عبيد الإله ونقد الغلو',
  4: '04 - وثيقة في الفقه والعقيدة',
  5: '05 - جواز التمتع بالبكر عند الشيعة واعترافهم بأنها عار',
  6: '06 - ترك المتعة معصية عند أئمة الشيعة',
  7: '07 - الشهادة الثالثة في الأذان من وضع المفوضة لعنهم الله (الصدوق)',
  8: '08 - حديث ما وافق الكتاب خرج مخرج التقية',
  9: '09 - تصريح بصحة السند في كتب الشيعة مع كونه مكذوباً',
  10: '10 - اعتراف البحراني بنقص أحاديث الشيعة وعدم تماميتها',
  11: '11 - حديث ما وافق الكتاب فخذوه مجهول لا يصح عند الشيعة',
  12: '12 - علي لم يكفر أهل حربه والقتال كان على التأويل',
  13: '13 - وثيقة تاريخية وروائية',
  14: '14 - إقرار نعمة الله الجزائري في الأنوار النعمانية',
  15: '15 - نرجس أم المهدي ووقوعها سبية في أيدي النخاسين',
  16: '16 - تواتر روايات تحريف القرآن عند كبار علماء الشيعة',
  17: '17 - كلام ابن تيمية في نقل اتفاق أهل الهيئة والحساب على كروية الأرض',
  18: '18 - صلاة التراويح وأصلها من كتب الشيعة - وثيقة 1',
  19: '19 - صلاة التراويح وأصلها من كتب الشيعة - وثيقة 2',
  20: '20 - جواز الزيادة على 11 ركعة في التراويح من كتب الشيعة',
  21: '21 - بيان مقصود نعمت البدعة في التراويح',
  22: '22 - استدلال علي على صحة إمامته وخلافته بالشورى وبيعة الصحابة (نهج البلاغة)',
  23: '23 - وثيقة روائية وعقائدية من مصادر الشيعة',
  24: '24 - المسجد الأقصى عند الشيعة في السماء وليس في بيت المقدس',
  25: '25 - رواية الأكراد حي من أحياء الجن عند الشيعة (الكافي)',
  26: '26 - رواية الأكراد قوم من الجن من مصادر الشيعة',
  28: '27 - جواز استدبار الكعبة واستقبال القبر في الصلاة عند الشيعة'
};

const msgRegex = /<div class="message ([^"]*)" id="message(\d+)">([\s\S]*?)(?=<div class="message [^"]*" id="message\d+"|<\/div>\s*<\/div>\s*<\/body>)/g;

let match;
const parsedDocs = [];

while ((match = msgRegex.exec(htmlContent)) !== null) {
  const [_, classes, idStr, body] = match;
  const msgId = parseInt(idStr, 10);
  
  const photoM = body.match(/<a class="photo_wrap[^"]*" href="([^"]+)">/);
  if (!photoM) continue; // Only process photo documents

  const srcRelPhoto = photoM[1]; // e.g. photos/photo_1@...jpg
  const srcAbsPhoto = path.join(EXPORT_DIR, srcRelPhoto);
  if (!fs.existsSync(srcAbsPhoto)) continue;

  const textM = body.match(/<div class="text">([\s\S]*?)<\/div>/);
  let caption = textM ? textM[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : '';

  const photoBase = path.basename(srcRelPhoto);
  const destPhotoName = `doc_${String(parsedDocs.length + 1).padStart(2, '0')}_${photoBase}`;
  const destAbsPhoto = path.join(TARGET_DIR, destPhotoName);

  // Copy high-res photo
  fs.copyFileSync(srcAbsPhoto, destAbsPhoto);

  const title = TOPIC_TITLES[msgId] || `${String(parsedDocs.length + 1).padStart(2, '0')} - وثيقة للرد على الشيعة (#${msgId})`;

  parsedDocs.push({
    msgId,
    title,
    destAbsPhoto,
    destRelPath: `وثائق للرد على الشيعة\\${destPhotoName}`,
    caption,
    fileSize: fs.statSync(destAbsPhoto).size
  });
}

console.log(`🖼️ تم نسخ وتجهيز ${parsedDocs.length} وثيقة مصورة للرد على الشيعة.`);

// Insert into Database
const db = getDb();

const insertTransaction = db.transaction(() => {
  // Ensure folder exists
  db.prepare(`
    INSERT OR IGNORE INTO folders (path, name, parent_path, sect, category, file_count)
    VALUES (?, ?, 'الرد والمناظرة', 'شيعة', 'attack', 0)
  `).run(FOLDER_PATH, FOLDER_NAME);

  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents (
      filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, file_size, ocr_status, ocr_text
    ) VALUES (?, ?, ?, ?, ?, 'شيعة', 'attack', 'وثائق للرد على الشيعة (تيليجرام)', ?, 'pending', ?)
  `);

  const insertTag = db.prepare(`INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, ?)`);

  let count = 0;
  for (const doc of parsedDocs) {
    const res = insertDoc.run(
      doc.title,
      doc.destRelPath,
      doc.destAbsPhoto,
      FOLDER_NAME,
      FOLDER_PATH,
      doc.fileSize,
      doc.caption || doc.title
    );
    const docId = res.lastInsertRowid;

    // Tags
    insertTag.run(docId, 'شيعة', 1);
    insertTag.run(docId, 'وثائق', 1);
    insertTag.run(docId, 'رد ومناظرة', 1);
    insertTag.run(docId, 'تيليجرام', 1);

    if (doc.caption) {
      const kws = extractDistinctKeywords(doc.caption, doc.title, 5);
      for (const kw of kws) insertTag.run(docId, kw, 0);
    }

    count++;
  }

  // Update folder counts
  db.prepare(`
    UPDATE folders SET file_count = (
      SELECT COUNT(*) FROM documents WHERE folder_path = folders.path OR folder_path LIKE folders.path || '\\%'
    ) WHERE sect = 'شيعة'
  `).run();

  console.log(`✅ تم حفظ ${count} وثيقة بنجاح في قاعدة البيانات.`);
});

insertTransaction();
db.close();
