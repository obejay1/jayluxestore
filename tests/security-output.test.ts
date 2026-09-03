import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeCsv, escapeHtml, neutralizeSpreadsheetFormula } from '../lib/security/output.ts';

test('escapeHtml encodes executable markup and attributes', () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`), '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;');
});

test('CSV values that can become spreadsheet formulas are neutralized', () => {
  for (const dangerous of ['=2+2', '+SUM(1,2)', '-10+20', '@SUM(1,2)', '\t=1+1', '\r=1+1']) {
    assert.ok(neutralizeSpreadsheetFormula(dangerous).startsWith("'"));
  }
  assert.equal(escapeCsv('Jane "Jay" Doe'), '"Jane ""Jay"" Doe"');
});
