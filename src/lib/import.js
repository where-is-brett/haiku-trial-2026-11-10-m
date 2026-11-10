// src/lib/import.js
import { readStatement } from './statement.js';

// Adds the rows of a statement to the ledger in one transaction. A row is skipped when a row stored before
// this upload began matches its date, description and cents. Rows added earlier in the same upload do not count.
// Throws NotAStatement before any write if the text is not a readable statement.
export function importStatement(db, text) {
  const rows = readStatement(text);
  const keyOf = (row) => JSON.stringify([row.date, row.description, row.cents]);

  const stored = new Set();
  for (const row of db.prepare('SELECT date, description, cents FROM transactions').all()) {
    stored.add(keyOf(row));
  }

  const insert = db.prepare('INSERT INTO transactions (date, description, cents) VALUES (?, ?, ?)');
  let added = 0;
  let skipped = 0;

  db.exec('BEGIN');
  try {
    for (const row of rows) {
      if (stored.has(keyOf(row))) {
        skipped += 1;
      } else {
        insert.run(row.date, row.description, row.cents);
        added += 1;
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { added, skipped };
}
