import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_FILE = fileURLToPath(new URL('../../config/feature-flags.json', import.meta.url));

// True only when the flag's value in the JSON file is exactly `true`.
// A missing, unreadable or unparseable file counts as off.
export function flagOn(name, file = DEFAULT_FILE) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return parsed[name] === true;
  } catch {
    return false;
  }
}
