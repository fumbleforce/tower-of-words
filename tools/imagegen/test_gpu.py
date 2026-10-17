"""The image service's GPU session (tools/imagegen/gpu.py, #687): gpu.priority only for Jørgen's own renders, the
lock owner names the agent it renders for, and an idle session lets the GPU go.
Run: python3 tools/imagegen/test_gpu.py  (a temporary lock folder; no ComfyUI, no GPU, never the real /tmp lock)."""
import json, os, shutil, subprocess, sys, tempfile, time, unittest
from unittest.mock import patch

TMP = tempfile.TemporaryDirectory()
os.environ['IMAGEGEN_LOCK'] = os.path.join(TMP.name, 'gpu.lock')
os.environ['GPU_ROOT'] = TMP.name
HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gpu_priority  # noqa: E402
import gpu  # noqa: E402

ROOT = TMP.name
AGENT = 'claude-private/private-scene-art'
assert gpu.ROOT == ROOT


def wait_for(cond, timeout=3):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if cond():
            return True
        time.sleep(0.02)
    return cond()


class SessionTest(unittest.TestCase):
    def setUp(self):
        for p in (patch.object(gpu, 'comfy_up', return_value=False), patch.object(gpu, 'vram', return_value=None),
                  patch.object(gpu.Session, '_watch', lambda self: None),
                  patch.object(gpu.Session, '_boot', lambda self: self._set(state='on', message='ComfyUI is up.')),
                  patch.object(gpu.Session, 'POLL', 0.02)):
            p.start()
            self.addCleanup(p.stop)
        self.jobs = []
        self.s = gpu.Session(os.path.join(ROOT, f'session-{self.id()}.json'), lambda m: None)
        self.s.pending = lambda: list(self.jobs)
        self.addCleanup(self.clean)

    def clean(self):
        self.s.s['state'] = 'off'  # stops a waiting thread
        self.s._release()
        self.s._dequeue()
        gpu_priority.drop_priority(ROOT)
        gpu_priority.clear_yield(ROOT)
        for t in gpu_priority.read_queue(ROOT):
            gpu_priority.dequeue(t['path'])

    def other_job(self, owner='club-member-1', rank='render', since=None):
        """A ticket of another live process waiting for the GPU."""
        proc = subprocess.Popen(['sleep', '30'])
        self.addCleanup(proc.wait)
        self.addCleanup(proc.kill)
        return gpu_priority.enqueue(owner, rank, pid=proc.pid, root=ROOT, since=since)

    def owner(self):
        return gpu_priority.lock_owner(ROOT)

    def queue(self):
        lines = []
        gpu_priority.show_queue(ROOT, out=lines.append)
        return '\n'.join(lines)

    def test_a_test_copy_never_resumes_his_waiting_start(self):
        path = os.path.join(ROOT, 'session-live.json')
        with open(path, 'w') as f:
            f.write('{"state": "starting", "who": "", "his_start": true}')
        with patch.object(gpu.Session, 'start') as start:
            copy = gpu.Session(os.path.join(ROOT, 'session-copy.json'), lambda m: None, enabled=False)
            gpu.Session(path, lambda m: None)
        self.assertEqual(start.call_count, 1)  # only the live server picks his start back up
        self.assertEqual(copy.s['state'], 'off')
        self.assertFalse(copy.sync_priority())

    # ---------------------------------------------------------------- 1. priority only for his own renders
    def test_an_agent_job_takes_the_lock_without_the_priority(self):
        self.jobs.append((AGENT, time.time()))
        self.s.start(AGENT)
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.assertIsNone(gpu_priority.priority(ROOT))
        self.assertFalse(self.s.sync_priority())
        self.assertIsNone(gpu_priority.priority(ROOT))

    def test_an_agent_job_waits_its_turn_behind_an_older_render(self):
        other = self.other_job(since=time.time() - 60)
        self.jobs.append((AGENT, time.time()))
        self.s.start(AGENT)
        time.sleep(0.2)
        self.assertEqual(self.s.s['state'], 'starting')
        self.assertIsNone(self.owner())  # the lock is free, but the older render goes first
        self.assertIsNone(gpu_priority.priority(ROOT))
        self.assertIn(f'image service: {AGENT}', self.queue())
        gpu_priority.dequeue(other)  # the older job took its turn and finished
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.assertIn(AGENT, self.owner())

    def test_his_own_render_claims_the_priority_until_his_jobs_are_done(self):
        self.jobs.append(('', time.time()))
        self.s.start('')
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        rec = gpu_priority.priority(ROOT)
        self.assertEqual((rec or {}).get('pid'), os.getpid())
        self.assertIn("Jørgen's image gen dashboard", self.owner())
        self.jobs.clear()
        self.s.sync_priority()
        self.assertIsNone(gpu_priority.priority(ROOT))
        self.assertEqual(self.s.s['state'], 'on')  # the session itself stays until it is idle

    def test_his_render_still_makes_the_holder_yield(self):
        os.mkdir(os.path.join(ROOT, 'gpu.lock'))
        with open(os.path.join(ROOT, 'gpu.lock', 'owner'), 'w') as f:
            f.write('club-member-1\n')
        self.jobs.append(('', time.time()))
        self.s.start('')
        self.assertTrue(wait_for(lambda: gpu_priority.yield_request(ROOT) is not None))
        self.assertEqual(gpu_priority.yield_request(ROOT)['owner'], 'club-member-1')
        self.assertIsNotNone(gpu_priority.priority(ROOT))
        os.remove(os.path.join(ROOT, 'gpu.lock', 'owner'))
        os.rmdir(os.path.join(ROOT, 'gpu.lock'))  # the holder stopped
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.assertIsNone(gpu_priority.yield_request(ROOT))

    def test_a_new_holder_is_asked_too(self):
        lock = os.path.join(ROOT, 'gpu.lock')
        os.mkdir(lock)
        with open(os.path.join(lock, 'owner'), 'w') as f:
            f.write('club-member-1\n')
        self.jobs.append(('', time.time()))
        self.s.start('')
        self.assertTrue(wait_for(lambda: (gpu_priority.yield_request(ROOT) or {}).get('owner') == 'club-member-1'))
        with open(os.path.join(lock, 'owner'), 'w') as f:
            f.write('club-member-2\n')  # the lock changed hands meanwhile
        self.assertTrue(wait_for(lambda: (gpu_priority.yield_request(ROOT) or {}).get('owner') == 'club-member-2'))
        shutil.rmtree(lock)
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))

    def holder(self, mode, kept):
        """An exclusive GPU holder like withBrowserJob's gpuLock (place-budget-frame-<pid>): it takes gpu.lock through
        the queue, then works in steps, keeping each one in `kept`. 'checks' stops between steps; 'stuck' never
        checks, so the watcher's grace stops it. Either way it releases and exits 75 (exitDeferred)."""
        script = f"""
import fs from 'node:fs';
import {{ execFileSync }} from 'node:child_process';
import {{ watchGpuYield, YIELD_GRACE_MS }} from {json.dumps(os.path.join(TOOLS, 'lib/browser-gpu-slots.mjs'))};
import {{ exitDeferred }} from {json.dumps(os.path.join(TOOLS, 'lib/browser-job.mjs'))};
const lock = `place-budget-frame-${{process.pid}}`, py = {json.dumps(os.path.join(TOOLS, 'gpu_priority.py'))};
execFileSync('python3', [py, 'acquire', lock, '--pid', String(process.pid)], {{ stdio: 'ignore' }});
console.log(JSON.stringify({{ lock, grace: YIELD_GRACE_MS }}));
const watch = watchGpuYield(lock, {{ root: process.env.GPU_ROOT, pollMs: 50, graceMs: {mode == 'stuck' and 1500 or 'YIELD_GRACE_MS'}, log: () => {{}} }});
const steps = [];
const work = async () => {{
  for (let i = 0; i < 600; i++) {{
    if ({json.dumps(mode)} === 'checks') watch.checkpoint();
    await new Promise(r => setTimeout(r, 100));
    steps.push(i); fs.writeFileSync({json.dumps(kept)}, JSON.stringify(steps));
  }}
}};
await Promise.race([work(), watch.stopped]).catch(error => {{
  watch.close();
  execFileSync('python3', [py, 'release', lock], {{ stdio: 'ignore' }});
  exitDeferred(error);
}});
"""
        proc = subprocess.Popen(['node', '--input-type=module', '-e', script], stdout=subprocess.PIPE, text=True,
                                env={**os.environ, 'GPU_ROOT': ROOT})
        self.addCleanup(lambda: proc.poll() is None and proc.kill())
        info = json.loads(proc.stdout.readline())
        self.assertEqual(self.owner(), info['lock'])
        return proc, info

    def test_an_exclusive_holder_stops_for_his_render_and_keeps_what_it_did(self):
        for mode in ('checks', 'stuck'):
            with self.subTest(mode):
                kept = os.path.join(ROOT, f'kept-{mode}.json')
                proc, info = self.holder(mode, kept)
                self.assertLess(info['grace'], gpu.YIELD_GRACE * 1000)  # it lets go before the dashboard interrupts
                time.sleep(0.5)  # a few steps done
                logs = []
                self.s.log = logs.append
                self.jobs.append(('', time.time()))
                asked = time.time()
                self.s.start('')
                self.assertEqual(proc.wait(timeout=gpu.YIELD_GRACE), 75)  # deferred, within the grace period
                self.assertLess(time.time() - asked, gpu.YIELD_GRACE)
                self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
                self.assertIn("Jørgen's image gen dashboard", self.owner())
                self.assertTrue(any(f"GPU held by {info['lock']}: asked it to stop" in m for m in logs), logs)
                self.assertGreater(len(json.load(open(kept))), 0)  # the steps it finished are kept
                self.s.end('test over')
                self.jobs.clear()
                self.s.sync_priority()

    def test_his_render_during_an_agent_session_claims_the_priority(self):
        self.jobs.append((AGENT, time.time()))
        self.s.start(AGENT)
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.jobs.append(('', time.time()))
        self.assertTrue(self.s.sync_priority())
        self.assertIsNotNone(gpu_priority.priority(ROOT))
        self.s.serve('')
        self.assertIn("Jørgen's image gen dashboard", self.owner())

    # ---------------------------------------------------------------- 2. the lock and the queue name the agent
    def test_the_lock_and_the_queue_name_the_agent(self):
        self.jobs.append((AGENT, time.time()))
        self.s.start(AGENT)
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.assertEqual(self.owner(), gpu.owner_text(AGENT))
        self.assertIn(f'image service: {AGENT}', self.owner())
        out = self.queue()
        self.assertIn(f'held by imagegen-service (image service: {AGENT}', out)
        self.assertNotIn('Jørgen', out)
        self.s.serve('claude-main/art-round')  # the next job is another agent's
        self.assertIn('image service: claude-main/art-round', self.queue())
        self.assertTrue(gpu.owner_is_me())

    def test_an_agent_render_lets_an_older_waiting_job_go_first(self):
        created = time.time()
        self.other_job('animated-portraits-vace', since=created - 30)
        self.assertEqual([t['owner'] for t in self.s.ahead_of(created)], ['animated-portraits-vace'])
        self.assertEqual(self.s.ahead_of(created - 60), [])
        self.other_job('voices', 'voice')
        self.assertEqual(len(self.s.ahead_of(created - 60)), 1)  # a higher rank goes first whenever it came

    # ---------------------------------------------------------------- 3. an idle service lets the GPU go
    def test_an_idle_agent_session_releases_the_lock_soon(self):
        self.jobs.append((AGENT, time.time()))
        self.s.start(AGENT)
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.jobs.clear()
        self.s.s['last_activity'] = time.time() - 60
        self.s.check()
        self.assertEqual(self.s.s['state'], 'on')  # a minute idle: still warm for the agent's next batch
        self.s.s['last_activity'] = time.time() - gpu.IDLE_SHORT - 1
        self.s.check()
        self.assertEqual(self.s.s['state'], 'off')
        self.assertIsNone(self.owner())

    def test_a_busy_session_keeps_the_lock(self):
        self.jobs.append((AGENT, time.time()))
        self.s.start(AGENT)
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.s.s['last_activity'] = time.time() - gpu.IDLE_LIMIT - 1
        self.s.check()
        self.assertEqual(self.s.s['state'], 'on')

    def test_his_idle_session_keeps_the_lock_only_while_nobody_waits(self):
        self.s.start('')
        self.assertTrue(wait_for(lambda: self.s.s['state'] == 'on'))
        self.s.s['last_activity'] = time.time() - gpu.IDLE_SHORT - 1
        self.s.check()
        self.assertEqual(self.s.s['state'], 'on')
        self.other_job()
        self.s.check()
        self.assertEqual(self.s.s['state'], 'off')
        self.assertIsNone(self.owner())


if __name__ == '__main__':
    unittest.main()
