// TEMPORARY stand-in for desktop/pak/source.mjs (#421) until it lands: openDir(root) with the same interface.
// Delete this file when desktop/pak/source.mjs is on main; build.mjs prefers it already.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export function openDir(root) {
  const abs = (p) => path.join(root, p);
  const isFile = (p) => {
    try {
      return fs.statSync(abs(p)).isFile();
    } catch {
      return false;
    }
  };
  return {
    has: isFile,
    list(prefix = '') {
      const dir = abs(prefix);
      let names = [];
      try {
        names = fs.readdirSync(dir, { recursive: true });
      } catch {
        return [];
      }
      return names
        .map((n) => path.posix.join(prefix, String(n).split(path.sep).join('/')))
        .filter((p) => isFile(p))
        .sort();
    },
    stat: (p) => ({ size: fs.statSync(abs(p)).size, type: 'file' }),
    stream: (p, { start = 0, end } = {}) => Readable.toWeb(fs.createReadStream(abs(p), { start, end })),
    read: (p) => fs.readFileSync(abs(p)),
  };
}
