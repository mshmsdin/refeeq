import { getDb } from '../db/schema.js';

const db = getDb();
let apCol = db.prepare("SELECT id FROM bible_collections WHERE slug = 'apocrypha'").get();
if (!apCol) {
  db.prepare(`
    INSERT OR IGNORE INTO bible_collections (slug, name_ar, name_en, category, display_order)
    VALUES ('apocrypha', 'نصوص أبوكريفية وإثيوبية', 'Apocrypha & Pseudepigrapha', 'apocrypha', 4)
  `).run();
  apCol = db.prepare("SELECT id FROM bible_collections WHERE slug = 'apocrypha'").get();
}

const apId = apCol.id;

const insertBook = db.prepare(`
  INSERT OR IGNORE INTO bible_books (code, name_ar, name_en, abbreviation_ar, collection_id, canonical_order, chapter_count)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertBook.run('ENO', 'أخنوخ الأول', '1 Enoch', 'أخ', apId, 1, 108);
insertBook.run('JUB', 'اليوبيلات', 'Book of Jubilees', 'يوب', apId, 2, 50);

const insertAlias = db.prepare(`INSERT OR IGNORE INTO bible_book_aliases (book_code, alias) VALUES (?, ?)`);
const aliases = [
  ['ENO', 'أخنوخ'],
  ['ENO', 'اخنوخ'],
  ['ENO', 'سفر أخنوخ'],
  ['ENO', 'أخنوخ الأول'],
  ['ENO', 'اخنوخ الاول'],
  ['ENO', '1 Enoch'],
  ['JUB', 'اليوبيلات'],
  ['JUB', 'سفر اليوبيلات'],
  ['JUB', 'اليوبيل'],
  ['JUB', 'سفر اليوبيل'],
  ['JUB', 'التكوين الصغير'],
  ['JUB', 'Jubilees']
];

for (const [code, alias] of aliases) {
  insertAlias.run(code, alias);
}

const books = db.prepare("SELECT id, code, name_ar, collection_id FROM bible_books WHERE code IN ('ENO', 'JUB')").all();
console.log('Registered Apocrypha books:', books);
