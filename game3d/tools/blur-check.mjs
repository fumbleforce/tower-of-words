// The blur check for the public story: node game3d/tools/blur-check.mjs
// Fails when any spoken line in game3d/story could let the player read Japanese he hasn't been taught, or its English
// meaning (Jørgen, 2026-10-10: "I should not be understanding what kuro says when she talks japanese, a consistent
// failure many places in dialogue, you keep forgetting the blur"). The rule is tools/lib/blur-rules.mjs; the
// runtime side is js/narrative/heard-line.js. Every story module is read, every day, so a new file is covered.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spokenProblems, walkSpoken } from '../../tools/lib/blur-rules.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const storyDir = path.join(root, 'story');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(storyDir);

const problems = [];
const done = new WeakSet(); // a step re-exported by a day's index.js is checked once
let lines = 0;
for (const f of files.sort()) {
  const rel = path.relative(root, f);
  let mod;
  try {
    mod = await import(pathToFileURL(f).href);
  } catch (err) {
    problems.push(`${rel}: can't be read in Node, so its lines weren't checked (${err.message.split('\n')[0]})`);
    continue;
  }
  for (const [name, value] of Object.entries(mod))
    walkSpoken(value, (who, s, where, opts) => {
      if (typeof s === 'object' && s.say) {
        if (done.has(s)) return;
        done.add(s);
      }
      lines++;
      for (const p of spokenProblems(who, s, { ...opts, strictEn: true }))
        problems.push(`${rel} ${name === 'default' ? '' : name + ' '}${where} (${who}): ${p}\n    ${String(s.text).slice(0, 90)}`);
    });
}
if (problems.length) {
  console.log(`FAIL blur: ${problems.length} line(s) can show Japanese or its meaning that the player hasn't learned\n`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log(`ok blur: ${lines} spoken lines in ${files.length} story files; no NPC Japanese shows unblurred or translated`);
