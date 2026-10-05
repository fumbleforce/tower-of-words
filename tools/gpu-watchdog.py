#!/usr/bin/env python3
"""Clears a stale GPU lock, so a dead job can never keep the image dashboard (or anything else) waiting.

The lock is the directory /tmp/claude-1000/gpu.lock with an `owner` file (GUIDE, GPU lock). A lock is stale when
nothing alive can be holding it:
  - owner browser-gpu-pool-v1: its slots are /tmp/claude-1000/browser.lock.<pid>; stale when no slot's pid is alive
    (the pool crashed or was killed before it cleaned up). Empty slots are removed too.
  - any other owner (a script, a dashboard session, an agent): stale when the lock is older than STALE_MIN minutes
    AND ComfyUI has nothing running or queued AND no process other than ComfyUI is computing on the GPU AND no
    lock-waiting job of that owner's name is running. imagegen-dashboard locks are checked against its server pid.
Run once (`python3 tools/gpu-watchdog.py`) or every minute from the systemd user timer gpu-watchdog.timer.
It prints one line when it clears something, and logs to ~/.cache/gpu-watchdog.log. `--dry-run` only reports."""
import json, os, shutil, subprocess, sys, time, urllib.request

BASE = os.environ.get('GPU_WATCHDOG_BASE') or '/tmp/claude-1000'  # the env override is for tests only
LOCK = os.path.join(BASE, 'gpu.lock')
STALE_MIN = 10
COMFY = 'http://127.0.0.1:8188'
LOG = os.path.expanduser('~/.cache/gpu-watchdog.log')


def alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (ProcessLookupError, ValueError):
        return False
    except PermissionError:
        return True


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


def dashboard_alive():
    out = subprocess.run(['pgrep', '-f', 'tools/imagegen/server.py'], capture_output=True, text=True).stdout.split()
    return bool(out)


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
    if not os.path.isdir(LOCK):
        return
    try:
        owner = open(os.path.join(LOCK, 'owner'), encoding='utf-8').read().strip()
    except OSError:
        owner = ''
    age = (time.time() - os.path.getmtime(LOCK)) / 60
    slots = [d for d in os.listdir(BASE) if d.startswith('browser.lock.')]
    live_slots = [d for d in slots if alive(d.rsplit('.', 1)[1])]
    stale, why = False, ''
    if owner.startswith('browser-gpu-pool'):
        if not live_slots:
            stale, why = True, f'browser pool lock with no live slot ({len(slots)} dead slots)'
    elif owner.startswith('imagegen-dashboard'):
        if not dashboard_alive():
            stale, why = True, 'imagegen-dashboard lock but its server is not running'
    elif age >= STALE_MIN and not comfy_busy() and not other_gpu_compute():
        stale, why = True, f'owner "{owner[:60]}" idle for {age:.0f} min: ComfyUI idle, nothing else computing'
    if not stale:
        return
    log(('would clear' if dry else 'cleared') + f' stale GPU lock: {why}')
    if dry:
        return
    shutil.rmtree(LOCK, ignore_errors=True)
    for d in slots:
        if d not in live_slots:
            shutil.rmtree(os.path.join(BASE, d), ignore_errors=True)


if __name__ == '__main__':
    main()
