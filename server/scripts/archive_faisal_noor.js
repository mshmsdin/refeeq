/**
 * Master Archiving Script for Faisal Noor Telegram Documents
 * Imports 3,370+ documents into 8 Logical Thematic Doors under Shia sect
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import { extractDistinctKeywords } from '../utils/arabic_nlp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = 'C:/Users/mshms/Downloads/Telegram Desktop/ChatExport_2026-08-22 (1)';
const TARGET_STORAGE = path.join(__dirname, '..', 'storage', 'shia', 'faisal_noor');

if (!fs.existsSync(TARGET_STORAGE)) {
  fs.mkdirSync(TARGET_STORAGE, { recursive: true });
}

// ══════════════════════════════════════════════════════════
// 8 LOGICAL DOORS MAPPING & CLASSIFIER
// ══════════════════════════════════════════════════════════
const DOORS = {
  QURAN: '01 - باب القرآن الكريم ومسألة التحريف',
  AHLULBAYT: '02 - باب أمهات المؤمنين وبنات النبي وآل البيت',
  SAHABA: '03 - باب الصحابة والخلفاء الراشدين والفتنة',
  IMAMATE: '04 - باب الإمامة والعصمة والغلو والولاية',
  MAHDI: '05 - باب الإمام المهدي والغيبة والسرداب',
  FIQH: '06 - باب الفقه والعقائد الخاصة والشعائر',
  SCHOLARS: '07 - باب مراجع وعلماء وكتب الشيعة ونقد الروايات',
  HISTORY: '08 - باب التاريخ والمواقف والوثائق المعاصرة'
};

const ROOT_FOLDER = 'وثائق فيصل نور في الرد على الشيعة';

function classifyTopic(text, topic) {
  const combined = `${text} ${topic}`.toLowerCase();

  // 1. Quran & Tahreef
  if (
    combined.includes('قرآن') || combined.includes('القران') || combined.includes('مصحف') ||
    combined.includes('تحريف') || combined.includes('فصل الخطاب') || combined.includes('الناسخ والمنسوخ') ||
    combined.includes('تفسير القمي') || combined.includes('تفسير العياشي') || combined.includes('تفسير البرهان') ||
    combined.includes('تفسير الصافي') || combined.includes('آيات') || combined.includes('آية') ||
    combined.includes('نقصان القرآن') || combined.includes('جمع القرآن')
  ) {
    return DOORS.QURAN;
  }

  // 2. Mothers of Believers & Daughters of Prophet
  if (
    combined.includes('عائشة') || combined.includes('حفصة') || combined.includes('أم المؤمنين') ||
    combined.includes('أمهات المؤمنين') || combined.includes('فاطمة') || combined.includes('الزهراء') ||
    combined.includes('رقية') || combined.includes('أم كلثوم') || combined.includes('بنات النبي') ||
    combined.includes('الإفك') || combined.includes('زوجات الأنبياء') || combined.includes('زينب') ||
    combined.includes('خديجة') || combined.includes('أصحاب الكساء') || combined.includes('اهل البيت') ||
    combined.includes('أهل البيت') || combined.includes('آل البيت')
  ) {
    return DOORS.AHLULBAYT;
  }

  // 3. Companions & Caliphs
  if (
    combined.includes('أبو بكر') || combined.includes('ابو بكر') || combined.includes('الصديق') ||
    combined.includes('عمر بن الخطاب') || combined.includes('الفاروق') || combined.includes('عثمان') ||
    combined.includes('الصحابة') || combined.includes('الشورى') || combined.includes('بيعة') ||
    combined.includes('الجمل') || combined.includes('صفين') || combined.includes('معاوية') ||
    combined.includes('عمرو بن العاص') || combined.includes('أبو هريرة') || combined.includes('خالد بن الوليد') ||
    combined.includes('المهاجرين') || combined.includes('الأنصار') || combined.includes('السقيفة') ||
    combined.includes('نهج البلاغة') || combined.includes('رزية الخميس') || combined.includes('الفتنة')
  ) {
    return DOORS.SAHABA;
  }

  // 4. Mahdi & Occultation
  if (
    combined.includes('مهدي') || combined.includes('المهدي') || combined.includes('الغيبة') ||
    combined.includes('السرداب') || combined.includes('نرجس') || combined.includes('صاحب الزمان') ||
    combined.includes('القائم') || combined.includes('السفراء') || combined.includes('كمال الدين') ||
    combined.includes('علامات الظهور') || combined.includes('العسكري')
  ) {
    return DOORS.MAHDI;
  }

  // 5. Imamate, Infallibility & Extremism
  if (
    combined.includes('إمامة') || combined.includes('الامامة') || combined.includes('عصمة') ||
    combined.includes('العصمة') || combined.includes('غلو') || combined.includes('الغلو') ||
    combined.includes('المولى') || combined.includes('الولاية') || combined.includes('غدير') ||
    combined.includes('النص') || combined.includes('أئمة') || combined.includes('الأئمة') ||
    combined.includes('الربوبية') || combined.includes('الألوهية') || combined.includes('التفويض') ||
    combined.includes('المفوضة') || combined.includes('وزيرا') || combined.includes('أميرا')
  ) {
    return DOORS.IMAMATE;
  }

  // 6. Fiqh & Special Doctrines
  if (
    combined.includes('متعة') || combined.includes('المتعة') || combined.includes('تقية') ||
    combined.includes('التقية') || combined.includes('رجعة') || combined.includes('الرجعة') ||
    combined.includes('بداء') || combined.includes('البداء') || combined.includes('خمس') ||
    combined.includes('الخمس') || combined.includes('لطم') || combined.includes('تطبير') ||
    combined.includes('شعائر') || combined.includes('عاشوراء') || combined.includes('الحسينية') ||
    combined.includes('تراويح') || combined.includes('التراويح') || combined.includes('أذان') ||
    combined.includes('الأذان') || combined.includes('تربة') || combined.includes('سجود') ||
    combined.includes('القبلة') || combined.includes('استدبار') || combined.includes('البدعة')
  ) {
    return DOORS.FIQH;
  }

  // 7. Shia Books & Scholars
  if (
    combined.includes('الكافي') || combined.includes('الكليني') || combined.includes('المجلسي') ||
    combined.includes('بحار الأنوار') || combined.includes('الصدوق') || combined.includes('الطوسي') ||
    combined.includes('المفيد') || combined.includes('سليم بن قيس') || combined.includes('الجزائري') ||
    combined.includes('الأنوار النعمانية') || combined.includes('البحراني') || combined.includes('الكاشاني') ||
    combined.includes('الخوئي') || combined.includes('السيستاني') || combined.includes('القمي') ||
    combined.includes('الطبرسي') || combined.includes('رجال') || combined.includes('سند') ||
    combined.includes('التصحيح والتضعيف') || combined.includes('معمم') || combined.includes('علماء الشيعة')
  ) {
    return DOORS.SCHOLARS;
  }

  // 8. History & Politics
  return DOORS.HISTORY;
}

// ══════════════════════════════════════════════════════════
// PARSE ALL HTML EXPORT FILES
// ══════════════════════════════════════════════════════════
console.log('📖 قراءة وفهرسة ملفات تصدير تيليجرام: وثائق فيصل نور...');

const htmlFiles = ['messages.html', 'messages2.html', 'messages3.html', 'messages4.html'];
const parsedItems = [];
let currentTopic = 'وثائق عامة في الرد على الشيعة';
let topicSeq = {};

for (const hf of htmlFiles) {
  const filePath = path.join(EXPORT_DIR, hf);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const msgRegex = /<div class="message ([^"]*)" id="message(\d+)">([\s\S]*?)(?=<div class="message [^"]*" id="message\d+"|<\/div>\s*<\/div>\s*<\/body>)/g;

  let match;
  while ((match = msgRegex.exec(content)) !== null) {
    const [_, classes, idStr, body] = match;
    const msgId = parseInt(idStr, 10);

    const photoM = body.match(/<a class="photo_wrap[^"]*" href="([^"]+)">/);
    const photoHref = photoM ? photoM[1] : null;

    const videoM = body.match(/<a class="video_file[^"]*" href="([^"]+)">/);
    const videoHref = videoM ? videoM[1] : null;

    const textM = body.match(/<div class="text">([\s\S]*?)<\/div>/);
    let text = textM ? textM[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : '';

    if (!photoHref && !videoHref && text.length === 0) continue;

    // Update active topic if new title arrives
    if (text.length > 0 && text.length < 180 && !text.startsWith('http') && !text.includes('youtu.be')) {
      const firstLine = text.split('\n')[0].replace(/&quot;/g, '"').replace(/[0-9]+$/, '').trim();
      if (firstLine.length > 3) {
        currentTopic = firstLine;
      }
    }

    if (photoHref || videoHref || text.length > 50) {
      // Determine door
      const door = classifyTopic(text, currentTopic);

      // Track sequence for title
      topicSeq[currentTopic] = (topicSeq[currentTopic] || 0) + 1;
      const seq = topicSeq[currentTopic];

      let cleanTopic = currentTopic.replace(/[\/\\:*?"<>|]/g, ' ').trim();
      if (cleanTopic.length > 90) cleanTopic = cleanTopic.substring(0, 90) + '...';

      const docTitle = `${cleanTopic} - وثيقة (${seq})`;

      parsedItems.push({
        msgId,
        sourceRelMedia: photoHref || videoHref,
        isVideo: Boolean(videoHref),
        docTitle,
        caption: text || currentTopic,
        door
      });
    }
  }
}

console.log(`✅ تم استخراج وتصنيف ${parsedItems.length} وثيقة ومرئية في الأبواب الثمانية.`);

// ══════════════════════════════════════════════════════════
// COPY MEDIA & PERSIST IN DATABASE
// ══════════════════════════════════════════════════════════
const db = getDb();

// 1. Delete previous entries if any
console.log('🗑️ تهيئة وتحديث مجلدات وثائق فيصل نور...');
db.prepare("DELETE FROM ocr_boxes WHERE document_id IN (SELECT id FROM documents WHERE book_source LIKE '%فيصل نور%')").run();
db.prepare("DELETE FROM document_tags WHERE document_id IN (SELECT id FROM documents WHERE book_source LIKE '%فيصل نور%')").run();
db.prepare("DELETE FROM documents WHERE book_source LIKE '%فيصل نور%'").run();
db.prepare("DELETE FROM folders WHERE path LIKE 'وثائق فيصل نور%'").run();

// 2. Insert Root Folder & 8 Sub-doors
db.prepare(`
  INSERT OR REPLACE INTO folders (path, name, parent_path, sect, category, file_count)
  VALUES (?, ?, null, 'شيعة', 'attack', 0)
`).run(ROOT_FOLDER, ROOT_FOLDER);

const doorPaths = {};
for (const doorName of Object.values(DOORS)) {
  const fullDoorPath = `${ROOT_FOLDER}\\${doorName}`;
  doorPaths[doorName] = fullDoorPath;
  db.prepare(`
    INSERT OR REPLACE INTO folders (path, name, parent_path, sect, category, file_count)
    VALUES (?, ?, ?, 'شيعة', 'attack', 0)
  `).run(fullDoorPath, doorName, ROOT_FOLDER);
}

// 3. Batch Insert Documents
const insertDoc = db.prepare(`
  INSERT OR REPLACE INTO documents (
    filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, file_size, ocr_status, ocr_text
  ) VALUES (?, ?, ?, ?, ?, 'شيعة', 'attack', 'وثائق فيصل نور في الرد على الشيعة', ?, 'completed', ?)
`);

const insertBox = db.prepare(`INSERT INTO ocr_boxes (document_id, line_index, text, box_json, confidence) VALUES (?, ?, ?, '[]', 100)`);
const insertTag = db.prepare(`INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, ?)`);

console.log('💾 جاري نسخ الملفات وحفظ الوثائق في الأبواب الموضوعية...');

let copiedCount = 0;
let totalSaved = 0;

const runInsertBatch = db.transaction(() => {
  for (let idx = 0; idx < parsedItems.length; idx++) {
    const item = parsedItems[idx];
    let destAbsMedia = '';
    let fileSize = item.caption.length;

    if (item.sourceRelMedia) {
      const srcAbs = path.join(EXPORT_DIR, item.sourceRelMedia);
      if (fs.existsSync(srcAbs)) {
        const ext = path.extname(item.sourceRelMedia);
        const fileName = `doc_${String(idx + 1).padStart(4, '0')}_msg${item.msgId}${ext}`;
        destAbsMedia = path.join(TARGET_STORAGE, fileName);

        if (!fs.existsSync(destAbsMedia)) {
          fs.copyFileSync(srcAbs, destAbsMedia);
          copiedCount++;
        }
        fileSize = fs.statSync(destAbsMedia).size;
      }
    }

    const folderPath = doorPaths[item.door];
    const relPath = `faisal_noor/${path.basename(destAbsMedia || 'text_doc')}`;

    const res = insertDoc.run(
      item.docTitle,
      relPath,
      destAbsMedia,
      item.door,
      folderPath,
      fileSize,
      item.caption
    );
    const docId = res.lastInsertRowid;

    // Line OCR Box
    insertBox.run(docId, 0, item.caption);

    // Tags
    insertTag.run(docId, 'شيعة', 1);
    insertTag.run(docId, 'فيصل نور', 1);
    insertTag.run(docId, 'وثائق', 1);
    insertTag.run(docId, item.door.replace(/^\d+\s*-\s*/, '').trim(), 1);

    const kws = extractDistinctKeywords(item.caption, item.docTitle, 5);
    for (const kw of kws) insertTag.run(docId, kw, 0);

    totalSaved++;
    if (totalSaved % 500 === 0) {
      console.log(`  - تم حفظ ${totalSaved} / ${parsedItems.length} وثيقة...`);
    }
  }

  // Update folder counts
  db.prepare(`
    UPDATE folders SET file_count = (
      SELECT COUNT(*) FROM documents WHERE folder_path = folders.path OR folder_path LIKE folders.path || '\\%'
    ) WHERE sect = 'شيعة'
  `).run();
});

runInsertBatch();

console.log('\n══════════════════════════════════════════════════════');
console.log(`🎉 تمت أرشفة وثائق فيصل نور بنجاح!`);
console.log(`- إجمالي الوثائق المحفوظة: ${totalSaved}`);
console.log(`- الملفات المنسوخة: ${copiedCount}`);
console.log('══════════════════════════════════════════════════════');

// Display statistics per door
const doorStats = db.prepare(`
  SELECT folder_name, COUNT(*) as count
  FROM documents
  WHERE book_source LIKE '%فيصل نور%'
  GROUP BY folder_name
  ORDER BY folder_name
`).all();

console.log('\n📊 إحصائيات الأبواب الثمانية:');
doorStats.forEach(d => console.log(`  📁 ${d.folder_name}: ${d.count} وثيقة`));

db.close();
