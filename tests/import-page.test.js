// tests/import-page.test.js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openLedger } from '../src/lib/ledger.js';
import { createServer } from '../src/server.js';
import { escapeHtml } from '../src/lib/html.js';

const servers = [];

async function start(flagOn) {
  const db = openLedger(':memory:');
  const server = createServer({ db, flagOn });
  await new Promise((resolve) => server.listen(0, resolve));
  servers.push(server);
  const { port } = server.address();
  return {
    base: `http://localhost:${port}`,
    db,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

after(() => Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve)))));

function post(base, text) {
  const form = new FormData();
  form.append('statement', new Blob([text]), 'statement.csv');
  return fetch(`${base}/import`, { method: 'POST', body: form });
}

test('escapeHtml escapes the five HTML special characters', () => {
  assert.equal(
    escapeHtml('<i>"a" & \'b\'</i>'),
    '&lt;i&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/i&gt;',
  );
});

test('the import page shows the upload form when the flag is on', async () => {
  const { base, close } = await start(() => true);
  const res = await fetch(`${base}/import`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /<h2>Upload a statement<\/h2>/);
  assert.match(
    body,
    /<form method="post" action="\/import" enctype="multipart\/form-data"><input type="file" name="statement"><button type="submit">Import<\/button><\/form>/,
  );
  await close();
});

test('the import page is not there when the flag is off', async () => {
  const { base, close } = await start(() => false);
  const res = await fetch(`${base}/import`);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), 'Not found');
  await close();
});

test('the home page links to the import page only when the flag is on', async () => {
  const on = await start(() => true);
  assert.match(await (await fetch(on.base + '/')).text(), /<a href="\/import">Import a statement<\/a>/);
  await on.close();
  const off = await start(() => false);
  assert.doesNotMatch(await (await fetch(off.base + '/')).text(), /href="\/import"/);
  await off.close();
});

test('uploading a statement shows Added n, skipped n', async () => {
  const { base, close } = await start(() => true);
  const text = readFileSync('data/sample-statement.csv', 'utf8');
  const first = await post(base, text);
  assert.equal(first.status, 200);
  assert.match(await first.text(), /Added 128, skipped 0/);
  assert.match(await (await post(base, text)).text(), /Added 0, skipped 128/);
  await close();
});

test('a non-statement upload is refused and adds nothing', async () => {
  const { base, db, close } = await start(() => true);
  const res = await post(base, 'Name,Total\nShop,1.00\n');
  assert.equal(res.status, 400);
  assert.match(await res.text(), /This isn't a bank statement/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
  await close();
});

test('a bad row message is plain text, as written', async () => {
  const { base, close } = await start(() => true);
  const res = await post(base, 'Date,Description,Amount\n<i>1</i>,Shop,1.00\n');
  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  assert.equal(await res.text(), "Line 2 isn't a valid date: <i>1</i>.");
  await close();
});

test('a post with no statement field is a plain 400', async () => {
  const { base, close } = await start(() => true);
  const form = new FormData();
  form.append('other', 'x');
  assert.equal((await fetch(`${base}/import`, { method: 'POST', body: form })).status, 400);
  await close();
});

test('an upload over 1 MB is refused and adds nothing', async () => {
  const { base, db, close } = await start(() => true);
  const big = 'Date,Description,Amount\n' + '02/08/2026,Shop,1.00\n'.repeat(60000);
  const res = await post(base, big);
  assert.equal(res.status, 413);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 0);
  await close();
});

test('the import page is not there when the flag is off, even for a POST', async () => {
  const { base, close } = await start(() => false);
  assert.equal((await post(base, 'Date,Description,Amount\n')).status, 404);
  await close();
});
