// tests/transactions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureSchema, setCategory } from '../src/lib/transactions.js';

const OLD_TABLE =
  'CREATE TABLE transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER)';

function columnNames(db) {
  return db.prepare('PRAGMA table_info(transactions)').all().map((c) => c.name);
}

test('an old database gains the category column and keeps its rows', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(OLD_TABLE);
  db.exec("INSERT INTO transactions (date, description, cents) VALUES ('2026-08-03', 'Pasta night', 1250)");

  ensureSchema(db);

  assert.ok(columnNames(db).includes('category'));
  // node:sqlite rows have a null prototype; copy them so deepStrictEqual compares plain objects.
  const rows = db.prepare('SELECT date, description, cents FROM transactions').all().map((r) => ({ ...r }));
  assert.deepEqual(rows, [{ date: '2026-08-03', description: 'Pasta night', cents: 1250 }]);
});

test('running the migration again does nothing and raises no error', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(OLD_TABLE);
  ensureSchema(db);

  assert.doesNotThrow(() => ensureSchema(db));
  assert.equal(columnNames(db).filter((n) => n === 'category').length, 1);
});

test('a fresh database gets the table with the category column', () => {
  const db = new DatabaseSync(':memory:');
  ensureSchema(db);
  assert.deepEqual(columnNames(db), ['id', 'date', 'description', 'cents', 'category']);
});

function seededDb() {
  const db = new DatabaseSync(':memory:');
  ensureSchema(db);
  db.prepare('INSERT INTO transactions (id, date, description, cents) VALUES (?, ?, ?, ?)').run(
    1,
    '2026-08-04',
    'Greenbarrow Fresh',
    4500
  );
  return db;
}

function rawCategory(db, id) {
  return db.prepare('SELECT category FROM transactions WHERE id = ?').get(id).category;
}

test('setting an unknown category key throws and saves nothing', () => {
  const db = seededDb();
  assert.throws(() => setCategory(db, 1, 'snacks'), /Unknown category: snacks/);
  assert.equal(rawCategory(db, 1), null);
});

test('a category key in another case or with spaces is refused', () => {
  const db = seededDb();
  assert.throws(() => setCategory(db, 1, 'Groceries'), /Unknown category/);
  assert.throws(() => setCategory(db, 1, ' groceries'), /Unknown category/);
  assert.equal(rawCategory(db, 1), null);
});

test('an id given as text finds the same row', () => {
  const db = seededDb();
  setCategory(db, '1', 'bills');
  assert.equal(rawCategory(db, 1), 'bills');
});

test('an unknown id throws', () => {
  const db = seededDb();
  assert.throws(() => setCategory(db, 99, 'bills'), /No transaction with id 99/);
});
