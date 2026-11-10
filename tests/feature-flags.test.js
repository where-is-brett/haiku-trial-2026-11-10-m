// tests/feature-flags.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the edit-categories flag exists and is off', () => {
  const flags = JSON.parse(readFileSync(new URL('../config/feature-flags.json', import.meta.url), 'utf8'));
  assert.equal(flags['edit-categories'], false);
  assert.equal(flags['statement-import'], false);
});
