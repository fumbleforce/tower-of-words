"""Jørgen's image gen dashboard (tools/imagegen) has priority on the GPU over every agent job (GUIDE: GPU lock).

While a dashboard session runs (also while it waits for the lock), the dashboard keeps <root>/gpu.priority:
JSON {by, pid, start, time}. It is live while that pid runs with the same start time, so a crashed dashboard's
file is ignored. While it is live no agent job takes gpu.lock or a browser GPU slot (the JavaScript side is
gpuPriority() in tools/lib/browser-gpu-slots.mjs, which reads the same file).

When the dashboard finds the lock held, it writes <root>/gpu.yield naming that owner, waits a short grace period
and interrupts ComfyUI. Long jobs check should_stop() between items, stop cleanly (exit 75), release the lock and
pick up from what is on disk when run again.

Shell:  python3 tools/gpu_priority.py live          exit 0 and say who while the priority is live, else exit 1
        python3 tools/gpu_priority.py reclaim       free a gpu.lock left by browser jobs that died
        python3 tools/gpu_priority.py stop <name>   exit 0 if the job holding the lock as <name> must stop now"""
import json, os, subprocess, sys, time

ROOT = os.environ.get('GPU_ROOT') or f'/tmp/claude-{os.getuid()}'  # GPU_ROOT: tests only
DASHBOARD = 'imagegen-dashboard'
POOL_PREFIX = 'browser-gpu-pool-v1 '  # tools/lib/browser-gpu-slots.mjs
YIELDED = 75  # exit code of a job that stopped for the dashboard
HERE = os.path.dirname(os.path.abspath(__file__))


def _path(name, root):
    return os.path.join(root or ROOT, name)


def process_start(pid):
    """Start time in clock ticks since boot (/proc/<pid>/stat field 22), as browser-gpu-slots.mjs records it;
    None when the process is gone."""
    try:
        stat = open(f'/proc/{int(pid)}/stat').read()
        return stat[stat.rindex(')') + 2:].split(' ')[19]
    except (OSError, ValueError, TypeError):
        return None


def _read(path):
    try:
        data = json.load(open(path))
        return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def _live(rec):
    if not rec or not rec.get('pid'):
        return False
    now = process_start(rec['pid'])
    return now is not None and (rec.get('start') is None or str(rec['start']) == now)


def _write(path, rec):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f'{path}.{os.getpid()}.tmp'
    with open(tmp, 'w') as f:
        json.dump(rec, f)
    os.replace(tmp, path)


def _record(**extra):
    return dict(by=DASHBOARD, pid=os.getpid(), start=process_start(os.getpid()), time=time.time(),
                at=time.strftime('%H:%M:%S'), **extra)


# ---------------------------------------------------------------- the dashboard's side
def claim_priority(root=None):
    _write(_path('gpu.priority', root), _record())


def request_yield(owner, root=None):
    """Ask the job holding gpu.lock as `owner` to stop."""
    _write(_path('gpu.yield', root), _record(owner=owner))


def clear_yield(root=None):
    _remove_mine(_path('gpu.yield', root))


def drop_priority(root=None):
    clear_yield(root)
    _remove_mine(_path('gpu.priority', root))


def _remove_mine(path):
    rec = _read(path)
    if rec is None or rec.get('pid') == os.getpid() or not _live(rec):
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


# ---------------------------------------------------------------- every agent job's side
def priority(root=None):
    """The live priority record, or None. A file whose writer is gone counts as absent."""
    rec = _read(_path('gpu.priority', root))
    return rec if _live(rec) else None


def yield_request(root=None):
    """The live yield record ({owner, ...}), or None."""
    rec = _read(_path('gpu.yield', root))
    return rec if _live(rec) else None


def should_stop(name=None, root=None):
    """True while the dashboard has priority and this process is not the dashboard: a job checks this between items
    and stops. With a name, a yield request naming that lock owner counts as well."""
    rec = priority(root)
    if rec and rec.get('pid') != os.getpid():
        return True
    y = yield_request(root)
    return bool(y and name and name in y.get('owner', '') and y.get('pid') != os.getpid())


def describe(rec):
    return f"Jørgen's image gen dashboard has the GPU (gpu.priority, since {rec.get('at', '?')}, pid {rec.get('pid')})"


def reclaim(root=None, log=print):
    """Free gpu.lock if it is held by the browser pool and every slot's process is gone (the pool's own reclaim in
    browser-gpu-slots.mjs, which also kills a dead job's leftover Chromium). An exclusive owner, the dashboard
    above all, is never touched."""
    lock = _path('gpu.lock', root)
    try:
        owner = open(os.path.join(lock, 'owner')).read()
    except OSError:
        return
    if not owner.startswith(POOL_PREFIX):
        return
    try:
        out = subprocess.run(['node', os.path.join(HERE, 'lib', 'browser-gpu-slots.mjs'), 'reclaim', root or ROOT],
                             capture_output=True, text=True, timeout=30)
        if log and out.stdout.strip():
            log(out.stdout.strip())
    except (OSError, subprocess.TimeoutExpired) as e:
        if log:
            log(f'could not reclaim dead browser GPU slots: {e}')


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ''
    if cmd == 'live':
        rec = priority()
        if rec:
            print(describe(rec))
        return 0 if rec else 1
    if cmd == 'reclaim':
        reclaim()
        return 0
    if cmd == 'stop' and len(argv) > 2:
        return 0 if should_stop(argv[2]) else 1
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv))
