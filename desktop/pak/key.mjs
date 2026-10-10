// The pack key for building: DESKTOP_PAK_KEY (64 hex characters) if set, otherwise desktop/.key, which is created
// with a random key on first use. desktop/.key is git-ignored and never committed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseKey } from './format.mjs';

export const KEY_FILE = fileURLToPath(new URL('../.key', import.meta.url));

export function loadKey({ env = process.env, file = KEY_FILE } = {}) {
  if (env.DESKTOP_PAK_KEY) return { key: parseKey(env.DESKTOP_PAK_KEY), from: 'DESKTOP_PAK_KEY' };
  if (!fs.existsSync(file)) {
    const fd = fs.openSync(file, 'wx', 0o600); // wx: never overwrite a key another process just wrote
    fs.writeSync(fd, `${crypto.randomBytes(32).toString('hex')}\n`);
    fs.closeSync(fd);
    return { key: parseKey(fs.readFileSync(file, 'utf8')), from: file, created: true };
  }
  return { key: parseKey(fs.readFileSync(file, 'utf8')), from: file };
}
