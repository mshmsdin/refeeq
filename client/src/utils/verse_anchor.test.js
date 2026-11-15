import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseVerseHash } from './verse_anchor.js';

// يحمّل وحدة المسارات كما تفعل اختبارات المحفظة: بدون حزمة، مع ضبط متغيرات البناء.
async function routes(bibleOnly) {
  let source = await fs.readFile(new URL('./urlRoutes.js', import.meta.url), 'utf8');
  source = source.replaceAll('import.meta.env.BASE_URL', JSON.stringify(bibleOnly ? '/bible/' : '/rafeeq/'))
    .replaceAll('import.meta.env.VITE_BIBLE_ONLY', JSON.stringify(String(bibleOnly)));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('يقرأ رقم العدد من الجزء بعد # بصيغه المعتادة', () => {
  assert.equal(parseVerseHash('#21'), 21);
  assert.equal(parseVerseHash('#v21'), 21);
  assert.equal(parseVerseHash('#V5'), 5);
  assert.equal(parseVerseHash('#verse-7'), 7);
  assert.equal(parseVerseHash('#verse12'), 12);
  assert.equal(parseVerseHash(' #3 '), 3);
});

test('يتجاهل ما ليس رقم عدد صالحاً', () => {
  for (const value of ['', '#', '#0', '#abc', '#21a', '#-3', '#1000', '#21-25', null, undefined, '21']) {
    assert.equal(parseVerseHash(value), null, String(value));
  }
});

test('يُبقي الجزء بعد # عند تغيّر المتغيرات فقط في الإصحاح نفسه', async () => {
  const { resolveBibleUrlWithHash } = await routes(true);
  const loc = { pathname: '/bible/2ES/14', hash: '#21' };
  assert.equal(resolveBibleUrlWithHash('/bible/2ES/14?translations=ar-mohammad-2es', loc), '/bible/2ES/14?translations=ar-mohammad-2es#21');
  assert.equal(resolveBibleUrlWithHash('/bible/2ES/14', loc), '/bible/2ES/14#21');
});

test('يُسقط الجزء بعد # عند الانتقال إلى مسار آخر أو حين لا جزء', async () => {
  const { resolveBibleUrlWithHash } = await routes(true);
  assert.equal(resolveBibleUrlWithHash('/bible/2ES/15?translations=x', { pathname: '/bible/2ES/14', hash: '#21' }), '/bible/2ES/15?translations=x');
  assert.equal(resolveBibleUrlWithHash('/bible/2ES/14/21', { pathname: '/bible/2ES/14', hash: '#21' }), '/bible/2ES/14/21');
  assert.equal(resolveBibleUrlWithHash('/bible/2ES/14', { pathname: '/bible/2ES/14', hash: '' }), '/bible/2ES/14');
});

test('قراءة مسار الإصحاح تتجاهل الجزء بعد # (النسختان المدمجة والمستقلة)', async () => {
  for (const standalone of [false, true]) {
    const { buildBibleUrl } = await routes(standalone);
    const url = buildBibleUrl({ book: '2ES', chapter: 14 });
    assert.ok(url.endsWith('/2ES/14') && !url.includes('#'), `${standalone ? 'standalone' : 'embedded'}: ${url}`);
  }
});
