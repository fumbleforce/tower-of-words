import fs from 'node:fs';
import path from 'node:path';

export function sourceFiles(root, directories, extensions = /\.[cm]?js$/) {
  const walk = directory => fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink() || ['vendor', 'node_modules', '__pycache__', 'private'].includes(entry.name)) return [];
    const file = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : extensions.test(file) ? [file] : [];
  });
  return directories.flatMap(walk).sort();
}
