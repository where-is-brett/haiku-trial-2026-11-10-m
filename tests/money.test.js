// tests/money.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount } from '../src/lib/money.js';

test('an amount in brackets reads as negative', () => {
  assert.equal(parseAmount('(40.00)'), -4000);
  assert.equal(parseAmount('(40.00)'), parseAmount('-40.00'));
});

test('a plain amount is still positive', () => {
  assert.equal(parseAmount('12.50'), 1250);
});
