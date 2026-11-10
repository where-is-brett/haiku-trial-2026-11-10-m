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

test('statement refuses a bad date with its line number', () => {
  const text = 'Date,Description,Amount\n02/08/2026,Shop,1.00\n\n31-08-2026,Shop,2.00\n';
  assert.throws(
    () => readStatement(text),
    { name: 'NotAStatement', message: "Line 4 isn't a valid date: 31-08-2026." },
  );
});

test('statement refuses a date that is not a real day', () => {
  assert.throws(
    () => readStatement('Date,Description,Amount\n31/02/2026,Shop,1.00\n'),
    { name: 'NotAStatement', message: "Line 2 isn't a valid date: 31/02/2026." },
  );
});

test('statement refuses an empty date as a bad date', () => {
  assert.throws(
    () => readStatement('Date,Description,Amount\n,Shop,1.00\n'),
    { name: 'NotAStatement', message: "Line 2 isn't a valid date: ." },
  );
});

test('statement refuses an amount that is not a number', () => {
  assert.throws(
    () => readStatement('Date,Description,Amount\n02/08/2026,Shop,abc\n'),
    { name: 'NotAStatement', message: "Line 2 isn't a valid amount: abc." },
  );
});

test('statement refuses an empty amount', () => {
  assert.throws(
    () => readStatement('Date,Description,Amount\n02/08/2026,Shop,\n'),
    { name: 'NotAStatement', message: "Line 2 isn't a valid amount: ." },
  );
});

test('statement refuses a lone bracket in an amount', () => {
  assert.throws(
    () => readStatement('Date,Description,Amount\n02/08/2026,Shop,(40.00\n'),
    { name: 'NotAStatement', message: "Line 2 isn't a valid amount: (40.00." },
  );
  assert.throws(
    () => readStatement('Date,Description,Amount\n02/08/2026,Shop,40.00)\n'),
    { name: 'NotAStatement', message: "Line 2 isn't a valid amount: 40.00)." },
  );
});
