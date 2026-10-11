"""Tests for the dashboard's render numbering, scoped cancel and session end, and tools/verdict.py's lookup of
dashboard renders. Run: python3 -m unittest tools/imagegen/test_imagegen.py  (a temp data folder, no GPU, no real dashboard).
compose.mjs's side (private cookie, loud download failure, scoped --end-session) is in tools/subplots/test/compose.test.mjs."""
import json, os, sys, tempfile, threading, unittest, urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

TMP = tempfile.TemporaryDirectory()
os.environ['IMAGEGEN_ROOT'] = TMP.name
os.environ['IMAGEGEN_PORT'] = '18772'  # not 8772: server.py then runs as a test copy
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import store, server  # noqa: E402
import verdict  # noqa: E402


def reset():
    if os.path.exists(store.LOG):
        os.remove(store.LOG)


class Numbering(unittest.TestCase):
    def setUp(self):
        reset()

    def test_job_entry_with_empty_n_is_numbered(self):
        # the dashboard bug: log_entry copies the job's n (None), and log_append used to skip numbering for it
        job = dict(id='a1', run_id='r1', idx=1, status='done', seed=5, file='x.webp')
        first = store.log_append(server.log_entry(job))
        second = store.log_append(server.log_entry(dict(job, id='a2')))
        self.assertEqual((first['n'], second['n']), (1, 2))
        self.assertEqual([r['n'] for r in store.log_read()], [1, 2])

    def test_given_number_is_kept(self):
        store.log_append(dict(id='h', n=15))
        store.log_append(dict(id='a', n=None))
        self.assertEqual([r['n'] for r in store.log_read()], [15, 16])

    def test_number_all_fills_gaps_in_log_order_and_keeps_hand_numbers(self):
        for e in (dict(id='a', n=10), dict(id='b', n=0), dict(id='c', n=20), dict(id='d'), dict(id='e', n=12)):
            with open(store.LOG, 'a') as f:
                f.write(json.dumps(e) + '\n')
        self.assertEqual(store.number_all(), 2)
        self.assertEqual({r['id']: r['n'] for r in store.log_read()}, dict(a=10, b=21, c=20, d=22, e=12))


class Jobs(unittest.TestCase):
    def setUp(self):
        self.srv = ThreadingHTTPServer(('127.0.0.1', 0), server.H)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.addCleanup(self.srv.server_close)
        self.addCleanup(self.srv.shutdown)
        server.JOBS[:] = [dict(id=i, status=s) for i, s in (('mine1', 'queued'), ('mine2', 'queued'), ('other', 'queued'), ('run', 'running'))]
        self.addCleanup(server.JOBS.clear)

    def post(self, path, body):
        req = urllib.request.Request(f'http://127.0.0.1:{self.srv.server_port}{path}', json.dumps(body).encode(), {'content-type': 'application/json'})
        return json.load(urllib.request.urlopen(req))

    def status(self):
        return {j['id']: j['status'] for j in server.JOBS}

    def test_cancel_with_ids_leaves_other_jobs(self):
        self.post('/api/cancel', {'ids': ['mine1', 'mine2']})
        self.assertEqual(self.status(), dict(mine1='cancelled', mine2='cancelled', other='queued', run='running'))

    def test_cancel_without_ids_still_cancels_all(self):
        self.post('/api/cancel', {})
        self.assertEqual(self.status(), dict(mine1='cancelled', mine2='cancelled', other='cancelled', run='running'))

    def test_end_session_if_idle_does_nothing_while_jobs_wait(self):
        r = self.post('/api/session/end', {'if_idle': True})
        self.assertIs(r['ended'], False)
        self.assertEqual(self.status(), dict(mine1='queued', mine2='queued', other='queued', run='running'))

    def test_end_session_if_idle_ends_when_idle(self):
        ended = []
        real = server.session.end
        server.session.end = lambda why: ended.append(why)
        self.addCleanup(setattr, server.session, 'end', real)
        for j in server.JOBS:
            j['status'] = 'done'
        self.assertTrue(self.post('/api/session/end', {'if_idle': True})['ok'])
        threading.Event().wait(0.3)
        self.assertEqual(len(ended), 1)


class HistoryOrder(unittest.TestCase):
    def history(self, rows, **query):
        with patch.object(store, 'number_all'), patch.object(store, 'log_read', return_value=rows), patch.object(server, '_exists', return_value=True):
            return server.history(query)

    def row(self, rid, at, idx=1):
        return dict(id=f'{rid}-{idx}', run_id=rid, idx=idx, status='done', rating='safe', at=at)

    def test_a_batch_is_paged_by_its_newest_picture_with_individual_times_preserved(self):
        rows = [self.row('a', '2026-10-11T10:00:00Z'), self.row('b', '2026-10-11T10:01:00Z'),
                self.row('a', '2026-10-11T10:02:00Z', 2)]
        first = self.history(rows, limit=1)[0]
        self.assertEqual(first['run_id'], 'a')
        self.assertEqual(first['at'], rows[2]['at'])
        self.assertEqual([r['at_epoch'] for r in first['renders']], [server.history_time(rows[0]['at']), server.history_time(rows[2]['at'])])
        self.assertEqual([r['idx'] for r in first['renders']], [1, 2])
        second = self.history(rows, before=first['at'], before_run=first['run_id'], limit=1)
        self.assertEqual(second[0]['run_id'], 'b')

    def test_pagination_does_not_drop_batches_finished_in_the_same_second(self):
        rows = [dict(self.row(rid, '2026-10-11T10:00:00Z'), n=n) for n, rid in enumerate(['c', 'b', 'a'], 1)]
        seen, cursor = [], {}
        for _ in range(4):
            page = self.history(rows, limit=1, **cursor)
            if page:
                seen.append(page[0]['run_id'])
                cursor = dict(before=page[0]['at'], before_n=page[0]['last_n'], before_run=page[0]['run_id'])
        self.assertEqual(seen, ['a', 'b', 'c'])

    def test_mixed_timezone_dates_sort_by_time(self):
        rows = [self.row('earlier', '2026-10-11T12:00:00+02:00'), self.row('later', '2026-10-11T10:01:00Z')]
        self.assertEqual([r['run_id'] for r in self.history(rows)], ['later', 'earlier'])

    def test_picture_pages_interleave_batches_without_old_members_before_newer_pages(self):
        rows = [dict(self.row(rid, at, idx), n=n) for n, (rid, at, idx) in enumerate([
            ('a', '2026-10-11T10:00:00Z', 1), ('b', '2026-10-11T10:01:00Z', 1),
            ('a', '2026-10-11T10:02:00Z', 2), ('a', '2026-10-11T10:02:00Z', 3),
        ], 1)]
        seen, cursor = [], {}
        for _ in range(5):
            page = self.history(rows, pictures='1', limit=1, **cursor)
            if page:
                self.assertEqual(len(page[0]['renders']), 1)
                seen.append(page[0]['renders'][0]['id'])
                cursor = dict(before=page[0]['at'], before_n=page[0]['last_n'], before_run=page[0]['run_id'])
        self.assertEqual(seen, ['a-3', 'a-2', 'b-1', 'a-1'])

    def test_live_jobs_keep_submission_and_completion_times(self):
        job = dict(id='job', created=12, status='queued')
        queued = server.public_job(job)
        self.assertEqual(queued['created'], 12)
        self.assertNotIn('at', queued)
        self.assertNotIn('at_epoch', queued)
        job.update(status='done', at='2026-10-11T10:00:00.900000Z')
        done = server.public_job(job)
        self.assertEqual(done['at'], job['at'])
        self.assertEqual(done['at_epoch'], server.history_time(job['at']))
        self.assertEqual(server.log_entry(job)['at'], job['at'])


class Verdict(unittest.TestCase):
    ROWS = [dict(id='abc123', n=7, file='2026-10-11/a.webp', source=None), dict(id='abc12345', n=8, file='2026-10-11/b.webp'),
            dict(id='old1', n=9, source='agent', out_path='rewards/r1-x.png', at='1'), dict(id='gone', n=10, deleted=True)]

    def test_by_number_and_by_id(self):
        self.assertEqual(verdict.find_record('#7', self.ROWS)['id'], 'abc123')
        self.assertEqual(verdict.find_record('8', self.ROWS)['id'], 'abc12345')
        self.assertEqual(verdict.find_record('abc12345', self.ROWS)['n'], 8)
        self.assertIsNone(verdict.find_record('#10', self.ROWS))

    def test_by_saved_file_name_prefers_the_longest_id(self):
        self.assertEqual(verdict.find_record('/somewhere/close-1-abc12345-s99.png', self.ROWS)['id'], 'abc12345')
        self.assertEqual(verdict.find_record('/somewhere/close-1-abc123-s99.png', self.ROWS)['id'], 'abc123')
        self.assertIsNone(verdict.find_record('/somewhere/nothing.png', self.ROWS))

    def test_verdict_writes_the_dashboard_row(self):
        reset()
        verdict._imagegen = lambda: (None, store)
        store.log_append(dict(id='zz9', n=None, status='done'))
        self.assertEqual(verdict.verdict('#1', True, 'belted', ['outfit']), 'zz9')
        r = store.log_read()[0]
        self.assertTrue(r['reject'])
        self.assertEqual((r['reject_reason'], r['faults']), ('belted', ['outfit']))
        self.assertIsNone(verdict.verdict('#99', True, 'x'))


if __name__ == '__main__':
    unittest.main()
