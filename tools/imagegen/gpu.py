"""GPU session for the dashboard, following GUIDE's lock rules.

Start: mkdir /tmp/claude-1000/gpu.lock, write "imagegen-dashboard ..." to owner, start ComfyUI if it isn't running.
End: stop the ComfyUI we started (or ask a running one to free its VRAM), then remove the lock, but only while
the owner file still names the dashboard. The worker checks the owner before every job.
Priority (Jørgen, 2026-10-05: "let my tools/imagegen page have priority"): from start to end a session keeps
gpu.priority live (tools/gpu_priority.py), so no agent job takes the lock or a browser GPU slot. If another job holds
the lock, the session writes gpu.yield naming it, waits YIELD_GRACE, interrupts ComfyUI and takes the lock as soon as
it is released (a lock left by dead browser jobs is freed at once).
Queue: while it waits the session keeps a rank-1 ticket in gpu.queue (tools/gpu_priority.py), so it shows first in
`python3 tools/gpu_priority.py queue`; the ticket goes when the lock is taken or the session ends."""
import base64, json, os, shutil, signal, socket, struct, subprocess, threading, time, urllib.request

import gpu_priority  # tools/gpu_priority.py (server.py puts tools/ on the path)

LOCK_DIR = os.environ.get('IMAGEGEN_LOCK') or '/tmp/claude-1000/gpu.lock'  # env override for tests
ROOT = os.path.dirname(LOCK_DIR)  # gpu.priority and gpu.yield live beside the lock
OWNER = os.path.join(LOCK_DIR, 'owner')
NAME = gpu_priority.DASHBOARD
YIELD_GRACE = 20  # seconds a job gets to stop on its own before ComfyUI is interrupted
COMFY_DIR = os.path.expanduser('~/ai/ComfyUI')
COMFY_PY = os.path.expanduser('~/ai/sd/venv/bin/python')
COMFY_LOG = os.path.expanduser('~/ai/comfy.log')
COMFY = 'http://127.0.0.1:8188'
IDLE_LIMIT = 20 * 60
# VRAM ComfyUI leaves alone, in GB, so the browser (the editor, the game, headless checks) keeps headroom on the 10 GB
# card while a render runs. ComfyUI's own default is 0.4. IMAGEGEN_RESERVE_VRAM overrides it.
RESERVE_VRAM = os.environ.get('IMAGEGEN_RESERVE_VRAM') or '2'


def comfy_up(timeout=1.5):
    try:
        urllib.request.urlopen(COMFY + '/system_stats', timeout=timeout).read()
        return True
    except Exception:
        return False


def vram():
    try:
        out = subprocess.run(['nvidia-smi', '--query-gpu=memory.used,memory.total', '--format=csv,noheader,nounits'],
                             capture_output=True, text=True, timeout=5).stdout.strip().split(',')
        return dict(used=int(out[0]), total=int(out[1]))
    except Exception:
        return None


def lock_info():
    if not os.path.isdir(LOCK_DIR):
        return dict(held=False)
    try:
        owner = open(OWNER, encoding='utf-8').read().strip()
        since = os.path.getmtime(OWNER)
    except OSError:
        owner, since = '(no owner file yet)', os.path.getmtime(LOCK_DIR)
    return dict(held=True, owner=owner, mine=NAME in owner, since=time.strftime('%H:%M', time.localtime(since)),
                since_ts=since, minutes=int((time.time() - since) // 60))


def owner_is_me():
    try:
        return NAME in open(OWNER, encoding='utf-8').read()
    except OSError:
        return False


def _pid_alive(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


class Session:
    def __init__(self, state_path, log):
        self.path = state_path
        self.log = log
        self.lock = threading.RLock()
        self.s = dict(state='off', message='', started_at=None, pid=None, by_us=False, last_activity=time.time(), ended=None)
        self.busy = lambda: False  # set by the server: True while jobs are queued or running
        self.proc = None  # the Popen of the ComfyUI we started in this process
        self.ticket = None  # our place in gpu.queue while waiting for the lock
        waiting = self._recover()
        threading.Thread(target=self._watch, daemon=True).start()
        if waiting:
            self.start()

    # ------------------------------------------------------------ persistence
    def _persist(self):
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, 'w') as f:
            json.dump(self.s, f)

    def _set(self, **kw):
        with self.lock:
            self.s.update(kw)
            self._persist()

    def _recover(self):
        """Pick up the session of the previous server (run.sh --restart). True if it was still waiting for the lock."""
        try:
            old = json.load(open(self.path))
        except Exception:
            old = {}
        waiting = False
        if old.get('state') in ('on', 'starting') and owner_is_me():
            if comfy_up():
                self.s.update(old, state='on', message='Session picked up after a dashboard restart.', last_activity=time.time())
                gpu_priority.claim_priority(ROOT)
                self.log('recovered session from ' + json.dumps(old))
            else:
                self.log('found my lock but ComfyUI is down; releasing')
                self._release()
                self.s.update(state='off', message='The last session was left open and has been closed.')
        elif old.get('state') == 'starting':
            waiting = True  # it was waiting for another job to give up the GPU: keep waiting
        if self.s['state'] == 'off':
            gpu_priority.drop_priority(ROOT)  # a file left by a server that died
        self._persist()
        return waiting

    # ------------------------------------------------------------ public
    def status(self):
        with self.lock:
            s = dict(self.s)
        s['lock'] = lock_info()
        s['priority'] = bool(gpu_priority.priority(ROOT))
        s['comfy'] = comfy_up(0.8)
        s['vram'] = vram()
        if s['state'] == 'on':
            s['idle_left'] = max(0, int(IDLE_LIMIT - (time.time() - s['last_activity']))) if not self.busy() else IDLE_LIMIT
        return s

    def touch(self):
        with self.lock:
            self.s['last_activity'] = time.time()

    def start(self):
        """Never refused because someone else holds the GPU: the dashboard has priority. It claims it, asks the holder
        to stop and takes the lock when it is released (_take_over)."""
        with self.lock:
            if self.s['state'] in ('on', 'starting'):
                return dict(ok=True)
            gpu_priority.claim_priority(ROOT)
            gpu_priority.reclaim(ROOT, log=self.log)
            self._enqueue()
            self._set(state='starting', message='Starting ComfyUI...', started_at=time.time(), last_activity=time.time(), ended=None)
            if self._take():
                threading.Thread(target=self._boot, daemon=True).start()
                return dict(ok=True)
            info = lock_info()
            gpu_priority.request_yield(info.get('owner', ''), ROOT)
            self._set(message=f"Asked {info.get('owner')} to stop (it has had the GPU since {info.get('since')}).")
            self.log(f"GPU held by {info.get('owner')}: asked it to stop")
        threading.Thread(target=self._take_over, daemon=True).start()
        return dict(ok=True, waiting_for=info.get('owner'))

    def _enqueue(self):
        if self.ticket is None or not os.path.exists(self.ticket):
            self.ticket = gpu_priority.enqueue(NAME, 'dashboard', root=ROOT)

    def _dequeue(self):
        gpu_priority.dequeue(self.ticket)
        self.ticket = None

    def _take(self):
        """Hold the lock (taking it if it is free). False while another owner has it."""
        if owner_is_me():
            self._dequeue()
            return True
        try:
            os.makedirs(ROOT, exist_ok=True)
            os.mkdir(LOCK_DIR)
        except FileExistsError:
            return False
        self._dequeue()
        with open(OWNER, 'w') as f:
            f.write(f"{NAME} (Jørgen's image gen dashboard, http://127.0.0.1:8772) {time.strftime('%H:%M:%S')}\n")
        self.log('took the GPU lock')
        return True

    def _take_over(self):
        """Wait for the holder to stop: after YIELD_GRACE interrupt ComfyUI (and drop its queue), then take the lock
        the moment it is free. Ends quietly if the session is ended meanwhile."""
        t0, interrupted = time.time(), False
        while True:
            with self.lock:
                if self.s['state'] != 'starting':
                    return
                if self._take():
                    gpu_priority.clear_yield(ROOT)
                    self._set(message='Starting ComfyUI...', last_activity=time.time())
                    break
            if not interrupted and time.time() - t0 >= YIELD_GRACE:
                interrupted = True
                self._interrupt_comfy()
                owner = lock_info().get('owner')
                self._set(message=f'Asked {owner} to stop and interrupted ComfyUI; waiting for it to let go of the GPU.')
            gpu_priority.reclaim(ROOT, log=self.log)
            time.sleep(2)
        self._boot()

    def _interrupt_comfy(self):
        if not comfy_up():
            return
        for path, body in (('/interrupt', {}), ('/queue', {'clear': True})):
            try:
                req = urllib.request.Request(COMFY + path, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=10).read()
            except Exception as e:
                self.log(f'POST {path} failed: {e}')
        self.log('interrupted ComfyUI and cleared its queue for the session')

    def _boot(self):
        if comfy_up():
            self._set(state='on', by_us=False, pid=None, message='Using the ComfyUI that was already running.', last_activity=time.time())
            self.log('ComfyUI already up; using it')
            return
        logf = open(COMFY_LOG, 'ab')
        logf.write(f'\n--- started by {NAME} {time.ctime()} ---\n'.encode())
        p = subprocess.Popen([COMFY_PY, 'main.py', '--listen', '127.0.0.1', '--port', '8188', '--disable-auto-launch', '--reserve-vram', RESERVE_VRAM],
                             cwd=COMFY_DIR, stdout=logf, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)
        self.proc = p
        self._set(pid=p.pid, by_us=True)
        self.log(f'started ComfyUI pid {p.pid}')
        t0 = time.time()
        while time.time() - t0 < 240:
            if p.poll() is not None:
                break
            if self.s['state'] not in ('starting', 'ending'):
                # the session was ended before ComfyUI came up: don't leave it running
                if p.poll() is None:
                    os.killpg(p.pid, signal.SIGTERM)
                    self.log(f'stopped ComfyUI pid {p.pid} (session ended while it was starting)')
                return
            if comfy_up() and self.s['state'] == 'starting':
                self._set(state='on', message='ComfyUI is up.', last_activity=time.time())
                self.log(f'ComfyUI up after {time.time() - t0:.0f}s')
                return
            if self.s['state'] != 'starting':
                return  # ended while booting
            time.sleep(2)
        self.log('ComfyUI failed to start; see ~/ai/comfy.log')
        self.end('ComfyUI did not start (see ~/ai/comfy.log).', state='error')

    def end(self, reason='Ended.', state='off'):
        with self.lock:
            if self.s['state'] == 'off' and not owner_is_me():
                gpu_priority.drop_priority(ROOT)
                return dict(ok=True)
            was = self.s['state']
            self.s['state'] = 'ending'
            pid, by_us = self.s.get('pid'), self.s.get('by_us')
        if by_us and self._alive(pid):
            try:
                os.killpg(pid, signal.SIGTERM)
            except OSError:
                pass
            for _ in range(40):
                if not self._alive(pid):
                    break
                time.sleep(0.5)
            if self._alive(pid):
                try:
                    os.killpg(pid, signal.SIGKILL)
                except OSError:
                    pass
            self.log(f'stopped ComfyUI pid {pid}')
        elif comfy_up():
            try:
                req = urllib.request.Request(COMFY + '/free', data=json.dumps({'unload_models': True, 'free_memory': True}).encode(),
                                             headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=10).read()
                self.log('asked the running ComfyUI to free its VRAM')
            except Exception as e:
                self.log(f'/free failed: {e}')
        released = self._release()
        self._dequeue()
        gpu_priority.drop_priority(ROOT)
        waited = was == 'starting' and not released  # ended while still waiting for another job's lock
        self._set(state=state, message=reason + ('' if released or waited else ' (the lock was no longer ours, so it was left alone)'),
                  pid=None, by_us=False, ended=time.time())
        self.log(f'session ended: {reason}')
        return dict(ok=True)

    def _alive(self, pid):
        if self.proc is not None and self.proc.pid == pid:
            return self.proc.poll() is None
        return _pid_alive(pid)

    def _release(self):
        if owner_is_me():
            shutil.rmtree(LOCK_DIR, ignore_errors=True)
            self.log('released the GPU lock')
            return True
        return False

    def lost(self):
        """The owner file no longer names the dashboard: stop without touching the lock."""
        with self.lock:
            if self.s['state'] in ('on', 'starting'):
                self.s.update(state='lost', message='The GPU lock is no longer ours. Queue stopped; nothing was removed.')
                self._persist()
                self.log('lock lost; queue stopped')

    def _watch(self):
        while True:
            time.sleep(15)
            try:
                st = self.s['state']
                if st in ('on', 'starting') and not gpu_priority.priority(ROOT):
                    gpu_priority.claim_priority(ROOT)  # someone removed it: the session still has priority
                if st == 'on':
                    if not owner_is_me():
                        self.lost()
                        continue
                    if self.busy():
                        self.touch()
                    elif time.time() - self.s['last_activity'] > IDLE_LIMIT:
                        self.end('Ended after 20 idle minutes.')
                    elif self.s.get('by_us') and not self._alive(self.s.get('pid')):
                        self.log('ComfyUI exited on its own')
                        self.end('ComfyUI exited on its own (see ~/ai/comfy.log).', state='error')
            except Exception as e:
                self.log(f'watchdog error: {e}')


# ---------------------------------------------------------------- progress over ComfyUI's websocket (stdlib only)
class Progress(threading.Thread):
    """Listens on ws://127.0.0.1:8188/ws?clientId=... and calls on_progress(prompt_id, value, max)."""

    def __init__(self, client_id, on_progress):
        super().__init__(daemon=True)
        self.client_id, self.on_progress = client_id, on_progress
        self.sock = None
        self.stop = False

    def _recv(self, n):
        buf = b''
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError('closed')
            buf += chunk
        return buf

    def _send(self, opcode, payload=b''):
        mask = os.urandom(4)
        head = bytes([0x80 | opcode, 0x80 | len(payload)]) + mask
        self.sock.sendall(head + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

    def run(self):
        while not self.stop:
            try:
                self.sock = socket.create_connection(('127.0.0.1', 8188), timeout=10)
                key = base64.b64encode(os.urandom(16)).decode()
                self.sock.sendall((f'GET /ws?clientId={self.client_id} HTTP/1.1\r\nHost: 127.0.0.1:8188\r\nUpgrade: websocket\r\n'
                                   f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
                head = b''
                while b'\r\n\r\n' not in head:
                    head += self._recv(1)
                if b' 101 ' not in head.split(b'\r\n')[0]:
                    raise ConnectionError('no upgrade')
                self.sock.settimeout(60)
                while not self.stop:
                    b1, b2 = self._recv(2)
                    op, n = b1 & 0x0F, b2 & 0x7F
                    if n == 126:
                        n = struct.unpack('>H', self._recv(2))[0]
                    elif n == 127:
                        n = struct.unpack('>Q', self._recv(8))[0]
                    mask = self._recv(4) if b2 & 0x80 else None
                    data = self._recv(n)
                    if mask:
                        data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
                    if op == 1:
                        msg = json.loads(data)
                        if msg.get('type') == 'progress':
                            d = msg['data']
                            self.on_progress(d.get('prompt_id'), d.get('value', 0), d.get('max', 1))
                    elif op == 9:
                        self._send(0xA, data)
                    elif op == 8:
                        raise ConnectionError('server closed')
            except Exception:
                try:
                    self.sock and self.sock.close()
                except Exception:
                    pass
                time.sleep(3)
