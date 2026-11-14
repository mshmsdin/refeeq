import { createHash, randomInt } from 'node:crypto';

const HOUR = 3600000;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const digest = token => createHash('sha256').update(token).digest('hex');
const newToken = () => Array.from({ length: 14 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

export class WalletError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createBibleWalletStore(db, { now = Date.now, scope = 'bible' } = {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bible_wallets (
      id INTEGER PRIMARY KEY, edit_hash TEXT NOT NULL UNIQUE,
      view_hash TEXT NOT NULL UNIQUE, view_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bible_wallet_expiry ON bible_wallets(expires_at);
    CREATE TABLE IF NOT EXISTS bible_wallet_items (
      id INTEGER PRIMARY KEY, wallet_id INTEGER NOT NULL REFERENCES bible_wallets(id) ON DELETE CASCADE,
      position INTEGER NOT NULL, label TEXT NOT NULL, excerpt TEXT NOT NULL,
      book_name TEXT NOT NULL, snapshot TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bible_wallet_items ON bible_wallet_items(wallet_id, position);
  `);
  const fail = (status, message) => { throw new WalletError(status, message); };
  const cleanup = () => db.prepare('DELETE FROM bible_wallets WHERE expires_at <= ?').run(now());
  function resolve(token, edit = false) {
    if (!/^[A-Za-z0-9]{14}$/.test(token || '')) fail(404, 'رابط المحفظة غير صالح.');
    const hash = digest(token);
    const row = db.prepare('SELECT * FROM bible_wallets WHERE edit_hash = ? OR view_hash = ?').get(hash, hash);
    if (!row) { cleanup(); fail(404, 'المحفظة غير موجودة أو انتهت مدتها أو تغيّر رابطها.'); }
    if (row.expires_at <= now()) { cleanup(); fail(410, 'انتهت مدة المحفظة. أضف نصاً لإنشاء محفظة جديدة.'); }
    const isEditor = row.edit_hash === hash;
    if (edit && !isEditor) fail(403, 'هذا رابط مشاهدة فقط؛ يلزم رابط التحرير لإجراء التعديلات.');
    return { ...row, isEditor };
  }
  function read(token) {
    const row = resolve(token);
    return {
      success: true, isEditor: row.isEditor, expiresAt: row.expires_at, serverNow: now(),
      ...(row.isEditor ? { editToken: token, viewToken: row.view_token } : {}),
      items: db.prepare('SELECT * FROM bible_wallet_items WHERE wallet_id = ? ORDER BY position, id').all(row.id)
        .map(item => ({ id: item.id, position: item.position, label: item.label, excerpt: item.excerpt, bookName: item.book_name, snapshot: JSON.parse(item.snapshot) }))
    };
  }
  function label(value, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) fail(400, 'اكتب تسمية من حرف إلى ٢٠٠ حرف.');
    return value.trim();
  }
  function prepareItem(body) {
    const s = body?.snapshot;
    if (!s || typeof s.book !== 'string' || !Array.isArray(s.translations) || !s.translations.length || s.translations.length > 100
      || s.translations.some(slug => typeof slug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(slug))
      || new Set(s.translations).size !== s.translations.length) fail(400, 'موضع النص أو الترجمات غير صالح.');
    const chapter = s.chapter ?? null; const verse = s.verse ?? null;
    if ((chapter !== null && (!Number.isSafeInteger(chapter) || chapter < 1))
      || (verse !== null && (!Number.isSafeInteger(verse) || verse < 1 || chapter === null))) fail(400, 'رقم الإصحاح أو العدد غير صالح.');
    const book = db.prepare(`SELECT b.name_ar FROM bible_books b JOIN bible_collections c ON c.id=b.collection_id
      WHERE b.code=? AND (c.site_scope='both' OR c.site_scope=?)`).get(s.book, scope);
    if (!book) fail(400, 'هذا السفر غير متاح في هذه النسخة.');
    let excerpt;
    for (const slug of s.translations) {
      const tr = db.prepare("SELECT id FROM bible_translations WHERE slug=? AND is_active=1 AND (site_scope='both' OR site_scope=?)").get(slug, scope);
      if (!tr) fail(400, 'إحدى الترجمات المختارة غير متاحة.');
      const text = db.prepare(`SELECT text FROM bible_verses WHERE book_code=? AND translation_id=?
        ${chapter === null ? '' : 'AND chapter=?'} ${verse === null ? '' : 'AND verse=?'} ORDER BY chapter, verse LIMIT 1`)
        .get(s.book, tr.id, ...(chapter === null ? [] : [chapter]), ...(verse === null ? [] : [verse]));
      if (excerpt === undefined && text) excerpt = text.text.slice(0, 220);
    }
    if (excerpt === undefined) fail(400, 'لا يوجد نص محفوظ في هذا الموضع بالترجمات المختارة.');
    const fallback = `${book.name_ar}${chapter === null ? '' : ` ${chapter}`}${verse === null ? '' : `:${verse}`}`;
    return { label: label(body.label, fallback), excerpt, bookName: book.name_ar,
      snapshot: { book: s.book, chapter, verse, translations: s.translations } };
  }
  function insert(walletId, item) {
    const count = db.prepare('SELECT COUNT(*) AS n FROM bible_wallet_items WHERE wallet_id=?').get(walletId).n;
    if (count >= 300) fail(400, 'وصلت المحفظة إلى الحد الأقصى وهو ٣٠٠ عنصر.');
    db.prepare('INSERT INTO bible_wallet_items(wallet_id,position,label,excerpt,book_name,snapshot) VALUES (?,?,?,?,?,?)')
      .run(walletId, count + 1, item.label, item.excerpt, item.bookName, JSON.stringify(item.snapshot));
  }
  const create = db.transaction(body => {
    const item = prepareItem(body); cleanup();
    const editToken = newToken(); let viewToken = newToken();
    while (editToken === viewToken) viewToken = newToken();
    const result = db.prepare('INSERT INTO bible_wallets(edit_hash,view_hash,view_token,expires_at) VALUES (?,?,?,?)')
      .run(digest(editToken), digest(viewToken), viewToken, now() + 48 * HOUR);
    insert(result.lastInsertRowid, item);
    return read(editToken);
  });
  const add = db.transaction((token, body) => { const row = resolve(token, true); insert(row.id, prepareItem(body)); return read(token); });
  function itemIds(walletId) { return db.prepare('SELECT id FROM bible_wallet_items WHERE wallet_id=? ORDER BY position,id').all(walletId).map(x => x.id); }
  function reorder(ids) { const update = db.prepare('UPDATE bible_wallet_items SET position=? WHERE id=?'); ids.forEach((id, i) => update.run(i + 1, id)); }
  const change = db.transaction((token, id, body, remove = false) => {
    const row = resolve(token, true); const ids = itemIds(row.id); const index = ids.indexOf(Number(id));
    if (index < 0) fail(404, 'العنصر غير موجود في المحفظة.');
    if (remove) { db.prepare('DELETE FROM bible_wallet_items WHERE id=?').run(ids[index]); ids.splice(index, 1); }
    else {
      if (!body || (body.label === undefined && body.position === undefined)) fail(400, 'لا يوجد تعديل لحفظه.');
      if (body.label !== undefined) db.prepare('UPDATE bible_wallet_items SET label=? WHERE id=?').run(label(body.label), ids[index]);
      if (body.position !== undefined) {
        if (!Number.isSafeInteger(body.position) || body.position < 1 || body.position > ids.length) fail(400, 'اختر رقماً داخل ترتيب القائمة.');
        const [moved] = ids.splice(index, 1); ids.splice(body.position - 1, 0, moved);
      }
    }
    reorder(ids); return read(token);
  });
  const extend = db.transaction(token => {
    const row = resolve(token, true); const target = now() + 24 * HOUR; const extended = row.expires_at < target;
    if (extended) db.prepare('UPDATE bible_wallets SET expires_at=? WHERE id=?').run(target, row.id);
    return { ...read(token), extended, message: extended ? 'أصبحت المدة المتبقية ٢٤ ساعة.' : row.expires_at > target ? 'الوقت الباقي لك أكثر من ٢٤ ساعة.' : 'الوقت الباقي لك ٢٤ ساعة بالفعل.' };
  });
  const rotate = db.transaction(token => {
    const row = resolve(token, true); const editToken = newToken(); let viewToken = newToken();
    while (viewToken === editToken) viewToken = newToken();
    db.prepare('UPDATE bible_wallets SET edit_hash=?,view_hash=?,view_token=? WHERE id=?')
      .run(digest(editToken), digest(viewToken), viewToken, row.id);
    return read(editToken);
  });
  const remove = db.transaction(token => {
    const row = resolve(token, true); db.prepare('DELETE FROM bible_wallets WHERE id=?').run(row.id); return { success: true };
  });
  return { read, create, add, change, extend, rotate, remove, cleanup };
}
