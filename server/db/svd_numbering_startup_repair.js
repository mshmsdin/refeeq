import { getDb } from './schema.js';
import { run as importSvd } from '../importers/import_svd.js';
import { run as rebuildEthiopicDivisions } from '../importers/import_ethiopic_divisions.js';

const SVD_SLUG = 'ar-svd';

// إصحاحات فان دايك التي لا يبدأ ترقيم أعدادها من 1.
// كان الاستيراد القديم يقرأ رقم الإصحاح على أنه رقم العدد الأول، فيبدأ تكوين 25 بالعدد 25 ويظهر «25 26 27» بدل «1 2 3».
export function findMisnumberedSvdChapters(db = getDb()) {
  return db.prepare(`
    SELECT v.book_code AS book, v.chapter, MIN(v.verse) AS first_verse
    FROM bible_verses v
    JOIN bible_translations t ON t.id = v.translation_id
    WHERE t.slug = ?
    GROUP BY v.book_code, v.chapter
    HAVING MIN(v.verse) <> 1
    ORDER BY v.book_code, v.chapter
  `).all(SVD_SLUG);
}

// يعيد استيراد فان دايك بالمستورد المصحَّح إن وُجد إصحاح خاطئ الترقيم؛ لا يفعل شيئاً إن كانت البيانات سليمة.
export async function ensureSvdNumberingRepaired({
  db = getDb(),
  // «تغسات» (أمثال ٢٥–٣١) مشتقة من أعداد فان دايك، فتُبنى من جديد بعد تصحيحها.
  importer = async () => {
    await importSvd({ initializeDatabase: false });
    rebuildEthiopicDivisions({ initializeDatabase: false });
  }
} = {}) {
  const before = findMisnumberedSvdChapters(db);
  if (!before.length) return { repaired: false, chapters: 0 };
  await importer();
  const after = findMisnumberedSvdChapters(db);
  if (after.length) {
    throw new Error(`بقي ${after.length} إصحاحاً من فان دايك بترقيم خاطئ بعد إعادة الاستيراد`);
  }
  return { repaired: true, chapters: before.length };
}
