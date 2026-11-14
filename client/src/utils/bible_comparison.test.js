import test from 'node:test';
import assert from 'node:assert/strict';
import { orderVerseResults } from './bible_comparison.js';

test('renders comparison in saved selection order even when the catalog returns the reverse order', () => {
  const results=[{translation_slug:'ar-svd',text:'الأول في الفهرس'},{translation_slug:'ar-nav',text:'الثاني في الفهرس'}];
  const ordered=orderVerseResults(results,['ar-nav','ar-svd']);
  assert.deepEqual(ordered.map(x=>x.text),['الثاني في الفهرس','الأول في الفهرس']);
  assert.deepEqual(ordered.filter(x=>x.translation_slug!=='ar-nav').map(x=>x.translation_slug),['ar-svd']);
});
