#!/usr/bin/env python3
"""Clears a stale GPU lock, so a dead job can never keep the image dashboard (or anything else) waiting.

The lock is the directory /tmp/claude-1000/gpu.lock with an `owner` file (GUIDE, GPU lock). A lock is stale when
nothing alive can be holding it:
  - owner browser-gpu-pool-v1: the slots of browser jobs that died are reclaimed (gpu.lock/slot.<n> record each
    job's pid; their leftover Chromium is killed) and the lock goes with the last one (tools/gpu_priority.py reclaim,
    the pool's own code in tools/lib/browser-gpu-slots.mjs).
  - imagegen-dashboard: never. Jørgen's dashboard has priority and releases its own lock (a restarted server picks
    its session up or closes it).
  - any other owner (a script, an agent): stale when the lock is older than STALE_MIN minutes AND ComfyUI has nothing
    running or queued AND no process other than ComfyUI is computing on the GPU.
Run once (`python3 tools/gpu-watchdog.py`) or every minute from the systemd user timer gpu-watchdog.timer.
It prints one line when it clears something, and logs to ~/.cache/gpu-watchdog.log. `--dry-run` only reports."""
import json, os, shutil, subprocess, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gpu_priority  # noqa: E402

BASE = os.environ.get('GPU_WATCHDOG_BASE') or '/tmp/claude-1000'  # the env override is for tests only
LOCK = os.path.join(BASE, 'gpu.lock')
STALE_MIN = 10
COMFY = 'http://127.0.0.1:8188'
LOG = os.path.expanduser('~/.cache/gpu-watchdog.log')


def comfy_busy():
    try:
        q = json.load(urllib.request.urlopen(COMFY + '/queue', timeout=2))
        return bool(q.get('queue_running') or q.get('queue_pending'))
    except Exception:
        return False  # not up: nothing of its own is running


def other_gpu_compute():
    """pids computing on the GPU that are not the ComfyUI server."""
    try:
        out = subprocess.run(['nvidia-smi', '--query-compute-apps=pid', '--format=csv,noheader'], capture_output=True, text=True, timeout=5).stdout
    except Exception:
        return []
    pids = [int(x) for x in out.split() if x.isdigit()]
    res = []
    for p in pids:
        try:
            cmd = open(f'/proc/{p}/cmdline').read()
        except OSError:
            continue
        if 'ComfyUI' in cmd or 'main.py' in cmd and '--port 8188' in cmd.replace('\0', ' '):
            continue
        res.append(p)
    return res


def log(msg):
    line = time.strftime('%F %T ') + msg
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        open(LOG, 'a').write(line + '\n')
    except OSError:
        pass


def main():
    dry = '--dry-run' in sys.argv
    if not dry:
        gpu_priority.read_queue(BASE)  # drops the GPU queue tickets of waiters that died
    if not os.path.isdir(LOCK):
        return
    try:
        owner = open(os.path.join(LOCK, 'owner'), encoding='utf-8').read().strip()
    except OSError:
        owner = ''
    age = (time.time() - os.path.getmtime(LOCK)) / 60
    stale, why = False, ''
    if owner.startswith(gpu_priority.POOL_PREFIX):
        if not dry:
            gpu_priority.reclaim(BASE, log=lambda m: log('browser pool: ' + m) if not m.startswith('reclaimed 0 ') else None)
        return
    if owner.startswith(gpu_priority.DASHBOARD):
        return
    if age >= STALE_MIN and not comfy_busy() and not other_gpu_compute():
        stale, why = True, f'owner "{owner[:60]}" idle for {age:.0f} min: ComfyUI idle, nothing else computing'
    if not stale:
        return
    log(('would clear' if dry else 'cleared') + f' stale GPU lock: {why}')
    if dry:
        return
    shutil.rmtree(LOCK, ignore_errors=True)


if __name__ == '__main__':
    main()
