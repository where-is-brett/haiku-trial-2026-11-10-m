# Store a category per transaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each transaction can hold a category. Old databases gain the column and keep their rows; a chosen category is read back; an unchosen one falls back to the rule's category; an unknown key or id is refused.

**Architecture:** A new `src/lib/transactions.js` owns the `transactions` table's category column: `ensureSchema` adds the column when missing, `setCategory` validates and writes, `getTransaction` reads and falls back to `categoryOf`. No page or route changes in this slice; `src/server.js` is not touched.

**Tech Stack:** Node 22 (`node:sqlite` `DatabaseSync`, `node:test`, `node:assert/strict`), ESM. No new dependencies.

**Spec:** `.wheelhouse/feature/approved.md` (sections "Storing the category" and "Tests"; the slice's own `done` list in its wheelhouse-slices block).

## Global Constraints

- Node `>=22.13`, ESM modules, tests run with `node --test`. No new dependencies.
- Category keys are exactly the `key` values of `CATEGORIES` in `src/lib/categories.js`, in that order. Matching is exact: no case folding, no trimming.
- `transactions` columns after this slice: `id INTEGER PRIMARY KEY, date TEXT, description TEXT, cents INTEGER, category TEXT`. Dates ISO `YYYY-MM-DD`; amounts signed cents, spending positive.
- Tests use `new DatabaseSync(':memory:')`, never a file.
- `src/server.js` is not modified in this slice.

## Review Focus

- A category key in another case or with spaces (`Groceries`, ` groceries`) is refused and saves nothing. Pinned by Task 2.
- Running the migration on a database that already has the column does nothing and raises no error. Pinned by Task 1.
- An id that arrives as text (a form value, `'1'`) finds the same row as the number. Pinned by Task 2.
- A row whose description is `NULL` and that has no stored category reads `other` and does not throw. Pinned by Task 3.
- Reading an id that matches no row returns `null`, not a fallback row. Pinned by Task 3.

---

### Task 1: Add the category column to an old database

**Files:**
- Create: `src/lib/transactions.js`
- Create: `tests/transactions.test.js`

**Interfaces:**
- Consumes: `CATEGORIES` from `src/lib/categories.js` (not needed until Task 2).
- Produces: `ensureSchema(db: DatabaseSync): void`. Creates `transactions` if absent (with the category column), and adds `category TEXT` if the column is missing. Safe to call repeatedly. Existing rows are kept.

- [ ] **Step 1: Write the failing tests**

```js
// tests/transactions.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureSchema } from '../src/lib/transactions.js';

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
  const rows = db.prepare('SELECT date, description, cents FROM transactions').all();
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/transactions.test.js`
Expected: FAIL with "Cannot find module" for `src/lib/transactions.js`.

- [ ] **Step 3: Implement `ensureSchema` in `src/lib/transactions.js`**

Create the table with `CREATE TABLE IF NOT EXISTS` including `category TEXT`. Then read `PRAGMA table_info(transactions)`; if no column is named `category`, run `ALTER TABLE transactions ADD COLUMN category TEXT`. Plain `node:sqlite` calls, no wrapper.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/transactions.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactions.js tests/transactions.test.js
git commit -m "Add category column to transactions with an in-place migration"
```

---

### Task 2: Set a transaction's category

**Files:**
- Modify: `src/lib/transactions.js`
- Modify: `tests/transactions.test.js`

**Interfaces:**
- Consumes: `ensureSchema(db)` from Task 1; `CATEGORIES` from `src/lib/categories.js`.
- Produces: `setCategory(db: DatabaseSync, id: number | string, key: string): void`. Throws `Error` with message `Unknown category: <key>` when `key` is not exactly one of the `CATEGORIES` keys (checked first, so nothing is written). Throws `Error` with message `No transaction with id <id>` when no row matches. Otherwise sets `category` to `key`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/transactions.test.js`. Add `setCategory` to the import from `../src/lib/transactions.js`, and add a helper that opens an `ensureSchema`'d `:memory:` database with one row (id 1, `'Greenbarrow Fresh'`, `'2026-08-04'`, `-5000`... use cents `4500`).

```js
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
```

`rawCategory(db, id)` returns `db.prepare('SELECT category FROM transactions WHERE id = ?').get(id).category`. Define both helpers in the test file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/transactions.test.js`
Expected: FAIL, `setCategory` is not exported.

- [ ] **Step 3: Implement `setCategory` in `src/lib/transactions.js`**

Check the key against `CATEGORIES` by exact equality, throw on a miss. Then `UPDATE transactions SET category = ? WHERE id = ?` with `run(key, id)`; if `changes` is 0, throw the unknown-id error. The text id works without a conversion: the `id` column has integer affinity, so `WHERE id = ?` compares a text `'1'` as the integer 1.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/transactions.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactions.js tests/transactions.test.js
git commit -m "Set a transaction's category, refusing unknown keys and ids"
```

---

### Task 3: Read a transaction's category back, with the rule as fallback

**Files:**
- Modify: `src/lib/transactions.js`
- Modify: `tests/transactions.test.js`

**Interfaces:**
- Consumes: `ensureSchema`, `setCategory` (Tasks 1–2); `categoryOf(description: string | null): string` from `src/lib/categories.js`.
- Produces: `getTransaction(db: DatabaseSync, id: number | string): { id: number, date: string, description: string | null, cents: number, category: string } | null`. `category` is the stored key when it is not `NULL`, otherwise `categoryOf(description)`. Returns `null` when no row matches. Never writes.

- [ ] **Step 1: Write the failing tests**

Append to `tests/transactions.test.js`, adding `getTransaction` to the import:

```js
test('a stored category is read back', () => {
  const db = seededDb();
  setCategory(db, 1, 'bills');
  assert.equal(getTransaction(db, 1).category, 'bills');
});

test('a row with no category reads the rule\'s category', () => {
  const db = seededDb();
  assert.equal(getTransaction(db, 1).category, 'groceries');
});

test('a row with no description and no category reads other', () => {
  const db = new DatabaseSync(':memory:');
  ensureSchema(db);
  db.exec("INSERT INTO transactions (date, description, cents) VALUES ('2026-08-05', NULL, 300)");
  assert.equal(getTransaction(db, 1).category, 'other');
});

test('an id matching no row reads as null', () => {
  const db = seededDb();
  assert.equal(getTransaction(db, 99), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/transactions.test.js`
Expected: FAIL, `getTransaction` is not exported.

- [ ] **Step 3: Implement `getTransaction` in `src/lib/transactions.js`**

`SELECT id, date, description, cents, category FROM transactions WHERE id = ?`, `get(id)`. If there is no row, return `null`. Otherwise return the row with `category: row.category ?? categoryOf(row.description)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/transactions.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactions.js tests/transactions.test.js
git commit -m "Read a transaction's category back, falling back to the rule"
```

---

### Task 4: Add the edit-categories flag, off

**Files:**
- Modify: `config/feature-flags.json`
- Create: `tests/feature-flags.test.js`

**Interfaces:**
- Consumes: none.
- Produces: `config/feature-flags.json` gains `"edit-categories": false`. The existing `"statement-import": false` is unchanged.

- [ ] **Step 1: Write the failing test**

```js
// tests/feature-flags.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the edit-categories flag exists and is off', () => {
  const flags = JSON.parse(readFileSync(new URL('../config/feature-flags.json', import.meta.url), 'utf8'));
  assert.equal(flags['edit-categories'], false);
  assert.equal(flags['statement-import'], false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/feature-flags.test.js`
Expected: FAIL, `flags['edit-categories']` is `undefined`.

- [ ] **Step 3: Add the entry**

Add `"edit-categories": false` to `config/feature-flags.json`, keeping the file's two-space JSON style.

- [ ] **Step 4: Run the test and the whole suite**

Run: `node --test tests/feature-flags.test.js` then `npm test`
Expected: the flag test passes; `npm test` shows 0 failures across all files (23 existing tests plus 11 in `transactions.test.js` plus 1 here).

- [ ] **Step 5: Commit**

```bash
git add config/feature-flags.json tests/feature-flags.test.js
git commit -m "Add the edit-categories feature flag, off"
```

---

## Self-Review Notes

- Spec coverage: the four `done` items for this slice map to Task 1 (old database keeps rows), Task 3 (stored category read back; rule fallback), and Task 2 (unknown key throws). The spec's unknown-id throw is in Task 2. The flag is Task 4.
- Types: `ensureSchema`, `setCategory`, `getTransaction` signatures match across Tasks 1–3.
- Not in this slice: month page, edit page, `src/server.js` wiring (slice 2 calls `ensureSchema` after the server's existing `CREATE TABLE`).
