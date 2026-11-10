// src/lib/transactions.js

import { CATEGORIES, categoryOf } from './categories.js';

// Creates the transactions table if it is absent, and adds the category
// column to an older table that lacks it. Safe to run on every start.
export function ensureSchema(db) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER, category TEXT)'
  );
  const columns = db.prepare('PRAGMA table_info(transactions)').all();
  if (!columns.some((c) => c.name === 'category')) {
    db.exec('ALTER TABLE transactions ADD COLUMN category TEXT');
  }
}

// Sets a transaction's category. The key must be exactly one of the
// CATEGORIES keys; the check runs before any write. An id may be a number or
// text such as '1': the id column has integer affinity, so both find the row.
export function setCategory(db, id, key) {
  if (!CATEGORIES.some((c) => c.key === key)) {
    throw new Error(`Unknown category: ${key}`);
  }
  const result = db.prepare('UPDATE transactions SET category = ? WHERE id = ?').run(key, id);
  if (result.changes === 0) {
    throw new Error(`No transaction with id ${id}`);
  }
}

// Reads a transaction. The category is the stored key when one is set, and
// otherwise the rule's category for the description. Returns null when no row
// matches the id. Never writes.
export function getTransaction(db, id) {
  const row = db
    .prepare('SELECT id, date, description, cents, category FROM transactions WHERE id = ?')
    .get(id);
  if (row === undefined) {
    return null;
  }
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    cents: row.cents,
    category: row.category ?? categoryOf(row.description),
  };
}
