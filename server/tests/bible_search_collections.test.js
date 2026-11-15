import test from 'node:test';
import assert from 'node:assert/strict';
import { expandBibleSearchCollections } from '../utils/bible_search_collections.js';

test('the apocrypha search scope includes deuterocanonical and pseudepigraphal books', () => {
  assert.deepEqual(
    expandBibleSearchCollections(['old-testament', 'new-testament', 'apocrypha']),
    ['old-testament', 'new-testament', 'apocrypha', 'deuterocanon', 'pseudepigrapha']
  );
});

test('the testament search scopes stay unchanged when apocrypha is not selected', () => {
  assert.deepEqual(
    expandBibleSearchCollections(['old-testament', 'new-testament']),
    ['old-testament', 'new-testament']
  );
});
