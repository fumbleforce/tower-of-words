// Short named day-one scenarios restored through Continue. No full-day replay per branch.
// --mc <id> / --cast <set or role=person,...> (or MC=, CAST=): every route as that protagonist and cast.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import day1 from '../test/routes/index.mjs';
import day2 from '../test/routes/day2.mjs';
import day3 from '../test/routes/day3.mjs';
import day4 from '../test/routes/day4.mjs';
import day5 from '../test/routes/day5.mjs';
import { choiceInventory, runRoute } from '../test/routes/driver.mjs';
import { mcArgs } from '../test/support/mc-args.mjs';

// --day 2 (or 3): that day's routes and its own choice inventory (test/routes/day2.mjs, day3.mjs); day 1's otherwise
const who = mcArgs(), argv = who.rest, dayAt = argv.indexOf('--day'), day = dayAt >= 0 ? +argv[dayAt + 1] : 1;
const args = dayAt >= 0 ? argv.filter((_, i) => i !== dayAt && i !== dayAt + 1) : argv, worker = args[0] === '--worker';
const routes = { 2: day2, 3: day3, 4: day4, 5: day5 }[day] || day1;
const names = new Set(routes.map(route => route.id));
if (names.size !== routes.length) throw new Error('Duplicate route ID');
if (args[0] === '--list') {
  for (const route of routes) console.log(`${route.id.padEnd(30)} ${route.description}`);
} else if (worker) {
  const results = [], assigned = args.slice(1).map(id => routes.find(route => route.id === id));
  if (assigned.some(route => !route)) throw new Error('Unknown worker route');
  try {
    await withBrowserJob(`day${day}-branches`, async browser => {
      for (const route of assigned) results.push(await runRoute(browser, route, {
        base: `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}`,
        viewport: { width: +(process.env.WIDTH || 390), height: +(process.env.HEIGHT || 844) }, who,
      }));
    }, { timeoutMs: 280000 });
  } catch (error) {
    results.push({ id: 'worker', pass: false, error: `${error.code || 'FAIL'}: ${error.message}` });
  }
  console.log('ROUTE_RESULTS ' + JSON.stringify(results));
  process.exitCode = results.every(result => result.pass) && results.length === assigned.length ? 0 : 1;
} else {
  const selected = args.length ? routes.filter(route => args.includes(route.id)) : routes;
  for (const id of args) if (!names.has(id)) throw new Error(`Unknown route ${id}; use --list`);
  const groups = Array.from({ length: Math.min(3, selected.length) }, () => []);
  selected.forEach((route, index) => groups[index % groups.length].push(route.id));
  const runWorker = group => new Promise(resolve => {
    let output = '';
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', ...group, '--day', String(day)], { env: { ...process.env, MC: who.mc || '', CAST: who.spec || '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGTERM'), 290000);
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', error => { clearTimeout(timer); resolve([{ id: 'worker', pass: false, error: error.message }]); });
    child.on('close', code => {
      clearTimeout(timer);
      const line = output.split('\n').find(line => line.startsWith('ROUTE_RESULTS '));
      if (!line) return resolve(group.map(id => ({ id, pass: false, error: `Worker exited ${code}: ${output.slice(-1800)}` })));
      try {
        const rows = JSON.parse(line.slice('ROUTE_RESULTS '.length));
        for (const id of group) if (!rows.some(row => row.id === id)) rows.push({ id, pass: false, error: 'Worker stopped before route completed' });
        if (code && rows.every(row => row.pass)) rows.push({ id: 'worker', pass: false, error: `Worker exited ${code}` });
        resolve(rows);
      } catch (error) { resolve([{ id: 'worker', pass: false, error: `Invalid worker report: ${error.message}` }]); }
    });
  });
  const results = (await Promise.all(groups.map(runWorker))).flat();
  const coverage = new Set(results.filter(row => row.pass).flatMap(row => row.choices || []));
  const inventory = choiceInventory(day), missing = inventory.filter(choice => !coverage.has(choice.id));
  const passed = results.filter(row => row.pass).length;
  for (const row of results.sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`${row.pass ? 'PASS' : 'FAIL'} ${row.id.padEnd(30)} ${row.seconds?.toFixed(1) || '-'}s${row.error ? '  ' + row.error.split('\n')[0] : ''}`);
  }
  if (who.label) console.log('playing:', who.label);
  console.log(`Routes ${passed}/${selected.length}; authored choice options ${inventory.length - missing.length}/${inventory.length}${args.length ? ' (selected routes only)' : ''}`);
  if (!args.length) for (const choice of missing) console.log(`UNCOVERED ${choice.id} ${choice.text}`);
  const directory = fileURLToPath(new URL(`../shots/routes/${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}/`, import.meta.url));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(directory + 'result.json', JSON.stringify({ selected: selected.map(route => route.id), results, missing }, null, 2));
  console.log('artifacts: ' + directory);
  process.exitCode = results.every(row => row.pass) && passed === selected.length && (args.length || !missing.length) ? 0 : 1;
}
