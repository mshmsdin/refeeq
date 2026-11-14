import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEarlyChristianFragmentHtml } from './import_noncanonical_english.js';

test('early Christian imports restrict parsing to the article and remove page chrome', () => {
  const witness = 'The witness text is preserved. '.repeat(24);
  const html = `
    <head><title>THE ACTS OF PAUL</title><style>body { behavior: url("csshover.txt"); }</style></head>
    <body>
      <div id="textboundingbox">
        <h3>THE ACTS OF PAUL</h3>
        <p>${witness}</p>
        <script>window.adCode = true;</script>
      </div>
      <div id="footer">THE ACTS OF PAUL navigation</div>
    </body>`;
  const rows = parseEarlyChristianFragmentHtml(html, {
    slug: 'en-mr-james-acts-paul',
    startMarker: 'THE ACTS OF PAUL',
    url: 'https://example.org/acts-paul',
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].chapter, 1);
  assert.match(rows[0].text, /The witness text is preserved/);
  assert.doesNotMatch(rows[0].text, /csshover|adCode|navigation|behavior:/i);
});
