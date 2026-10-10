// The trivial ways into a release build, each of which must fail (docs/desktop-release.md says what is left):
//   node desktop/test/hardening.mjs <release executable or AppImage>
// ELECTRON_RUN_AS_NODE, NODE_OPTIONS, --inspect, and Chromium's remote debugging port. Runs on its own Xvfb.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { withApp } from './app-run.mjs';

const exe = path.resolve(process.argv[2]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const marker = path.join(os.tmpdir(), `hardening-${process.pid}`);
const probeJs = path.join(os.tmpdir(), `hardening-${process.pid}.js`);
fs.writeFileSync(probeJs, `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran');`);

const listening = (port) =>
  new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1', () => {
      s.destroy();
      resolve(true);
    });
    s.on('error', () => resolve(false));
  });

async function attempt(name, { args = [], env = {} }, check) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    return await withApp({ exe, args }, async (ctx) => {
      await sleep(6000);
      const ok = await check(ctx);
      console.log(`${ok ? 'BLOCKED' : 'OPEN   '} ${name}`);
      return ok;
    });
  } finally {
    process.env = saved;
  }
}

const results = [];
results.push(await attempt('ELECTRON_RUN_AS_NODE runs a script', { args: [probeJs], env: { ELECTRON_RUN_AS_NODE: '1' } }, async () => !fs.existsSync(marker)));
results.push(await attempt('NODE_OPTIONS --require', { env: { NODE_OPTIONS: `--require ${probeJs}` } }, async () => !fs.existsSync(marker)));
results.push(await attempt('--inspect opens a Node inspector', { args: ['--inspect=9361'] }, async () => !(await listening(9361))));
results.push(await attempt('--remote-debugging-port opens DevTools', { args: ['--remote-debugging-port=9362'] }, async (ctx) => !(await listening(9362)) && !ctx.running()));
fs.rmSync(marker, { force: true });
fs.rmSync(probeJs, { force: true });
process.exit(results.every(Boolean) ? 0 : 1);
