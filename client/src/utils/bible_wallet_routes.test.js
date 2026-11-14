import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Load Vite's pure routing module under both build settings without a bundler.
async function routes(bibleOnly) {
  let source = await fs.readFile(new URL('./urlRoutes.js', import.meta.url), 'utf8');
  source = source.replaceAll('import.meta.env.BASE_URL', JSON.stringify(bibleOnly ? '/bible/' : '/rafeeq/'))
    .replaceAll('import.meta.env.VITE_BIBLE_ONLY', JSON.stringify(String(bibleOnly)));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
for (const standalone of [false,true]) test(`reader and wallet route round trip (${standalone ? 'standalone' : 'embedded'})`, async () => {
  const r = await routes(standalone);
  const prefix = standalone ? '/bible' : '/rafeeq/bible';
  assert.equal(typeof r.buildBibleWalletUrl, 'function');
  assert.equal(r.buildBibleWalletUrl('Ab12Cd34Ef56Gh'), prefix + '/wallet/Ab12Cd34Ef56Gh');
  globalThis.window = { location: { pathname: prefix + '/wallet/Ab12Cd34Ef56Gh', search: '' } };
  assert.equal(r.parseCurrentRoute().bibleWallet, 'Ab12Cd34Ef56Gh');
  const url = r.buildBibleUrl({book:'MAT',chapter:5,verse:3,translations:['ar-nav','ar-svd']});
  const parsed = new URL(url, 'https://example.test');
  window.location = {pathname:parsed.pathname,search:parsed.search};
  assert.equal(r.parseCurrentRoute().bibleVerse,3);
  assert.deepEqual(r.readBibleTranslations(),['ar-nav','ar-svd']);
  window.location.search='?translations=ar-svd,%3Cscript%3E';
  assert.deepEqual(r.readBibleTranslations(),[]);
  const book = r.buildBibleUrl({book:'MAT',translations:['ar-svd','ar-nav']});
  assert.equal(new URL(book,'https://example.test').pathname,prefix+'/MAT');
});

for (const standalone of [false,true]) test(`Bible search URL round trip (${standalone ? 'standalone' : 'embedded'})`, async () => {
  const r = await routes(standalone);
  const prefix = standalone ? '/bible' : '/rafeeq/bible';
  const url = r.buildBibleSearchUrl('تقييم لنفسك حجارة كبيرة وتشيدها');
  const parsed = new URL(url, 'https://example.test');
  assert.equal(parsed.pathname, prefix + '/search');
  assert.equal(parsed.searchParams.get('q'), 'تقييم لنفسك حجارة كبيرة وتشيدها');
  window.location = {pathname:parsed.pathname, search:parsed.search};
  assert.equal(r.parseCurrentRoute().bibleSearch, 'تقييم لنفسك حجارة كبيرة وتشيدها');
});
