import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { getDb } from '../db/schema.js';

function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove tashkeel diacritics
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();
}

const BOOK_ORDER = [
  'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA',
  '1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO',
  'ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO',
  'OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL',
  'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
  'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
  '1PE','2PE','1JN','2JN','3JN','JUD','REV'
];

async function importNWT() {
  const db = getDb();
  const epubPath = path.join(process.cwd(), 'scratch', 'bi12_A.epub');
  if (!fs.existsSync(epubPath)) {
    console.error('EPUB file not found at:', epubPath);
    return;
  }

  console.log('Registering translation in DB...');
  const insertTrans = db.prepare(`
    INSERT OR IGNORE INTO bible_translations (slug, name_ar, name_en, abbreviation, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertTrans.run(
    'ar-nwt',
    'ترجمة العالم الجديد (شهود يهوه)',
    'New World Translation (Jehovah\'s Witnesses)',
    'ع‌ج',
    5
  );

  const trans = db.prepare("SELECT id FROM bible_translations WHERE slug = 'ar-nwt'").get();
  const transId = trans.id;

  console.log(`Translation ID for ar-nwt: ${transId}`);

  // Clean old verses for ar-nwt if any
  db.prepare("DELETE FROM bible_verses WHERE translation_id = ?").run(transId);

  const zip = new AdmZip(epubPath);
  const zipEntries = zip.getEntries();
  const xhtmlEntries = zipEntries.filter(e => e.entryName.startsWith('OEBPS/') && e.entryName.endsWith('.xhtml'));

  console.log(`Found ${xhtmlEntries.length} XHTML entries in EPUB.`);

  const insertVerse = db.prepare(`
    INSERT OR IGNORE INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let totalVersesCount = 0;
  const insertTransaction = db.transaction((verses) => {
    for (const v of verses) {
      insertVerse.run(transId, v.bookCode, v.chapter, v.verse, v.text, v.searchText);
    }
  });

  const SINGLE_CHAPTER_MAP = {
    'OBA': '1001060432.xhtml',
    'PHM': '1001060458.xhtml',
    '2JN': '1001060464.xhtml',
    '3JN': '1001060465.xhtml',
    'JUD': '1001060466.xhtml'
  };

  // Iterate over each book
  for (let bookIdx = 0; bookIdx < BOOK_ORDER.length; bookIdx++) {
    const bookNum = bookIdx + 1;
    const bookCode = BOOK_ORDER[bookIdx];
    let chapterHrefs = [];

    if (SINGLE_CHAPTER_MAP[bookCode]) {
      chapterHrefs = [SINGLE_CHAPTER_MAP[bookCode]];
    } else {
      // Find the chapter navigation file for this book to get chapter file links
      const chapNavEntry = zip.getEntry(`OEBPS/biblechapternav${bookNum}.xhtml`);
      if (!chapNavEntry) {
        console.warn(`Could not find chapter nav for book ${bookNum} (${bookCode})`);
        continue;
      }

      const chapNavHtml = chapNavEntry.getData().toString('utf8');
      const hrefMatches = chapNavHtml.matchAll(/href="([^"#]+\.xhtml)(?:#[^"]*)?"/g);
      for (const match of hrefMatches) {
        const href = match[1];
        if (!chapterHrefs.includes(href) && href.startsWith('100106')) {
          chapterHrefs.push(href);
        }
      }
    }

    // Sort or process chapter by chapter
    let bookVerses = [];
    for (let chIdx = 0; chIdx < chapterHrefs.length; chIdx++) {
      const chFile = chapterHrefs[chIdx];
      const chEntry = zip.getEntry(`OEBPS/${chFile}`);
      if (!chEntry) continue;

      const html = chEntry.getData().toString('utf8');
      
      // Parse chapter number
      const chNum = chIdx + 1;

      // Extract verses using regex on span markers: <span id="chapter{ch}_verse{v}"></span>
      // Verses are delineated by <span id="chapterX_verseY"> or end of paragraphs
      // Let's split content by <span id="chapter\d+_verse(\d+)">
      const verseSplitRegex = /<span id="chapter\d+_verse(\d+)"[^>]*><\/span>/g;
      const spans = [...html.matchAll(verseSplitRegex)];

      for (let sIdx = 0; sIdx < spans.length; sIdx++) {
        const vNum = parseInt(spans[sIdx][1]);
        const startPos = spans[sIdx].index + spans[sIdx][0].length;
        const endPos = (sIdx + 1 < spans.length) ? spans[sIdx + 1].index : html.indexOf('</body>', startPos);
        
        let rawVerseHtml = html.slice(startPos, endPos > 0 ? endPos : html.length);
        
        // Strip footnotes, cross-references, span tags, superscripts (verse numbers)
        // JW footnotes have class="footnote" or class="w_fn" or <a> tags with class="w_fnLink"
        let cleanText = rawVerseHtml
          .replace(/<a [^>]*class="w_fnLink"[^>]*>.*?<\/a>/gs, '')
          .replace(/<a [^>]*class="w_crossRef"[^>]*>.*?<\/a>/gs, '')
          .replace(/<strong><sup>.*?<\/sup><\/strong>/gs, '')
          .replace(/<span class="w_ch">.*?<\/span>/gs, '')
          .replace(/<span class="pageNum"[^>]*>.*?<\/span>/gs, '')
          .replace(/<header>.*?<\/header>/gs, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width spaces
          .replace(/\s+/g, ' ')
          .trim();

        // Strip leading verse number if still present (e.g. "١ " or "1 ")
        cleanText = cleanText.replace(/^[٠-٩0-9]+\s+/, '').trim();

        if (cleanText) {
          const norm = normalizeArabicText(cleanText);
          bookVerses.push({
            bookCode,
            chapter: chNum,
            verse: vNum,
            text: cleanText,
            searchText: norm
          });
        }
      }
    }

    insertTransaction(bookVerses);
    totalVersesCount += bookVerses.length;
    console.log(`[${bookCode}] Ingested ${bookVerses.length} verses (Book ${bookNum}/${BOOK_ORDER.length})`);
  }

  console.log(`\n🎉 Successfully imported Arabic NWT: ${totalVersesCount} verses across 66 books!`);

  // Update FTS index for ar-nwt
  console.log('Rebuilding FTS index for Bible verses...');
  try {
    db.prepare(`
      INSERT INTO bible_verses_fts(rowid, text, search_text)
      SELECT id, text, search_text FROM bible_verses WHERE translation_id = ?
    `).run(transId);
    console.log('FTS index updated!');
  } catch (err) {
    console.log('FTS trigger handled index automatically.');
  }
}

importNWT();
