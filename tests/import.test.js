// tests/import.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NotAStatement } from '../src/lib/statement.js';
import { openLedger } from '../src/lib/ledger.js';
import { importStatement } from '../src/lib/import.js';

function count(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
}

test('importing a statement adds its rows', () => {
  const db = openLedger(':memory:');
  assert.deepEqual(importStatement(db, readFileSync('data/sample-statement.csv', 'utf8')), { added: 128, skipped: 0 });
  assert.equal(count(db), 128);
});

test('importing the same statement again adds nothing', () => {
  const db = openLedger(':memory:');
  const text = readFileSync('data/sample-statement.csv', 'utf8');
  importStatement(db, text);
  assert.deepEqual(importStatement(db, text), { added: 0, skipped: 128 });
  assert.equal(count(db), 128);
});

test('a non-statement upload adds no rows', () => {
  const db = openLedger(':memory:');
  assert.throws(() => importStatement(db, 'Name,Total\nShop,1.00\n'), NotAStatement);
  assert.equal(count(db), 0);
});

test('a bad row in the middle adds no rows', () => {
  const db = openLedger(':memory:');
  const text = 'Date,Description,Amount\n02/08/2026,Shop,1.00\n31/02/2026,Shop,2.00\n';
  assert.throws(() => importStatement(db, text), NotAStatement);
  assert.equal(count(db), 0);
});

test('repeats within one statement are both kept', () => {
  const db = openLedger(':memory:');
  const text = 'Date,Description,Amount\n02/08/2026,Shop,5.00\n02/08/2026,Shop,5.00\n';
  assert.deepEqual(importStatement(db, text), { added: 2, skipped: 0 });
  assert.equal(count(db), 2);
  assert.deepEqual(importStatement(db, text), { added: 0, skipped: 2 });
});
