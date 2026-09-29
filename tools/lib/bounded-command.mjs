import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Each validation owns its process group, including children of npm or a test.
export function boundedCommand(command, args, { cwd, env, timeoutMs, signal, stdio = 'inherit' }) {
  assert(Number.isFinite(timeoutMs) && timeoutMs > 0, 'Command deadline has expired');
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio, detached: true });
    let failure;
    function stop() {
      if (!child.pid) return;
      try { process.kill(-child.pid, 'SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') failure ||= error; }
    }
    const timer = setTimeout(() => {
      failure = new Error(`${command} exceeded ${timeoutMs} ms`);
      stop();
    }, timeoutMs);
    const abort = () => { failure = signal.reason || new Error('Command cancelled'); stop(); };
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', error => { failure = error; });
    // Use exit, not close: a grandchild may keep inherited output pipes open.
    child.once('exit', finish);
    child.once('close', finish); // spawn failures have no exit event.
    let finished = false;
    function finish(code, termination) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      stop();
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${command} failed (${termination || code})`));
      else resolve();
    }
  });
}
