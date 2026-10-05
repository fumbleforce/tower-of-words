"""Jørgen's image gen dashboard (tools/imagegen) has priority on the GPU over every agent job (GUIDE: GPU lock).

While a dashboard session runs (also while it waits for the lock), the dashboard keeps <root>/gpu.priority:
JSON {by, pid, start, time}. It is live while that pid runs with the same start time, so a crashed dashboard's
file is ignored. While it is live no agent job takes gpu.lock or a browser GPU slot (the JavaScript side is
gpuPriority() in tools/lib/browser-gpu-slots.mjs, which reads the same file).

When the dashboard finds the lock held, it writes <root>/gpu.yield naming that owner, waits a short grace period
and interrupts ComfyUI. Long jobs check should_stop() between items, stop cleanly (exit 75), release the lock and
pick up from what is on disk when run again.

The queue (<root>/gpu.queue/): every job waiting for gpu.lock or a browser GPU slot keeps a ticket there, one JSON
file {rank, time, owner, pid, start, kind}. A waiter takes the lock only when its ticket is first among the live
tickets, by rank and then by time. A ticket whose process is gone, or whose pid now belongs to another process (the
start time differs), is dropped. A ticket goes when its job takes the lock, gives up or releases. Ranks (CP-0035):
  1 dashboard     Jørgen's image gen dashboard (it also keeps gpu.priority and can make the holder yield)
  2 carina-image  Carina image jobs
  3 carina-voice  Carina voice
  4 voice         voices
  5 render        scene renders and every other image or model job (the default)
  browser         headless browser GPU slots (tools/lib/browser-gpu-slots.mjs keeps the same rules in JavaScript).
                  When the lock changes hands they go after voices and before renders. While the browser pool holds
                  the lock, a new browser job joins only if no render has waited longer. So a waiting exclusive job
                  gets the GPU once the running tests end (each is capped at 5 minutes), and browser tests that are
                  waiting get in between two renders.

Shell:  python3 tools/gpu_priority.py queue         the queue: rank, owner, waiting time, live or dead, and the holder
        python3 tools/gpu_priority.py acquire <name> [--rank R] [--pid P] [--timeout S]
                                                     wait in the queue, then take gpu.lock as <name>. P is the process
                                                     the ticket lives with: $$ from a shell script (default: the caller)
        python3 tools/gpu_priority.py release <name>  remove gpu.lock if <name> holds it, and <name>'s tickets
        python3 tools/gpu_priority.py run <name> [--rank R] [--timeout S] -- <command...>   acquire, run, release
        python3 tools/gpu_priority.py live          exit 0 and say who while the priority is live, else exit 1
        python3 tools/gpu_priority.py reclaim       free a gpu.lock left by browser jobs that died
        python3 tools/gpu_priority.py stop <name>   exit 0 if the job holding the lock as <name> must stop now
Python: with gpu_priority.hold('carina-faces-3', 'carina-image'): ...   (or acquire() and release())"""
import contextlib, json, os, shutil, subprocess, sys, time, uuid

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


# ---------------------------------------------------------------- the queue
RANKS = {'dashboard': 1, 'carina-image': 2, 'carina-voice': 3, 'voice': 4, 'browser': 4.5, 'render': 5}
RANK_NAMES = {v: k for k, v in RANKS.items()}
POLL = 5  # seconds between looks; the tickets decide the order, not who looks most often


def rank_of(rank):
    """A rank name or number (1 to 5, or 'browser') as its number."""
    if isinstance(rank, str) and rank in RANKS:
        return RANKS[rank]
    try:
        r = float(rank)
    except (TypeError, ValueError):
        r = None
    if r not in RANK_NAMES:
        raise ValueError(f'unknown GPU rank {rank!r}: use 1 to 5 or one of {", ".join(RANKS)}')
    return int(r) if r == int(r) else r


def _queue_dir(root):
    return _path('gpu.queue', root)


def enqueue(owner, rank='render', pid=None, root=None):
    """Write a ticket and return its path. pid: the process the ticket lives and dies with (default this one)."""
    r = rank_of(rank)
    pid = int(pid or os.getpid())
    start = process_start(pid)
    if start is None:
        raise ValueError(f'no process {pid} to queue for')
    rec = dict(rank=r, time=time.time(), owner=owner, pid=pid, start=start,
               kind='browser' if r == RANKS['browser'] else 'exclusive', at=time.strftime('%H:%M:%S'))
    path = os.path.join(_queue_dir(root), f'{pid}-{start}-{uuid.uuid4().hex[:8]}.json')
    _write(path, rec)
    return path


def dequeue(path):
    if path:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


def read_queue(root=None, prune=True):
    """Every ticket as a dict with its 'path' and 'live'. With prune, dead tickets are removed from disk."""
    out = []
    try:
        names = sorted(os.listdir(_queue_dir(root)))
    except FileNotFoundError:
        return out
    for name in names:
        if not name.endswith('.json'):
            continue  # a ticket still being written (.tmp)
        path = os.path.join(_queue_dir(root), name)
        rec = _read(path)
        if rec is None or 'rank' not in rec or 'time' not in rec:
            continue
        rec['path'] = path
        rec['live'] = rec.get('start') is not None and _live(rec)
        if not rec['live'] and prune:
            dequeue(path)
        out.append(rec)
    return out


def lock_owner(root=None):
    """The gpu.lock owner text; '' while the lock is being taken; None when it is free."""
    lock = _path('gpu.lock', root)
    if not os.path.isdir(lock):
        return None
    try:
        return open(os.path.join(lock, 'owner'), encoding='utf-8').read().strip()
    except OSError:
        return ''


def order_key(ticket, pool_held):
    """The queue order, the same rule as orderKey() in tools/lib/browser-gpu-slots.mjs: rank, then time. While the
    browser pool holds the lock a browser ticket counts as a render, so it cannot join past an older render."""
    r = ticket['rank']
    if ticket.get('kind') == 'browser' and pool_held:
        r = RANKS['render']
    return (r, ticket['time'], os.path.basename(ticket.get('path', '')))


def ahead(path, root=None):
    """The live tickets that go before the ticket at path. A browser ticket only waits for exclusive ones: browser
    jobs share the pool's slots."""
    tickets = [t for t in read_queue(root) if t['live']]
    me = next((t for t in tickets if t['path'] == path), None)
    if me is None:
        return []
    held = (lock_owner(root) or '').startswith(POOL_PREFIX)
    mine = order_key(me, held)
    return [t for t in tickets if t is not me and order_key(t, held) < mine
            and not (me.get('kind') == 'browser' and t.get('kind') == 'browser')]


def try_take(owner, ticket, root=None):
    """One look: take gpu.lock as owner if the lock is free, the ticket is first in the queue and the dashboard does
    not have priority (unless the ticket is the dashboard's own). The ticket is removed once the lock is ours."""
    rec, mine = priority(root), _read(ticket) or {}
    if rec and rec.get('pid') != mine.get('pid'):
        return False
    reclaim(root, log=None)
    if lock_owner(root) is not None or ahead(ticket, root):
        return False
    lock = _path('gpu.lock', root)
    try:
        os.makedirs(os.path.dirname(lock), exist_ok=True)
        os.mkdir(lock)
    except FileExistsError:
        return False
    with open(os.path.join(lock, 'owner'), 'w') as f:
        f.write(owner + '\n')
    dequeue(ticket)
    return True


def waiting_reason(ticket, root=None):
    rec = priority(root)
    if rec:
        return describe(rec)
    owner = lock_owner(root)
    if owner is not None:
        return f'GPU lock held by {owner or "(owner being written)"}'
    first = ahead(ticket, root)
    if first:
        t = min(first, key=lambda t: order_key(t, False))
        return f'{len(first)} ahead in the GPU queue, next {t["owner"]} ({RANK_NAMES.get(t["rank"], t["rank"])})'
    return 'GPU free'


def acquire(owner, rank='render', pid=None, timeout=None, poll=POLL, root=None, log=print):
    """Wait in the queue and take gpu.lock as owner. True once taken, False after timeout seconds. The ticket is
    gone either way."""
    ticket = enqueue(owner, rank, pid, root)
    t0, said = time.time(), None
    try:
        while True:
            if not os.path.exists(ticket):
                ticket = enqueue(owner, rank, pid, root)  # removed by hand: queue again at the back
            if try_take(owner, ticket, root):
                return True
            why = waiting_reason(ticket, root)
            if log and why != said:
                log(f'{owner}: {why}, waiting ({time.strftime("%H:%M:%S")})')
                said = why
            if timeout is not None and time.time() - t0 >= timeout:
                return False
            time.sleep(poll)
    finally:
        dequeue(ticket)


def release(owner, root=None):
    """Remove gpu.lock if owner holds it, and owner's tickets. True if the lock was removed."""
    for t in read_queue(root):
        if t.get('owner') == owner:
            dequeue(t['path'])
    if lock_owner(root) == owner:
        shutil.rmtree(_path('gpu.lock', root), ignore_errors=True)
        return True
    return False


@contextlib.contextmanager
def hold(owner, rank='render', timeout=None, root=None, log=print):
    """with hold('carina-faces-3', 'carina-image'): ...  waits its turn, holds gpu.lock, releases on any exit."""
    if not acquire(owner, rank, timeout=timeout, root=root, log=log):
        raise TimeoutError(f'{owner}: no GPU within {timeout} s')
    try:
        yield
    finally:
        release(owner, root)


def _ago(seconds):
    m = int(seconds // 60)
    return f'{m // 60}h{m % 60:02d}m' if m >= 60 else f'{m}m{int(seconds) % 60:02d}s'


def show_queue(root=None, out=print):
    now, owner = time.time(), lock_owner(root)
    lock = _path('gpu.lock', root)
    if owner is None:
        out('GPU lock: free')
    elif owner.startswith(POOL_PREFIX):
        slots = sorted(n for n in os.listdir(lock) if n.startswith('slot.'))
        who = [str((_read(os.path.join(lock, n)) or {}).get('owner', '?')).split(' ')[0] for n in slots]
        out(f'GPU lock: browser pool, {len(slots)} slot(s) busy ({", ".join(who)}), '
            f'for {_ago(now - os.path.getmtime(lock))}')
    else:
        out(f'GPU lock: held by {owner or "(owner being written)"} for {_ago(now - os.path.getmtime(lock))}')
    rec = priority(root)
    if rec:
        out(describe(rec))
    tickets = read_queue(root, prune=False)
    if not tickets:
        out('queue: empty')
        return
    held = (owner or '').startswith(POOL_PREFIX)
    live = sorted((t for t in tickets if t['live']), key=lambda t: order_key(t, held))
    dead = [t for t in tickets if not t['live']]
    out(f'{"#":>2}  {"rank":<14} {"owner":<36} {"waiting":>8}  state')
    for i, t in enumerate(live + dead, 1):
        rank = f'{t["rank"]} {RANK_NAMES.get(t["rank"], "?")}'.replace('4.5 ', '')
        state = 'live' if t['live'] else 'dead, dropped'
        out(f'{i if t["live"] else "-":>2}  {rank:<14} {str(t.get("owner"))[:36]:<36} '
            f'{_ago(now - t["time"]):>8}  {state} (pid {t.get("pid")})')
        if not t['live']:
            dequeue(t['path'])


def _cli_acquire(cmd, args):
    command = []
    if '--' in args:
        args, command = args[:args.index('--')], args[args.index('--') + 1:]
    if not args or (cmd == 'run' and not command):
        print(__doc__)
        return 2
    name, opts = args[0], dict(zip(args[1::2], args[2::2]))
    timeout = float(opts['--timeout']) if '--timeout' in opts else None
    try:
        got = acquire(name, opts.get('--rank', 'render'), opts.get('--pid'), timeout,
                      log=lambda m: print(m, file=sys.stderr, flush=True))
    except ValueError as e:
        print(e, file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        return 130
    if not got:
        print(f'{name}: no GPU within {timeout:.0f} s', file=sys.stderr)
        return 1
    if cmd == 'acquire':
        return 0
    try:
        return subprocess.call(command)
    except KeyboardInterrupt:
        return 130
    finally:
        release(name)


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ''
    if cmd == 'queue':
        show_queue()
        return 0
    if cmd in ('acquire', 'run'):
        return _cli_acquire(cmd, argv[2:])
    if cmd == 'release' and len(argv) > 2:
        return 0 if release(argv[2]) else 1
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
