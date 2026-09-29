// Browser jobs run sequentially; each caller owns its bounded lifecycle and artifacts.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const jobs = {
  registration: ['tools/check/registration-browser.mjs'],
  desktop: ['game3d/tools/fast.mjs', '1366', '860'],
  phone: ['game3d/tools/fast.mjs', '390', '844'],
  bible: ['tools/bible/check.mjs', '--public-only'],
  continue: ['tools/check/continue-browser.mjs'],
  checkpoints: ['tools/check/checkpoint-browser.mjs'],
  transitions: ['tools/check/transition-browser.mjs'],
  recovery: ['tools/check/recovery-browser.mjs'],
  typing: ['tools/check/typing-browser.mjs'],
  opening: ['tools/check/opening-browser.mjs'],
  'staging-platform': ['tools/check/staging-browser.mjs', 'platform'],
  'staging-arrival': ['tools/check/staging-browser.mjs', 'arrival'],
};
const requested = process.argv.slice(2);
const selected = requested.length ? requested : Object.keys(jobs);
if (selected.some(name => !jobs[name])) throw new Error('Browser checks: ' + Object.keys(jobs).join(', '));
let active, interrupted = false, failed = false, deferred = false;
const handlers = ['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => {
  const handler = () => { interrupted = true; active?.kill(signal); };
  process.on(signal, handler);
  return [signal, handler];
});
try {
  for (const name of selected) {
    if (interrupted) break;
    const status = await new Promise(resolve => {
      active = spawn(process.execPath, jobs[name], { cwd: root, stdio: 'inherit' });
      active.once('error', error => { console.error(error.message); resolve(1); });
      active.once('exit', code => resolve(code ?? 1));
    });
    active = undefined;
    deferred ||= status === 75;
    failed ||= status !== 0 && status !== 75;
    console.log(`${status === 0 ? 'PASS' : status === 75 ? 'DEFERRED' : 'FAIL'} browser ${name}`);
  }
} finally {
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
process.exitCode = interrupted ? 130 : failed ? 1 : deferred ? 75 : 0;
