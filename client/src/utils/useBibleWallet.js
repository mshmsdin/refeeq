import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from './apiUrls';

const STORAGE_KEY = `bible-wallet-editor:${import.meta.env.BASE_URL}`;
const API = apiUrl('/api/bible/wallets');
function storedToken() { try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; } }
function remember(token) { try { token ? localStorage.setItem(STORAGE_KEY, token) : localStorage.removeItem(STORAGE_KEY); } catch { /* Link remains usable without local storage. */ } }

export function useBibleWallet(initialToken) {
  const [token, setToken] = useState(() => initialToken || storedToken());
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [offset, setOffset] = useState(0);
  const [expiryReached, setExpiryReached] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const locked = useRef(false);
  const requestVersion = useRef(0);
  const accept = useCallback(result => {
    setData(result); setOffset(result.serverNow - Date.now()); setExpiryReached(false); setUnavailable(false); setError('');
    if (result.isEditor) remember(result.editToken);
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => setExpiryReached(true), Math.max(0, data.expiresAt - Date.now() - offset));
    return () => clearTimeout(timer);
  }, [data, offset]);
  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    setData(null); setError(''); setUnavailable(false);
    if (!token) { setBusy(false); return () => controller.abort(); }
    setBusy(true);
    fetch(`${API}/${encodeURIComponent(token)}`, { signal: controller.signal, cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(async res => {
        const result = await res.json();
        if (version !== requestVersion.current) return;
        if (!res.ok || !result.success) {
          if (res.status === 404 || res.status === 410) {
            if (storedToken() === token) remember('');
            setUnavailable(true);
          }
          throw new Error(result.error || 'تعذر فتح المحفظة.');
        }
        accept(result);
      })
      .catch(err => { if (err.name !== 'AbortError' && version === requestVersion.current) setError(err.message || 'تعذر الاتصال بالخادم.'); })
      .finally(() => { if (version === requestVersion.current) setBusy(false); });
    return () => controller.abort();
  }, [token, accept, reloadKey]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  const remaining = data ? Math.max(0, data.expiresAt - Date.now() - offset) : 0;
  const expired = Boolean(data && (expiryReached || remaining <= 0));
  const selectToken = useCallback(nextToken => {
    requestVersion.current++; setData(null); setUnavailable(false); setToken(nextToken); setReloadKey(value => value + 1);
  }, []);
  const perform = useCallback(async (path, method, body) => {
    if (locked.current) return null;
    const version = requestVersion.current;
    locked.current = true; setBusy(true); setError('');
    try {
      const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' },
        cache: 'no-store', referrerPolicy: 'no-referrer', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await res.json();
      if (version !== requestVersion.current) return null;
      if (!res.ok || !result.success) throw new Error(result.error || 'تعذر حفظ التعديل.');
      if (result.items) accept(result);
      return result;
    } catch (err) { if (version === requestVersion.current) setError(err.message || 'تعذر الاتصال بالخادم. حاول مرة أخرى.'); return null; }
    finally { locked.current = false; if (version === requestVersion.current) setBusy(false); }
  }, [accept]);
  const add = async snapshot => {
    if (!data && token && !unavailable) { setError('تعذر التحقق من المحفظة الحالية. افتح المحفظة وانقر إعادة المحاولة.'); return null; }
    if (data && !expired && !data.isEditor) { setError('رابط المشاهدة لا يسمح بإضافة عناصر. افتح رابط التحرير.'); return null; }
    const creating = !data || expired;
    const result = await perform(creating ? '' : `/${token}/items`, 'POST', { snapshot });
    if (result) { if (creating) setToken(result.editToken); setMessage('أُضيف النص إلى المحفظة مع الترجمات المختارة.'); }
    return result;
  };
  const update = (id, body) => perform(`/${token}/items/${id}`, 'PATCH', body);
  const removeItem = id => perform(`/${token}/items/${id}`, 'DELETE');
  const extend = async () => { const result = await perform(`/${token}/extend`, 'POST'); if (result) setMessage(result.message); };
  const rotate = async () => {
    const result = await perform(`/${token}/rotate`, 'POST');
    if (result) { setToken(result.editToken); setMessage('تغيّر الرابطان وأصبح الرابطان القديمان غير صالحين.'); }
    return result;
  };
  const remove = async () => {
    const result = await perform(`/${token}`, 'DELETE');
    if (result) { remember(''); setToken(''); setData(null); setMessage('حُذفت المحفظة.'); }
    return result;
  };
  return { token, selectToken, data, busy, error, message, setMessage, remaining, expired, offset,
    reload: () => { requestVersion.current++; setReloadKey(value => value + 1); },
    count: expired ? 0 : data?.items?.length || 0, add, update, removeItem, extend, rotate, remove };
}
