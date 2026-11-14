import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './schema.js';
import { normalizeArabicText } from '../utils/arabic_nlp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../importers/data/versions');

const WITNESSES = [
  {
    file: 'brenton-ot.json', prefix: 'LXX', slug: 'en-brenton-lxx-ot', language: 'en', abbreviation: 'LXX-EN-OT',
    nameAr: 'ترجمة برنتون الإنجليزية للسبعينية (العهد القديم)', nameEn: 'Brenton English Septuagint (Old Testament)',
    sourceType: 'public-domain-text', displayOrder: 190, url: 'https://ebible.org/Scriptures/eng-Brenton_vpl.zip',
    notes: 'ترجمة لانسيلوت برنتون الإنجليزية (١٨٥١) للسبعينية، منشورة في مصدر البيبل ملكاً عاماً. ترقيمها ترقيم السبعينية، فقد يختلف عن الماسوري والعربي (كالمزامير وإرميا). لا يوجد فيها سفرا أستير ودانيال بصورتيهما الكاملتين هنا، وهما مسجلان في الأسفار القانونية الثانية.'
  },
  {
    file: 'clementine-vulgate-ot.json', prefix: 'VUL', slug: 'la-clementine-vulgate-ot', language: 'la', abbreviation: 'VUL-LA-OT',
    nameAr: 'الفولجاتا اللاتينية الكليمنتية (العهد القديم)', nameEn: 'Clementine Vulgate (Old Testament)',
    sourceType: 'public-domain-text', displayOrder: 191, url: 'https://ebible.org/Scriptures/latVUC_vpl.zip',
    notes: 'النص اللاتيني للفولجاتا الكليمنتية (١٥٩٨) من مصدر البيبل، معلن ملكاً عاماً. ترقيم المزامير وبعض الأسفار يتبع الفولجاتا ويختلف عن الماسوري.'
  }
];

function load(witness) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, witness.file), 'utf8'));
}

function isReady(db, witness, data) {
  const row = db.prepare('SELECT id, is_active, source_notes, language FROM bible_translations WHERE slug=?').get(witness.slug);
  if (!row || row.is_active !== 1 || row.source_notes !== witness.notes || row.language !== witness.language) return false;
  const counts = new Map(db.prepare('SELECT book_code, COUNT(*) AS n FROM bible_verses WHERE translation_id=? GROUP BY book_code')
    .all(row.id).map((r) => [r.book_code, r.n]));
  return Object.entries(data).every(([code, verses]) => counts.get(`${witness.prefix}-${code}`) === verses.length)
    && counts.size === Object.keys(data).length;
}

// يستورد السبعينية (برنتون) والفولجاتا الكليمنتية للعهد القديم كنسخ موازية برموز LXX-* وVUL-*.
export function ensureAncientVersionsImported() {
  const db = getDb();
  const imported = [];
  for (const witness of WITNESSES) {
    const data = load(witness);
    if (isReady(db, witness, data)) continue;
    db.transaction(() => {
      db.prepare(`
        INSERT INTO bible_translations
          (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order, imported_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
          language=excluded.language, source_url=excluded.source_url, source_type=excluded.source_type,
          source_notes=excluded.source_notes, site_scope='bible', is_active=1, display_order=excluded.display_order, updated_at=CURRENT_TIMESTAMP
      `).run(witness.slug, witness.nameAr, witness.nameEn, witness.abbreviation, witness.language, witness.url, witness.sourceType, witness.notes, witness.displayOrder);
      const id = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(witness.slug).id;
      db.prepare('DELETE FROM bible_verses WHERE translation_id=?').run(id);
      const insertVerse = db.prepare(`
        INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      for (const [code, verses] of Object.entries(data)) {
        const bookCode = `${witness.prefix}-${code}`;
        if (!db.prepare('SELECT 1 FROM bible_books WHERE code=?').get(bookCode)) throw new Error(`السفر ${bookCode} غير موجود في الفهرس`);
        for (const [chapter, verse, text] of verses) {
          insertVerse.run(id, bookCode, chapter, verse, text, witness.language === 'en' ? text : normalizeArabicText(text), witness.url);
        }
        const maxChapter = Math.max(...verses.map(([chapter]) => chapter));
        db.prepare('UPDATE bible_books SET chapter_count=CASE WHEN chapter_count<? THEN ? ELSE chapter_count END WHERE code=?').run(maxChapter, maxChapter, bookCode);
        db.prepare(`
          UPDATE bible_book_metadata SET text_status='complete', english_status=CASE WHEN ?='en' THEN 'available' ELSE english_status END,
            source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP WHERE book_code=?
        `).run(witness.language, witness.nameEn, witness.url, witness.notes, bookCode);
        db.prepare(`
          INSERT INTO bible_book_sources (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
          VALUES (?, ?, ?, ?, 'available', ?, ?, ?)
          ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET label_en=excluded.label_en, notes=excluded.notes
        `).run(bookCode, witness.nameAr, witness.nameEn, witness.language, witness.sourceType, witness.url, witness.notes);
      }
    })();
    if (!isReady(db, witness, data)) throw new Error(`فشل التحقق بعد استيراد ${witness.slug}`);
    imported.push(witness.slug);
  }
  return imported;
}
