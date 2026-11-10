import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb, initDatabase } from './schema.js';
import { initBibleSchema } from './bible_schema.js';

test('preserves available parallel source details after schema initialization', () => {
  initDatabase();
  initBibleSchema();
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO bible_translations
      (slug, name_ar, name_en, abbreviation, language, site_scope, is_active)
    VALUES ('schema-test', 'اختبار', 'Schema Test', 'TST', 'en', 'bible', 1)
  `).run();
  const translation = db.prepare('SELECT id FROM bible_translations WHERE slug=?').get('schema-test');
  db.prepare(`
    INSERT OR REPLACE INTO bible_verses
      (translation_id, book_code, chapter, verse, text, search_text, source_url)
    VALUES (?, 'EZRS', 1, 1, 'Test verse', 'Test verse', 'https://example.org/text')
  `).run(translation.id);
  db.prepare(`
    INSERT INTO bible_book_sources
      (book_code, label_ar, label_en, language, availability_status, source_type, source_url, notes)
    VALUES ('EZRS', 'شاهد اختبار', 'Test parallel witness', 'الإنجليزية', 'available', 'parallel-text', 'https://example.org/text', 'Test provenance')
    ON CONFLICT(book_code, label_ar, language, source_url) DO UPDATE SET
      availability_status='available', source_type='parallel-text', notes=excluded.notes
  `).run();
  db.prepare(`
    UPDATE bible_book_metadata SET source_name='stale catalog', source_url='https://example.org/catalog', source_notes='stale notes'
    WHERE book_code='EZRS'
  `).run();

  initBibleSchema();

  const metadata = db.prepare(`
    SELECT source_name, source_url, source_notes
    FROM bible_book_metadata WHERE book_code='EZRS'
  `).get();
  assert.deepEqual(metadata, {
    source_name: 'Test parallel witness',
    source_url: 'https://example.org/text',
    source_notes: 'Test provenance'
  });
});
