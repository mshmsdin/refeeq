import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { getDb } from './schema.js';
import { JEWISH_SOURCES_MANIFEST } from '../importers/jewish_sources_catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../importers/data/jewish');

const LICENSE_AR = {
  'Public Domain': 'ملك عام',
  CC0: 'تنازل عام (CC0)',
  'CC-BY': 'نسب المصنف (CC BY) — يلزم إسناد الترجمة إلى صاحبها',
  'CC-BY-SA': 'نسب المصنف والمشاركة بالمثل (CC BY-SA) — يلزم الإسناد وإبقاء الترخيص نفسه'
};
const SOURCE_TYPE = { 'Public Domain': 'public-domain-text', CC0: 'cc0', 'CC-BY': 'cc-by', 'CC-BY-SA': 'cc-by-sa' };

// إزالة التشكيل والتعليمات العبرية لتسهيل البحث
function normalizeHebrew(text) {
  return text.replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim();
}

function translationRow(slug) {
  const meta = JEWISH_SOURCES_MANIFEST.translations[slug];
  const isHe = meta.language === 'he';
  const license = LICENSE_AR[meta.license] || meta.license;
  return {
    slug,
    nameAr: isHe ? `النص العبري/الآرامي: ${meta.versionTitle}` : `الترجمة الإنجليزية: ${meta.versionTitle}`,
    nameEn: meta.versionTitle,
    abbreviation: isHe ? 'עב' : 'EN',
    language: meta.language,
    sourceType: SOURCE_TYPE[meta.license] || 'open-text',
    sourceUrl: 'https://www.sefaria.org/',
    notes: `مصدر النص: مكتبة سفاريا المفتوحة. رخصة هذه النسخة بحسب سجل سفاريا: ${license}. `
      + 'تُعرض مسودة المصدر كما هي بلا مراجعة نقدية، وتختلف نسخ الأسفار في الاكتمال (انظر حالة كل سفر).'
  };
}

const GROUP_NOTES = {
  bavli: 'الإصحاح في هذا السفر هو وجه الورقة بحسب ترقيم سفاريا: ١ = ١أ، ٢ = ١ب، ٣ = ٢أ، ٤ = ٢ب وهكذا؛ والعدد هو المقطع داخل الوجه.',
  mishnah: 'الإصحاح هو الفصل (بيرق) والعدد هو الفقرة (مشنا).',
  yerushalmi: 'الإصحاح هنا ترقيم متسلسل لوحدات الهلاخا في السفر (لا ترقيم الفصول)، والعدد هو المقطع داخلها.',
  zohar: 'الإصحاح ترقيم متسلسل لأقسام النص بحسب سفاريا، والعدد المقطع داخله.'
};

function workKnownCounts(db) {
  const rows = db.prepare(`
    SELECT bt.slug, bv.book_code, COUNT(*) AS n FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bv.book_code IN (SELECT code FROM bible_books WHERE collection_id=(SELECT id FROM bible_collections WHERE slug='jewish-sources'))
    GROUP BY bt.slug, bv.book_code
  `).all();
  return new Map(rows.map((r) => [`${r.slug}|${r.book_code}`, r.n]));
}

function workIsReady(counts, work) {
  return ['he', 'en'].every((lang) => !work[lang] || counts.get(`${work[lang].slug}|${work.code}`) === work[lang].units);
}

function importWork(db, work, translationIds, statements) {
  const payload = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA_DIR, `${work.code}.json.gz`))).toString('utf8'));
  db.transaction(() => {
    if (!db.prepare('SELECT 1 FROM bible_books WHERE code=?').get(work.code)) {
      throw new Error(`السفر ${work.code} غير موجود في الفهرس`);
    }
    for (const lang of ['he', 'en']) {
      if (!work[lang]) continue;
      const id = translationIds.get(work[lang].slug);
      statements.deleteVerses.run(id, work.code);
      for (const [chapter, verse, text] of payload[lang].units) {
        statements.insertVerse.run(id, work.code, chapter, verse, text, lang === 'he' ? normalizeHebrew(text) : text,
          `https://www.sefaria.org/${encodeURIComponent(work.title.replace(/ /g, '_'))}`);
      }
    }
    const langs = ['he', 'en'].filter((lang) => work[lang]);
    const heMeta = work.he ? JEWISH_SOURCES_MANIFEST.translations[work.he.slug] : null;
    const coverage = work.coverageHe ? ` تغطية النص العبري/الآرامي ${Math.round(work.coverageHe * 100)}٪ من مقاطع فهرس سفاريا.` : ' لم يُتحقق من اكتمال النص مقابل فهرس سفاريا.';
    const notes = `${GROUP_NOTES[work.group] || 'الإصحاح والعدد بحسب ترقيم سفاريا.'}${coverage} النسخ المتاحة: ${langs.map((lang) => JEWISH_SOURCES_MANIFEST.translations[work[lang].slug].versionTitle).join('؛ ')}.`;
    db.prepare('UPDATE bible_books SET chapter_count=CASE WHEN chapter_count<? THEN ? ELSE chapter_count END WHERE code=?').run(work.chapters, work.chapters, work.code);
    db.prepare(`
      UPDATE bible_book_metadata SET text_status=?, english_status=CASE WHEN ? THEN 'available' ELSE english_status END,
        original_language='العبرية والآرامية', source_name=?, source_url=?, source_notes=?, updated_at=CURRENT_TIMESTAMP WHERE book_code=?
    `).run(work.textStatus, work.en ? 1 : 0, heMeta ? heMeta.versionTitle : 'سفاريا', 'https://www.sefaria.org/', notes, work.code);
    for (const lang of langs) {
      const tr = translationRow(work[lang].slug);
      statements.upsertSource.run(work.code, tr.nameAr, tr.nameEn, tr.language, tr.sourceType, tr.sourceUrl, tr.notes);
    }
  })();
}

// يستورد المصادر اليهودية على دفعات صغيرة ويتنازل عن الحلقة بين كل سفر وآخر ليبقى الخادم مستجيباً.
export async function ensureJewishSourcesImported({ onlyCodes = null } = {}) {
  const db = getDb();
  const works = JEWISH_SOURCES_MANIFEST.works.filter((work) => !onlyCodes || onlyCodes.includes(work.code));
  const counts = workKnownCounts(db);
  const pending = works.filter((work) => !workIsReady(counts, work));
  if (!pending.length) return [];

  const upsertTranslation = db.prepare(`
    INSERT INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, source_url, source_type, source_notes, site_scope, is_active, display_order, imported_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bible', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET name_ar=excluded.name_ar, name_en=excluded.name_en, abbreviation=excluded.abbreviation,
      language=excluded.language, source_url=excluded.source_url, source_type=excluded.source_type,
      source_notes=excluded.source_notes, site_scope='bible', is_active=1, updated_at=CURRENT_TIMESTAMP
  `);
  const translationIds = new Map();
  const slugs = [...new Set(pending.flatMap((work) => ['he', 'en'].filter((lang) => work[lang]).map((lang) => work[lang].slug)))];
  slugs.forEach((slug, index) => {
    const tr = translationRow(slug);
    upsertTranslation.run(tr.slug, tr.nameAr, tr.nameEn, tr.abbreviation, tr.language, tr.sourceUrl, tr.sourceType, tr.notes, 300 + index);
    translationIds.set(slug, db.prepare('SELECT id FROM bible_translations WHERE slug=?').get(slug).id);
  });
  const statements = {
    deleteVerses: db.prepare('DELETE FROM bible_verses WHERE translation_id=? AND book_code=?'),
    insertVerse: db.prepare(`
      INSERT INTO bible_verses (translation_id, book_code, chapter, verse, text, search_text, source_url, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `),
    upsertSource: db.prepare(`
      INSERT INTO bible_book_sources (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
      VALUES (?, ?, ?, ?, 'available', ?, ?, ?)
      ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET label_en=excluded.label_en, notes=excluded.notes
    `)
  };

  const imported = [];
  for (const work of pending) {
    importWork(db, work, translationIds, statements);
    imported.push(work.code);
    await new Promise((resolve) => setImmediate(resolve));
  }
  const after = workKnownCounts(db);
  const bad = pending.filter((work) => !workIsReady(after, work));
  if (bad.length) throw new Error(`تعذر تثبيت المصادر اليهودية: ${bad.map((work) => work.code).join(', ')}`);
  return imported;
}
