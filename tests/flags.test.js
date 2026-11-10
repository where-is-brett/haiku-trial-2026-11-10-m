import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { flagOn } from '../src/lib/flags.js';

const tmpDir = fileURLToPath(new URL('../.wheelhouse/tmp/', import.meta.url));
let counter = 0;

function fixture(obj) {
  mkdirSync(tmpDir, { recursive: true });
  const path = `${tmpDir}flags-${process.pid}-${counter++}.json`;
  writeFileSync(path, JSON.stringify(obj));
  return path;
}

test('a flag set to true is on', () => {
  assert.equal(flagOn('statement-import', fixture({ 'statement-import': true })), true);
});

test('a flag set to false is off', () => {
  assert.equal(flagOn('statement-import', fixture({ 'statement-import': false })), false);
});

test('a flag not in the file is off', () => {
  assert.equal(flagOn('statement-import', fixture({})), false);
});

test('the default file has statement-import off', () => {
  assert.equal(flagOn('statement-import'), false);
});
