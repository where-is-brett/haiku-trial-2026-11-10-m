// src/server.js
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openLedger } from './lib/ledger.js';
import { flagOn } from './lib/flags.js';
import { importStatement } from './lib/import.js';
import { NotAStatement } from './lib/statement.js';

const MAX_UPLOAD_BYTES = 1000000;
const TOO_BIG = 'This upload is over 1 MB. Statements are much smaller; export a shorter period and try again.';

function page(body) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Spending tracker</title></head>
<body>
<main>
<h1>Spending tracker</h1>
${body}
</main>
</body>
</html>
`;
}

function sendText(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
}

// Reads the uploaded statement and adds its rows. Refuses bad files before anything is written.
async function handleUpload(req, res, url, db) {
  if (Number(req.headers['content-length']) > MAX_UPLOAD_BYTES) {
    sendText(res, 413, TOO_BIG);
    return;
  }

  let file;
  try {
    const form = await new Request(url, { method: 'POST', headers: req.headers, body: req, duplex: 'half' }).formData();
    file = form.get('statement');
  } catch {
    sendText(res, 400, 'Choose a statement file to upload.');
    return;
  }
  if (!(file instanceof File)) {
    sendText(res, 400, 'Choose a statement file to upload.');
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    sendText(res, 413, TOO_BIG);
    return;
  }

  try {
    const text = await file.text();
    const { added, skipped } = importStatement(db, text);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page(`<p>Added ${added}, skipped ${skipped}</p>`));
  } catch (error) {
    if (error instanceof NotAStatement) {
      sendText(res, 400, error.message);
    } else {
      sendText(res, 500, 'Something went wrong; nothing was added.');
    }
  }
}

// Builds the HTTP server for the given ledger database. Does not listen.
export function createServer({ db, flagOn }) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/import' && req.method === 'POST' && flagOn('statement-import')) {
      handleUpload(req, res, url, db);
      return;
    }
    if (url.pathname === '/') {
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM transactions').get();
      let body = n === 0 ? '<p>Nothing imported yet</p>' : `<p>${n} transactions imported</p>`;
      if (flagOn('statement-import')) {
        body += '\n<p><a href="/import">Import a statement</a></p>';
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(body));
      return;
    }
    if (url.pathname === '/import' && req.method === 'GET' && flagOn('statement-import')) {
      const body = `<h2>Upload a statement</h2>
<form method="post" action="/import" enctype="multipart/form-data"><input type="file" name="statement"><button type="submit">Import</button></form>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(body));
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
}

// Run directly (npm start): open the ledger and listen. Importing this module does neither.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const db = openLedger(process.env.LEDGER_DB ?? 'ledger.db');
  const server = createServer({ db, flagOn: (name) => flagOn(name) });
  server.listen(port, () => {
    console.log(`listening on ${server.address().port}`);
  });
}
