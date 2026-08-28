/**
 * Archiving Script for Additional Atheism Books:
 * 1. «الإسلام والإلحاد وجهاً لوجه: سؤال وجواب» — د. هيثم طلعت (34 سؤالاً دقيقاً)
 * 2. «الرد على أشهر شبهات الملحدين» — د. هيثم طلعت (65 شبهة رئيسية مع 112 صورة)
 */

import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import { extractDistinctKeywords } from '../utils/arabic_nlp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOK1_DOCX = 'C:/Users/mshms/Downloads/ar-atheism-and-islam.docx';
const BOOK2_DOCX = 'C:/Users/mshms/Downloads/ar-ashhar-shubuhat-almulhidin.docx';

const BASE_STORAGE = path.join(__dirname, '..', 'storage', 'atheism');

// ══════════════════════════════════════════════════════════
// ARCHIVE BOOK 1: الإسلام والإلحاد وجهاً لوجه
// ══════════════════════════════════════════════════════════
function archiveBook1(db) {
  console.log('\n======================================================');
  console.log('📖 أرشفة دقيقة لكتاب: «الإسلام والإلحاد وجهاً لوجه» — د. هيثم طلعت');
  console.log('======================================================');

  const zip = new AdmZip(BOOK1_DOCX);
  const mediaDir = path.join(BASE_STORAGE, 'atheism_and_islam', 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  const mediaEntries = zip.getEntries().filter(e => e.entryName.startsWith('word/media/'));
  for (const entry of mediaEntries) {
    const fileName = path.basename(entry.entryName);
    fs.writeFileSync(path.join(mediaDir, fileName), entry.getData());
  }

  const docXml = zip.readAsText('word/document.xml');

  // Build TOC map from Word bookmarks
  const hyperMatches = docXml.match(/<w:hyperlink[^>]*w:anchor="(_Toc[^"]+)"[^>]*>.*?<\/w:hyperlink>/gs) || [];
  const tocMap = {};
  for (const hm of hyperMatches) {
    const anchorM = hm.match(/w:anchor="([^"]+)"/);
    const tMatches = hm.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    let title = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('').replace(/\d+$/, '').trim();
    if (anchorM && title) {
      // Fix known TOC typo where Q4 was listed as 3 in TOC
      if (anchorM[1] === '_Toc85136623' && title.includes('دليل الإيجاد')) {
        title = '4- ما معنى دليل الإيجاد؟';
      }
      tocMap[anchorM[1]] = title;
    }
  }

  // Parse paragraphs
  const pMatches = docXml.match(/<w:p[\s>].*?<\/w:p>/gs) || [];
  const paras = [];
  for (let i = 0; i < pMatches.length; i++) {
    const p = pMatches[i];
    const tMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('').trim();
    const bm = p.match(/w:bookmarkStart[^>]*w:name="(_Toc[^"]+)"/);
    const bookmark = bm ? bm[1] : null;
    paras.push({ i, text, bookmark });
  }

  const articles = [];
  let curArticle = {
    title: 'مقدمة الكتيب والتمهيد',
    paragraphs: []
  };

  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (p.text === 'الفهرس' || p.i >= 788) break;

    if (p.bookmark && tocMap[p.bookmark]) {
      const rawTitle = tocMap[p.bookmark];
      const isMainQuestion = /^(\d{1,3}\s*[-–]|وفي الختام)/.test(rawTitle);

      if (isMainQuestion) {
        if (curArticle.paragraphs.length > 0) {
          articles.push(curArticle);
        }
        curArticle = {
          title: rawTitle,
          paragraphs: []
        };
        if (p.text && p.text !== 'س') {
          curArticle.paragraphs.push(p.text);
        }
        continue;
      } else {
        // Sub-heading inside question
        if (p.text && p.text !== 'س') {
          curArticle.paragraphs.push(`\n**${rawTitle}**\n${p.text}`);
        } else {
          curArticle.paragraphs.push(`\n**${rawTitle}**\n`);
        }
        continue;
      }
    }

    if (p.text && p.text !== 'س') {
      curArticle.paragraphs.push(p.text);
    }
  }

  if (curArticle.paragraphs.length > 0) {
    articles.push(curArticle);
  }

  console.log(`📚 تم تجهيز ${articles.length} موضوعاً وبحثاً دقيقاً من «الإسلام والإلحاد وجهاً لوجه»`);

  const ROOT = 'كتاب الإسلام والإلحاد وجهاً لوجه — د. هيثم طلعت';
  // Delete old docs from this book first
  db.prepare("DELETE FROM ocr_boxes WHERE document_id IN (SELECT id FROM documents WHERE book_source LIKE '%الإسلام والإلحاد%')").run();
  db.prepare("DELETE FROM document_tags WHERE document_id IN (SELECT id FROM documents WHERE book_source LIKE '%الإسلام والإلحاد%')").run();
  db.prepare("DELETE FROM documents WHERE book_source LIKE '%الإسلام والإلحاد%'").run();
  db.prepare(`INSERT OR IGNORE INTO folders (path, name, parent_path, sect, category, file_count) VALUES (?, ?, null, 'إلحاد', 'attack', 0)`).run(ROOT, ROOT);

  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents (
      filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, file_size, ocr_status, ocr_text
    ) VALUES (?, ?, '', ?, ?, 'إلحاد', 'attack', 'كتاب الإسلام والإلحاد وجهاً لوجه — د. هيثم طلعت', ?, 'completed', ?)
  `);

  const insertBox = db.prepare(`INSERT INTO ocr_boxes (document_id, line_index, text, box_json, confidence) VALUES (?, ?, ?, '[]', 100)`);
  const insertTag = db.prepare(`INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, ?)`);

  let count = 0;
  for (let idx = 0; idx < articles.length; idx++) {
    const art = articles[idx];
    const secNum = String(idx + 1).padStart(3, '0');
    const cleanTitle = art.title.replace(/[\/\\:*?"<>|]/g, ' ').trim();
    const docRelPath = `atheism/atheism_and_islam/${secNum}_${cleanTitle.substring(0, 40)}`;
    const fullText = art.paragraphs.join('\n\n');

    const res = insertDoc.run(
      cleanTitle,
      docRelPath,
      ROOT,
      ROOT,
      fullText.length,
      fullText
    );
    const docId = res.lastInsertRowid;

    let lineIdx = 0;
    for (const pt of art.paragraphs) {
      if (pt && pt.trim()) insertBox.run(docId, lineIdx++, pt.trim());
    }

    insertTag.run(docId, 'إلحاد', 1);
    insertTag.run(docId, 'الإسلام والإلحاد', 1);
    insertTag.run(docId, 'هيثم طلعت', 1);
    insertTag.run(docId, 'سؤال وجواب', 1);

    const autoKeywords = extractDistinctKeywords(fullText, cleanTitle, 5);
    for (const kw of autoKeywords) insertTag.run(docId, kw, 0);

    count++;
  }

  console.log(`✅ تم حفظ ${count} مقالاً في ${ROOT}`);
}

// ══════════════════════════════════════════════════════════
// ARCHIVE BOOK 2: الرد على أشهر شبهات الملحدين
// ══════════════════════════════════════════════════════════
function archiveBook2(db) {
  console.log('\n======================================================');
  console.log('📖 أرشفة دقيقة لكتاب: «الرد على أشهر شبهات الملحدين» — د. هيثم طلعت');
  console.log('======================================================');

  const zip = new AdmZip(BOOK2_DOCX);
  const mediaDir = path.join(BASE_STORAGE, 'shubuhat_almulhidin', 'media');
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

  const mediaEntries = zip.getEntries().filter(e => e.entryName.startsWith('word/media/'));
  for (const entry of mediaEntries) {
    const fileName = path.basename(entry.entryName);
    fs.writeFileSync(path.join(mediaDir, fileName), entry.getData());
  }

  const docXml = zip.readAsText('word/document.xml');
  const relsXml = zip.readAsText('word/_rels/document.xml.rels');
  const relMap = {};
  for (const r of (relsXml.match(/<Relationship[^>]+>/g) || [])) {
    const idM = r.match(/Id="([^"]+)"/);
    const targetM = r.match(/Target="([^"]+)"/);
    if (idM && targetM) relMap[idM[1]] = targetM[1];
  }

  const pMatches = docXml.match(/<w:p[\s>].*?<\/w:p>/gs) || [];
  const paras = [];
  for (let i = 0; i < pMatches.length; i++) {
    const p = pMatches[i];
    const tMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('').trim();
    const styleMatch = p.match(/w:pStyle w:val="([^"]+)"/);
    const style = styleMatch ? styleMatch[1] : '';
    const imgMatches = p.match(/r:embed="([^"]+)"/g) || [];
    const images = imgMatches.map(m => {
      const id = m.replace(/r:embed="|"/g, '');
      return relMap[id] ? path.basename(relMap[id]) : null;
    }).filter(Boolean);
    paras.push({ i, text, style, images });
  }

  const articles = [];
  let curArticle = {
    title: 'مقدمة الكتاب ومنهج تفكيك الشبهات',
    qNum: 0,
    paragraphs: [],
    images: []
  };

  for (let i = 35; i < paras.length; i++) {
    const p = paras[i];
    if (p.style === 'TOC1' || p.text.includes('فهرس الموضوعات') || p.text.includes('فهرس الكتاب')) break;

    const numM = p.text.match(/^(\d{1,3})\s*[-–]\s*(.+)/);
    if (numM) {
      const parsedNum = parseInt(numM[1]);
      const titleCandidate = numM[2].trim();
      
      // Keep sublists (like 1- تشوش في الذهن, 1- رفع ظلم) inside their questions
      const isSub = (parsedNum <= 10 && curArticle.qNum > 0 && parsedNum < curArticle.qNum) || 
                    (p.text.length < 110 && !titleCandidate.endsWith('؟') && !titleCandidate.endsWith('?'));

      if (isSub) {
        curArticle.paragraphs.push(p.text);
        curArticle.images.push(...p.images);
        continue;
      }

      if (curArticle.paragraphs.length > 0) {
        articles.push(curArticle);
      }

      curArticle = {
        title: `${parsedNum}- ${titleCandidate.substring(0, 110)}`,
        qNum: parsedNum,
        paragraphs: [p.text],
        images: [...p.images]
      };
      continue;
    }

    if (p.text) curArticle.paragraphs.push(p.text);
    curArticle.images.push(...p.images);
  }

  if (curArticle.paragraphs.length > 0) {
    articles.push(curArticle);
  }

  console.log(`📚 تم تجهيز ${articles.length} شبهة ومقالاً من كتاب «الرد على أشهر شبهات الملحدين»`);

  const ROOT = 'كتاب الرد على أشهر شبهات الملحدين — د. هيثم طلعت';
  db.prepare("DELETE FROM ocr_boxes WHERE document_id IN (SELECT id FROM documents WHERE book_source LIKE '%أشهر شبهات%')").run();
  db.prepare("DELETE FROM document_tags WHERE document_id IN (SELECT id FROM documents WHERE book_source LIKE '%أشهر شبهات%')").run();
  db.prepare("DELETE FROM documents WHERE book_source LIKE '%أشهر شبهات%'").run();
  db.prepare(`INSERT OR IGNORE INTO folders (path, name, parent_path, sect, category, file_count) VALUES (?, ?, null, 'إلحاد', 'defense', 0)`).run(ROOT, ROOT);

  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents (
      filename, relative_path, full_path, folder_name, folder_path, sect, category, book_source, file_size, ocr_status, ocr_text
    ) VALUES (?, ?, '', ?, ?, 'إلحاد', 'defense', 'كتاب الرد على أشهر شبهات الملحدين — د. هيثم طلعت', ?, 'completed', ?)
  `);

  const insertBox = db.prepare(`INSERT INTO ocr_boxes (document_id, line_index, text, box_json, confidence) VALUES (?, ?, ?, '[]', 100)`);
  const insertTag = db.prepare(`INSERT OR IGNORE INTO document_tags (document_id, tag, is_manual) VALUES (?, ?, ?)`);

  let count = 0;
  let totalImages = 0;
  for (let idx = 0; idx < articles.length; idx++) {
    const art = articles[idx];
    const secNum = String(idx + 1).padStart(3, '0');
    const cleanTitle = art.title.replace(/[\/\\:*?"<>|]/g, ' ').trim();
    const docRelPath = `atheism/shubuhat_almulhidin/${secNum}_${cleanTitle.substring(0, 40)}`;

    const textLines = [];
    for (const pt of art.paragraphs) {
      if (pt && pt.trim()) textLines.push(pt.trim());
    }
    for (const img of art.images) {
      textLines.push(`\n![مخطط توضيحي](${path.join(mediaDir, img)})\n`);
      totalImages++;
    }
    const fullText = textLines.join('\n\n');

    const res = insertDoc.run(
      cleanTitle,
      docRelPath,
      ROOT,
      ROOT,
      fullText.length,
      fullText
    );
    const docId = res.lastInsertRowid;

    let lineIdx = 0;
    for (const pt of art.paragraphs) {
      if (pt && pt.trim()) insertBox.run(docId, lineIdx++, pt.trim());
    }

    insertTag.run(docId, 'إلحاد', 1);
    insertTag.run(docId, 'شبهات الملحدين', 1);
    insertTag.run(docId, 'هيثم طلعت', 1);
    insertTag.run(docId, 'رد الشبهات', 1);

    const autoKeywords = extractDistinctKeywords(fullText, cleanTitle, 5);
    for (const kw of autoKeywords) insertTag.run(docId, kw, 0);

    count++;
  }

  console.log(`✅ تم حفظ ${count} مقالاً وربط ${totalImages} صورة في ${ROOT}`);
}

// ══════════════════════════════════════════════════════════
// MAIN RUNNER
// ══════════════════════════════════════════════════════════
const db = getDb();

const runAll = db.transaction(() => {
  archiveBook1(db);
  archiveBook2(db);
  
  db.prepare(`
    UPDATE folders SET file_count = (
      SELECT COUNT(*) FROM documents WHERE folder_path = folders.path OR folder_path LIKE folders.path || '/%'
    ) WHERE sect = 'إلحاد'
  `).run();
});

runAll();

console.log('\n🎉 تم الانتهاء من تصحيح وإعادة أرشفة الكتابين بنجاح!');
db.close();
