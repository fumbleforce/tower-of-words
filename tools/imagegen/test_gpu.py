"""The image service's GPU session (tools/imagegen/gpu.py, #687): gpu.priority only for Jørgen's own renders, the
lock owner names the agent it renders for, and an idle session lets the GPU go.
Run: python3 tools/imagegen/test_gpu.py  (a temporary lock folder; no ComfyUI, no GPU, never the real /tmp lock)."""
import os, subprocess, sys, tempfile, time, unittest
from unittest.mock import patch

TMP = tempfile.TemporaryDirectory()
os.environ['IMAGEGEN_LOCK'] = os.path.join(TMP.name, 'gpu.lock')
os.environ['GPU_ROOT'] = TMP.name
HERE = os.path.dirname(os.path.abspath(__file__))
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
