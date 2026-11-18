import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const testDbPath = join(tmpdir(), `arabic-translations-${randomUUID()}.sqlite`);
process.env.DB_PATH = testDbPath;
process.env.BIBLE_ONLY = 'true';
const { getDb, initDatabase } = await import('./schema.js');
const { initBibleSchema } = await import('./bible_schema.js');
const { ensureArabicTranslationsImported } = await import('./arabic_translations_startup_import.js');
const { getBook, getTranslations } = await import('../utils/bible_service.js');

initDatabase();
initBibleSchema();
after(() => {
  getDb().close();
  for (const suffix of ['', '-wal', '-shm']) rmSync(testDbPath + suffix, { force: true });
});

test('imports the Arabic translations with exact unit counts and honest labels', () => {
  const imported = ensureArabicTranslationsImported();
  assert.equal(imported.length, 109);
  for (const code of ['MOS', '1MCE', '2ES', '2MCE', '3BAR', '3MCE', 'ONK-GEN', 'TJ-GEN', 'SAAD-GEN', 'ONK-DEU', 'TJ-DEU', 'SAAD-DEU', 'MSH-MISHNAH-BERAKHOT', 'MSH-MISHNAH-OKTZIN']) {
    assert.ok(imported.includes(code), code);
  }
  const db = getDb();
  const totals = db.prepare(`
    SELECT bt.slug, bt.name_ar, bt.source_type, COUNT(*) AS units FROM bible_verses bv
    JOIN bible_translations bt ON bt.id=bv.translation_id
    WHERE bt.language='ar' AND (bt.slug LIKE 'ar-mohammad-%' OR bt.slug LIKE 'ar-machine-%')
    GROUP BY bt.slug ORDER BY bt.slug
  `).all();
  assert.deepEqual(totals, [
    { slug: 'ar-machine-jewish-he', name_ar: 'ترجمة آلية', source_type: 'machine-translation', units: 40826 },
    { slug: 'ar-machine-mishnah', name_ar: 'ترجمة آلية', source_type: 'machine-translation', units: 4187 },
    { slug: 'ar-machine-saadia-script', name_ar: 'ترجمة آلية', source_type: 'machine-transliteration', units: 5846 },
    { slug: 'ar-machine-targum-onkelos', name_ar: 'ترجمة آلية', source_type: 'machine-translation', units: 5846 },
    { slug: 'ar-mohammad-1mce', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 240 },
    { slug: 'ar-mohammad-2es', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 944 },
    { slug: 'ar-mohammad-2mce', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 421 },
    { slug: 'ar-mohammad-3bar', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 17 },
    { slug: 'ar-mohammad-3mce', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 208 },
    { slug: 'ar-mohammad-mos', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 129 },
    { slug: 'ar-mohammad-targum-pseudo-jonathan', name_ar: 'ترجمة محمد بن شمس الدين', source_type: 'machine-assisted-translation', units: 5761 }
  ]);
  assert.deepEqual(ensureArabicTranslationsImported(), []);
  for (const code of ['1MCE', '2ES', '2MCE', '3BAR', '3MCE', 'MOS']) {
    assert.ok(getBook(code).available_translations.includes(`ar-mohammad-${code.toLowerCase()}`), code);
  }
  assert.equal(getTranslations().filter((item) => item.slug.startsWith('ar-mohammad-')).length, 7);
});
