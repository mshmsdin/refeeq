import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBooks, selectSources } from './source_selection.js';

const sources = [
  { slug: 'en-charles-enoch', bookCode: 'ENO' },
  { slug: 'en-zinner-mattison-odes-solomon', bookCode: 'ODSO' },
];

test('selects only the requested source', () => {
  assert.deepEqual(selectSources(sources, 'en-zinner-mattison-odes-solomon'), [sources[1]]);
});

test('rejects unknown source slugs', () => {
  assert.throws(() => selectSources(sources, 'missing'), /مصدر غير معروف/);
});

test('selects an individual book by canonical code', () => {
  assert.deepEqual(selectBooks(sources, 'ODSO'), [sources[1]]);
});
