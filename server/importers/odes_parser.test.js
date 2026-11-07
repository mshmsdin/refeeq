import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOdesSolomonWikisource } from './import_noncanonical_english.js';

test('keeps the Ode number in the title when the section label is stale', () => {
  const content = Array.from({ length: 42 }, (_, index) => {
    const ode = index + 1;
    const section = ode === 23 ? 2 : ode;
    const previous = ode > 1 ? `|previous=[[../Ode ${ode - 1}|Ode ${ode - 1}]]\n` : '';
    const next = ode < 42 ? `|next=[[../Ode ${ode + 1}|Ode ${ode + 1}]]\n` : '';
    const note = ode === 1 ? '|notes=A reconstruction from Ode 11:16\n' : '';
    return `{{header\n|title=[[../]] Ode ${ode}\n${previous}${next}|section=Ode ${section}\n${note}}}\n==Syriac text==\n{{verse|verse=1}} This is a complete test verse for Ode ${ode}.\n`;
  }).join('\n');
  const apiResponse = JSON.stringify({ parse: { wikitext: { '*': content } } });
  const rows = parseOdesSolomonWikisource(apiResponse, { slug: 'fixture', maxChapter: 42, witness: 'syriac' });
  assert.equal(new Set(rows.map((row) => row.chapter)).size, 42);
  assert.deepEqual(
    [...new Set(rows.map((row) => row.chapter))].sort((a, b) => a - b),
    Array.from({ length: 42 }, (_, index) => index + 1)
  );
});
