// Run a built desktop app on its own Xvfb display (never a real screen), with a throwaway userData, and hand a
// scenario the tools to look at it: screenshots of the display, XTest keys and clicks (xinput.py), and, for a --dev
// build only, the page over the debugging port (a release refuses that port, so it is checked by eye and input only).
//
//   node desktop/test/app-run.mjs <scenario> --exe <app executable> [--cdp] [--gl gpu|soft] [--keep-config <dir>]
//
// Scenarios: desktop/test/scenarios.mjs. GPU: a browser GPU slot (tools/lib/browser-gpu-slots.mjs) is held for the
// app's life with --gl gpu; --gl soft renders in software and takes none.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { enqueueGpuTicket, tryAcquireBrowserGpuSlot } from '../../tools/lib/browser-gpu-slots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gpuSlot(owner, waitMs = 240000) {
  const ticket = enqueueGpuTicket({ owner, rank: 'browser' });
  const until = Date.now() + waitMs;
  for (;;) {
    const slot = tryAcquireBrowserGpuSlot({ owner, ticket });
    if (slot) {
      ticket.remove?.();
      return slot;
    }
    if (Date.now() > until) throw new Error('no GPU slot within the wait');
    await sleep(2000);
  }
}

function freeDisplay() {
  for (let n = 91; n < 140; n++) if (!fs.existsSync(`/tmp/.X${n}-lock`)) return `:${n}`;
  throw new Error('no free X display number');
}

export async function withApp({ exe, cdp = false, gl = 'soft', configDir = null, size = [1366, 860], args = [] }, fn) {
  const display = freeDisplay();
  const xvfb = spawn('Xvfb', [display, '-screen', '0', `${size[0]}x${size[1]}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' });
  const config = configDir || fs.mkdtempSync(path.join(os.tmpdir(), 'amakawa-cfg-'));
  let slot = null;
  let app = null;
  let browser = null;
  const log = [];
  const cleanup = () => {
    try {
      if (app && app.exitCode === null) process.kill(-app.pid, 'SIGKILL');
    } catch {
      /* gone */
    }
    try {
      xvfb.kill('SIGTERM'); // Xvfb removes its own lock on TERM; ours are removed below in case it can't
    } catch {
      /* gone */
    }
    const n = display.slice(1);
    for (const f of [`/tmp/.X${n}-lock`, `/tmp/.X11-unix/X${n}`]) fs.rmSync(f, { force: true });
    slot?.release();
    if (!configDir) fs.rmSync(config, { recursive: true, force: true });
  };
  process.once('exit', cleanup);
  try {
    await sleep(500);
    if (gl === 'gpu') slot = await gpuSlot(`desktop-app pid=${process.pid}`);
    const port = 9300 + Math.floor(Math.random() * 600);
    const glArgs = gl === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
    const appArgs = [...glArgs, ...(cdp ? [`--remote-debugging-port=${port}`] : []), ...args];
    const t0 = Date.now();
    app = spawn(exe, appArgs, {
      env: { ...process.env, DISPLAY: display, XDG_CONFIG_HOME: config, WAYLAND_DISPLAY: '' },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (slot) slot.track(app.pid);
    app.stdout.on('data', (d) => log.push(String(d)));
    app.stderr.on('data', (d) => log.push(String(d)));
    const exited = new Promise((r) => app.once('exit', (code) => r(code)));
    const ctx = {
      t0,
      display,
      config,
      log,
      exited,
      running: () => app.exitCode === null && app.signalCode === null,
      shot(file) {
        execFileSync('import', ['-display', display, '-window', 'root', file]);
        return file;
      },
      key: (k) => execFileSync('python3', [path.join(here, 'xinput.py'), display, 'key', k]),
      hold: (k, s) => execFileSync('python3', [path.join(here, 'xinput.py'), display, 'hold', k, String(s)]),
      click: (x, y) => execFileSync('python3', [path.join(here, 'xinput.py'), display, 'click', String(x), String(y)]),
      async page() {
        if (!browser) {
          for (let i = 0; i < 60 && !browser; i++) {
            try {
              browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
            } catch {
              await sleep(250);
            }
          }
          if (!browser) throw new Error('no debugging port');
        }
        for (let i = 0; i < 80; i++) {
          const p = browser.contexts().flatMap((c) => c.pages())[0];
          if (p) return p;
          await sleep(250);
        }
        throw new Error('no page');
      },
    };
    return await fn(ctx);
  } finally {
    try {
      await browser?.close();
    } catch {
      /* the app went first */
    }
    cleanup();
    process.off('exit', cleanup);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
  const name = argv[0];
  const { scenarios } = await import('./scenarios.mjs');
  if (!scenarios[name]) throw new Error(`scenarios: ${Object.keys(scenarios).join(', ')}`);
  const out = opt('out', fs.mkdtempSync(path.join(os.tmpdir(), 'amakawa-run-')));
  fs.mkdirSync(out, { recursive: true });
  const kill = setTimeout(() => {
    console.error('app-run: over 5 minutes, stopping');
    process.exit(2);
  }, 290000);
  const result = await withApp({ exe: path.resolve(opt('exe')), cdp: argv.includes('--cdp'), gl: opt('gl', 'soft'), configDir: opt('keep-config', null) }, (ctx) =>
    scenarios[name](ctx, { out }),
  );
  clearTimeout(kill);
  console.log(JSON.stringify(result, null, 1));
  console.log(`shots in ${out}`);
  process.exit(result?.pass === false ? 1 : 0);
}
