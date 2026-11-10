// tests/statement.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readStatement, NotAStatement } from '../src/lib/statement.js';

test('statement reads the sample file', () => {
  const rows = readStatement(readFileSync('data/sample-statement.csv', 'utf8'));
  assert.equal(rows.length, 128);
  assert.deepEqual(rows[0], { date: '2026-08-02', description: 'Skyline Broadband REF 0617', cents: 858 });
  assert.deepEqual(rows.at(-1), { date: '2026-10-31', description: 'Marlowe Homewares MONTH END', cents: 17391 });
});

test('statement refuses a file without the Date, Description, Amount header', () => {
  assert.throws(
    () => readStatement('Date,Payee,Amount\n02/08/2026,Shop,1.00\n'),
    { name: 'NotAStatement', message: "This isn't a bank statement: the first line should be Date, Description, Amount." },
  );
});

test('statement reads quoted descriptions and CRLF lines', () => {
  const text = 'Date,Description,Amount\r\n06/08/2026,"Pasta, Pizza & Co ""Late""",102.29\r\n';
  assert.deepEqual(readStatement(text), [
    { date: '2026-08-06', description: 'Pasta, Pizza & Co "Late"', cents: 10229 },
  ]);
});

test('statement skips blank lines and ignores a byte-order mark', () => {
  const text = '﻿Date,Description,Amount\n\n02/08/2026,Shop,1.00\n\n';
  assert.deepEqual(readStatement(text), [{ date: '2026-08-02', description: 'Shop', cents: 100 }]);
});

test('an empty file is refused', () => {
  assert.throws(() => readStatement(''), NotAStatement);
});
