// Top-level layout of tools/ and game3d/tools/. Each folder's layout.json lists its top-level entries as git sees them
// (tracked files, and untracked files git doesn't ignore): "folders" are the pipelines or services, and "scripts" is the
// short allowlist of loose entry scripts. A new top-level entry fails, and so does a listed entry that is gone. An entry
// leaves the list by moving into a folder or to the archive, so the lists shrink by review (#626).
//
//   node tools/check/layout.mjs             check (part of npm run check)
//   node tools/check/layout.mjs --baseline  rewrite both layout.json files from the tree (read the diff)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const LAYOUTS = ['tools', 'game3d/tools'];
const ABOUT = 'Top-level entries of this folder as git sees them. "folders" are pipelines or services. "scripts" is the '
  + 'short allowlist of loose entry scripts, and it shrinks as they move into folders. npm run check fails on a new entry '
  + 'or on a listed one that is gone. Regenerate with node tools/check/layout.mjs --baseline and read the diff.';
const ONE_OFF = "put it in its pipeline's folder, or in the scratchpad if it's a one-off";

// The top-level entries of dir. Ignored files (tools/usage.json, __pycache__, generated outputs) never count.
export function topLevelEntries(root, dir) {
  const listed = execFileSync(
    'git',
    ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', dir],
    { encoding: 'utf8', maxBuffer: 1 << 26 },
  );
  const folders = new Set();
  const scripts = new Set();
  for (const file of listed.split('\0')) {
    if (!file) continue;
    const [first, ...rest] = file.slice(dir.length + 1).split('/');
    (rest.length ? folders : scripts).add(first);
  }
  return { folders: [...folders].sort(), scripts: [...scripts].sort() };
}

// The findings for one folder: its entries on disk against its layout.json.
export function layoutFindings(dir, entries, layout) {
  const findings = [];
  const onDisk = new Set([...entries.folders, ...entries.scripts]);
  const listedFolders = new Set(layout.folders ?? []);
  const listedScripts = new Set(layout.scripts ?? []);
  for (const name of entries.folders) {
    if (!listedFolders.has(name)) {
      findings.push(`${dir}/${name}/: a new top-level folder. List it under "folders" in ${dir}/layout.json `
        + 'if it is a pipeline or service.');
    }
  }
  for (const name of entries.scripts) {
    if (!listedScripts.has(name)) findings.push(`${dir}/${name}: ${ONE_OFF}`);
  }
  const foundFolders = new Set(entries.folders);
  const foundScripts = new Set(entries.scripts);
  for (const name of listedFolders) {
    if (foundFolders.has(name)) continue;
    findings.push(onDisk.has(name)
      ? `${dir}/layout.json: "${name}" is listed under folders, but it is a file. Move it to scripts.`
      : `${dir}/layout.json: "${name}" is listed under folders but is gone, so remove it.`);
  }
  for (const name of listedScripts) {
    if (foundScripts.has(name)) continue;
    findings.push(onDisk.has(name)
      ? `${dir}/layout.json: "${name}" is listed under scripts, but it is a folder. Move it to folders.`
      : `${dir}/layout.json: "${name}" is listed under scripts but is gone, so remove it.`);
  }
  return findings;
}

export function checkLayouts(root = ROOT) {
  const findings = [];
  let checked = 0;
  for (const dir of LAYOUTS) {
    const file = path.join(root, dir, 'layout.json');
    if (!fs.existsSync(file)) {
      findings.push(`${dir}/layout.json is missing; run node tools/check/layout.mjs --baseline and read the diff`);
      continue;
    }
    const entries = topLevelEntries(root, dir);
    findings.push(...layoutFindings(dir, entries, JSON.parse(fs.readFileSync(file, 'utf8'))));
    checked += entries.folders.length + entries.scripts.length;
  }
  return { findings, checked };
}

export function writeLayouts(root = ROOT) {
  for (const dir of LAYOUTS) {
    const entries = topLevelEntries(root, dir);
    const scripts = [...new Set([...entries.scripts, 'layout.json'])].sort();
    const body = { about: ABOUT, folders: entries.folders, scripts };
    fs.writeFileSync(path.join(root, dir, 'layout.json'), `${JSON.stringify(body, null, 2)}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--baseline')) {
    writeLayouts();
    console.log('layout: wrote tools/layout.json and game3d/tools/layout.json; read the diff');
  } else {
    const { findings, checked } = checkLayouts();
    if (findings.length) {
      console.error(findings.join('\n'));
      process.exitCode = 1;
    } else console.log(`layout: ${checked} top-level entries of tools/ and game3d/tools/ match their layout.json`);
  }
}
