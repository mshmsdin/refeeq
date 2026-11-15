import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

export const TESTAMENT_ABRAHAM_GREEK_SOURCES = ['a', 'b'].map((recension) => {
  const slug = `grc-ocp-testament-abraham-${recension}-2026`;
  const source = ADDITIONAL_SOURCES.find((item) => item.slug === slug);
  if (!source) throw new Error(`تعذر العثور على تعريف مصدر وصية إبراهيم ${recension}`);
  return source;
});

const SUMMARY = 'تتوفر وصية إبراهيم بنصها اليوناني النقدي في النسختين أ (٢٠ فصلاً و٢٦٢ وحدة) وب (١٤ فصلاً و١٧٥ وحدة)، مع ترجمتين إنجليزيتين تاريخيتين مستقلتين. كل نسخة شاهد منفصل؛ اكتمال الوحدات هنا بحسب النص النقدي المثبت ولا يلغي اختلاف الشواهد والمخطوطات.';

function getState(db, source) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status, bbm.original_language, bbm.summary_ar,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='AABR' AND bbs.label_ar=? AND bbs.language=?
          AND bbs.source_url=? AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='AABR'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='AABR'
    WHERE bt.slug=? GROUP BY bt.id
  `).get(source.nameAr, source.language, source.url, source.sourceType, source.notes, source.slug);
}

function stateIsReady(state, source) {
  return state && state.language === 'grc' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-4.0' && state.unit_count === source.expectedUnitCount
    && state.chapter_count === source.maxChapter && state.text_status === 'complete'
    && state.original_language === 'اليونانية' && state.summary_ar === SUMMARY
    && state.source_record_ready === 1;
}

async function unitsMatch(db, source, translationId) {
  const expected = parseReviewedUnitText(await readFile(source.textFile, 'utf8'), source)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='AABR' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureTestamentAbrahamGreekImported() {
  const db = getDb();
  const current = await Promise.all(TESTAMENT_ABRAHAM_GREEK_SOURCES.map(async (source) => {
    const state = getState(db, source);
    return stateIsReady(state, source) && await unitsMatch(db, source, state.id);
  }));
  if (current.every(Boolean)) return false;

  await importNoncanonicalSources(TESTAMENT_ABRAHAM_GREEK_SOURCES.map(({ slug }) => slug), {
    initializeDatabase: false
  });
  db.prepare(`
    UPDATE bible_book_metadata
    SET original_language='اليونانية', text_status='complete', english_status='available',
      summary_ar=?, source_name='مشروع النصوص النقدية المفتوحة',
      source_url='https://github.com/OnlineCriticalPseudepigrapha/Online-Critical-Pseudepigrapha',
      source_notes='النص النقدي اليوناني متاح في نسختين مستقلتين، أ وب. لكل نسخة تفريغها ومصدرها ورخصة المشاع الإبداعي النسب ٤٫٠؛ تبقى الترجمات الإنجليزية التاريخية سجلات مستقلة.'
    WHERE book_code='AABR'
  `).run(SUMMARY);

  for (const source of TESTAMENT_ABRAHAM_GREEK_SOURCES) {
    const state = getState(db, source);
    if (!stateIsReady(state, source) || !await unitsMatch(db, source, state.id)) {
      throw new Error(`لم يطابق النص اليوناني للنسخة ${source.slug.endsWith('-a-2026') ? 'أ' : 'ب'} وحداته الموثقة`);
    }
  }
  return true;
}
