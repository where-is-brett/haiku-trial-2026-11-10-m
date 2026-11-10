// src/lib/transactions.js

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
