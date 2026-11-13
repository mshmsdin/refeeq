import { readFile } from 'node:fs/promises';
import { getDb } from './schema.js';
import { ADDITIONAL_SOURCES, run as importNoncanonicalSources } from '../importers/import_noncanonical_english.js';
import { parseReviewedUnitText } from '../importers/reviewed_text_source.js';

const WITNESS = { slug: 'arc-qdr-1q20-genesis-apocryphon-2026', units: 494, chapters: 22 };

function getSourceState(db, definition) {
  return db.prepare(`
    SELECT bt.id, bt.language, bt.is_active, bt.site_scope, bt.source_type,
      COUNT(bv.id) AS unit_count, COUNT(DISTINCT bv.chapter) AS chapter_count,
      bbm.text_status,
      EXISTS (
        SELECT 1 FROM bible_book_sources bbs
        WHERE bbs.book_code='GENAP' AND bbs.label_ar=? AND bbs.language=? AND bbs.source_url=?
          AND bbs.source_type=? AND bbs.notes=?
      ) AS source_record_ready
    FROM bible_translations bt
    LEFT JOIN bible_verses bv ON bv.translation_id=bt.id AND bv.book_code='GENAP'
    LEFT JOIN bible_book_metadata bbm ON bbm.book_code='GENAP'
    WHERE bt.slug=?
    GROUP BY bt.id
  `).get(definition.nameAr, definition.language, definition.url, definition.sourceType, definition.notes, WITNESS.slug);
}

function sourceIsReady(state, definition) {
  return state && state.language === 'arc' && state.is_active === 1 && state.site_scope === 'both'
    && state.source_type === 'cc-by-sa-4.0' && state.unit_count === WITNESS.units
    && state.chapter_count === WITNESS.chapters && state.text_status === 'partial'
    && state.source_record_ready === 1;
}

async function sourceUnitsMatch(db, translationId, definition) {
  const expected = parseReviewedUnitText(await readFile(definition.textFile, 'utf8'), definition)
    .map(({ chapter, verse, text, sourceUrl }) => ({ chapter, verse, text, source_url: sourceUrl }));
  const actual = db.prepare(`
    SELECT chapter, verse, text, source_url FROM bible_verses
    WHERE translation_id=? AND book_code='GENAP' ORDER BY chapter, verse
  `).all(translationId);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function ensureGenesisApocryphonImported() {
  const db = getDb();
  const bookOrder = db.prepare(`
    SELECT bb.canonical_order AS position,
      (SELECT canonical_order FROM bible_books WHERE code='BNOAH') AS previous_position,
      (SELECT canonical_order FROM bible_books WHERE code='GIANTS') AS next_position
    FROM bible_books bb WHERE bb.code='GENAP'
  `).get();
  if (!bookOrder || bookOrder.position !== 8.7 || bookOrder.previous_position !== 8.6 || bookOrder.next_position !== 9) {
    throw new Error('يجب أن يبقى أبوكريفون التكوين بعد شذرات ولادة نوح وقبل سفر العمالقة في الترتيب القصصي');
  }

  const definition = ADDITIONAL_SOURCES.find(({ slug }) => slug === WITNESS.slug);
  if (!definition) throw new Error(`تعذر العثور على تعريف المصدر ${WITNESS.slug}`);
  const current = getSourceState(db, definition);
  if (sourceIsReady(current, definition) && await sourceUnitsMatch(db, current.id, definition)) return false;

  await importNoncanonicalSources([WITNESS.slug], { initializeDatabase: false });
  const imported = getSourceState(db, definition);
  if (!sourceIsReady(imported, definition) || !await sourceUnitsMatch(db, imported.id, definition)) {
    throw new Error('تعذر تثبيت أسطر الشاهد القمراني 1Q20 كما روجعت محلياً');
  }
  return true;
}
