import { Router } from 'express';
import { createBibleWalletStore, WalletError } from '../utils/bible_wallet.js';

export function createBibleWalletRouter(db, options = {}) {
  const router = Router();
  let activeDb; let activeStore;
  const store = () => {
    const currentDb = typeof db === 'function' ? db() : db;
    if (currentDb !== activeDb) { activeStore = createBibleWalletStore(currentDb, options); activeDb = currentDb; }
    return activeStore;
  };
  const creations = new Map();
  router.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
    next();
  });
  const handle = operation => (req, res) => {
    try { res.json(operation(req)); }
    catch (error) {
      if (error instanceof WalletError && error.status === 410) store().cleanup();
      if (!(error instanceof WalletError)) console.error('[Bible wallet]', error.message);
      res.status(error instanceof WalletError ? error.status : 500)
        .json({ success: false, error: error instanceof WalletError ? error.message : 'تعذر حفظ المحفظة. حاول مرة أخرى.' });
    }
  };
  router.post('/', handle(req => {
    const now = Date.now();
    for (const [key, value] of creations) if (value.until <= now) creations.delete(key);
    const key = req.ip; const limit = creations.get(key) || { count: 0, until: now + 3600000 };
    if (limit.count >= 30) throw new WalletError(429, 'أنشأت محافظ كثيرة خلال ساعة؛ حاول لاحقاً.');
    const result = store().create(req.body);
    limit.count++; creations.set(key, limit); return result;
  }));
  router.get('/:token', handle(req => store().read(req.params.token)));
  router.post('/:token/items', handle(req => store().add(req.params.token, req.body)));
  router.patch('/:token/items/:id', handle(req => store().change(req.params.token, req.params.id, req.body)));
  router.delete('/:token/items/:id', handle(req => store().change(req.params.token, req.params.id, null, true)));
  router.post('/:token/extend', handle(req => store().extend(req.params.token)));
  router.post('/:token/rotate', handle(req => store().rotate(req.params.token)));
  router.delete('/:token', handle(req => store().remove(req.params.token)));
  return router;
}
