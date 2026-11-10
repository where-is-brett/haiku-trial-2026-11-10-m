// tests/import-page.test.js
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
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
