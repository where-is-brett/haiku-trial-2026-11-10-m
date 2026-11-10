// src/lib/statement.js
import { parseDate } from './dates.js';
import { parseAmount } from './money.js';

const HEADER = 'Date,Description,Amount';

// Raised when text is not a readable statement. The message is shown to the director.
export class NotAStatement extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotAStatement';
  }
}

// Reads a statement's rows as { date, description, cents }. Spending is positive, money coming back negative.
export function readStatement(text) {
  const lines = String(text).replace(/^﻿/, '').split('\n').map((line) => line.replace(/\r$/, ''));

  if (lines[0] !== HEADER) {
    throw new NotAStatement("This isn't a bank statement: the first line should be Date, Description, Amount.");
  }

  const rows = [];
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (index === 0 || line.trim() === '') return;

    const fields = splitFields(line, lineNumber);
    if (fields.length !== 3) {
      throw new NotAStatement(`Line ${lineNumber} needs three fields: Date, Description, Amount.`);
    }
    const [date, description, amount] = fields;
    rows.push({ date: parseDate(date), description, cents: parseAmount(amount) });
  });
  return rows;
}

// Splits one CSV line into fields. A field may be double-quoted; "" inside quotes is one ".
function splitFields(line, lineNumber) {
  const fields = [];
  let field = '';
  let quoted = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
    i += 1;
  }

  if (quoted) {
    throw new NotAStatement(`Line ${lineNumber} isn't readable.`);
  }
  fields.push(field);
  return fields;
}
