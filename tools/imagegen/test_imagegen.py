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


class MadeBy(unittest.TestCase):
    """compose.mjs names its owner and round on the row; Jørgen's own UI rows keep neither, and only owned rows are agents'."""
    def setUp(self):
        reset()
        models = tempfile.TemporaryDirectory()
        self.addCleanup(models.cleanup)
        open(os.path.join(models.name, 'fixture.safetensors'), 'w').close()
        for name, value in (('MODELS_DIR', models.name), ('LORAS_DIR', models.name), ('CONTROL_DIR', models.name), ('log', lambda msg: None)):
            p = patch.object(server, name, value)
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(server.JOBS.clear)

    def test_queue_response_shows_the_owner_while_the_render_is_pending(self):
        srv = ThreadingHTTPServer(('127.0.0.1', 0), server.H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        self.addCleanup(srv.server_close)
        self.addCleanup(srv.shutdown)
        body = dict(positive='a reader', negative='', model_file='fixture.safetensors', w=64, h=64,
                    owner='claude-main/x', round='island/private/rounds/a')
        req = urllib.request.Request(f'http://127.0.0.1:{srv.server_port}/api/generate', json.dumps(body).encode(), {'content-type': 'application/json'})
        job = json.load(urllib.request.urlopen(req))['jobs'][0]
        self.assertEqual((job['owner'], job['round'], job['status']), ('claude-main/x', 'island/private/rounds/a', 'queued'))

    def logged(self, **extra):
        body = dict(positive='a reader by a window', negative='', model_file='fixture.safetensors', w=64, h=64, seed_mode='fixed', seed=7, **extra)
        _, (job,) = server.new_run(body)
        store.log_append(server.log_entry(job))
        return store.log_read()[-1]

    def test_agent_render_names_its_owner_and_round_on_its_row(self):
        row = self.logged(owner='claude-main/imagegen-owner-round', round='island/private/rewards/skimpy/aoi-3/round-1')
        self.assertEqual((row['owner'], row['round']), ('claude-main/imagegen-owner-round', 'island/private/rewards/skimpy/aoi-3/round-1'))
        self.assertNotIn('source', row)  # the pipeline stays the dashboard's: tools/verdict.py reads that

    def test_dashboard_render_row_has_no_owner_or_round(self):
        row = self.logged()
        self.assertNotIn('owner', row)
        self.assertNotIn('round', row)

    def test_agents_filter_counts_owned_rows_and_only_those(self):
        rows = [dict(id='ui-1', run_id='ui-1', idx=1, status='done', rating='safe', at='2026-10-16T10:00:00Z'),
                dict(id='cp-1', run_id='cp-1', idx=1, status='done', rating='safe', at='2026-10-16T10:01:00Z', owner='claude-main/x', round='island/private/rounds/a'),
                dict(id='old-1', run_id='old-1', idx=1, status='done', rating='safe', at='2026-10-16T10:02:00Z', source='agent', owner='backfill')]
        with patch.object(store, 'number_all'), patch.object(store, 'log_read', return_value=rows), patch.object(server, '_exists', return_value=True):
            agents = {r['run_id'] for r in server.history({'who': 'agents'})}
            mine = {r['run_id'] for r in server.history({'who': 'mine'})}
            by_run = {r['run_id']: r for r in server.history({})}
        self.assertEqual((agents, mine), ({'cp-1', 'old-1'}, {'ui-1'}))
        self.assertEqual((by_run['cp-1']['owner'], by_run['cp-1']['round']), ('claude-main/x', 'island/private/rounds/a'))

    def test_starred_renders_that_an_agent_made_are_not_yours_for_portraits(self):
        rows = [dict(id='ui-1', run_id='ui-1', idx=1, status='done', rating='safe', file='2026-10-16/ui.webp', star=True),
                dict(id='cp-1', run_id='cp-1', idx=1, status='done', rating='safe', file='2026-10-16/cp.webp', star=True, owner='claude-main/x')]
        with tempfile.TemporaryDirectory() as repo, patch.object(store, 'REPO', repo), patch.object(store, 'PORTRAITS', os.path.join(repo, 'none')), \
                patch.object(store, 'log_read', return_value=rows):
            yours = [c['path'] for c in server.portrait_choices() if c['group'] == 'Your starred renders']
        self.assertEqual(yours, ['island/private/imagegen/outputs/2026-10-16/ui.webp'])


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


class CreateFromImage(unittest.TestCase):
    def setUp(self):
        reset()
        from pathlib import Path
        self.picture = Path(store.OUTPUTS) / 'fixture.png'
        self.picture.parent.mkdir(parents=True, exist_ok=True)
        self.picture.write_bytes(b'fixture image bytes')
        self.row = dict(id='selected', run_id='run', status='done', file='fixture.png', rating='safe', seed=123,
                        positive='A person reading', negative='watermark', compose={'scene': 'reading'})
        store.log_append(self.row)
        self.srv = ThreadingHTTPServer(('127.0.0.1', 0), server.H)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.addCleanup(self.srv.server_close)
        self.addCleanup(self.srv.shutdown)
        self.base = f'http://127.0.0.1:{self.srv.server_port}'

    def test_lookup_and_shared_routes_use_the_same_record(self):
        for prefix in ('', '/api/subplots/image'):
            row = json.load(urllib.request.urlopen(self.base + prefix + '/api/render/selected'))
            self.assertEqual(row['seed'], 123)
            self.assertEqual(row['compose'], {'scene': 'reading'})
            self.assertFalse(row['private'])
        module = urllib.request.urlopen(self.base + '/tools/subplots/web/images.js').read()
        self.assertIn(b'installImages', module)

    def test_character_keeps_its_own_portrait_and_unique_versioned_preset(self):
        from pathlib import Path
        body = {'imageId': 'selected', 'data': {'name': 'Fixture reader', 'look': 'dark curly hair', 'outfit': 'blue coat'}}
        a = server.image_actions.create_character(body)
        b = server.image_actions.create_character(body)
        self.assertNotEqual(a['id'], b['id'])
        data = a['versions'][0]['data']
        self.assertEqual(data['sourceImage']['id'], 'selected')
        self.assertEqual(data['look'], 'dark curly hair')
        self.assertEqual(len(a['versions']), 1)
        self.picture.unlink()
        portrait = Path(store.PORTRAITS) / data['portrait'].split('/')[-1]
        self.assertEqual(portrait.read_bytes(), b'fixture image bytes')

    def test_private_selection_cannot_be_downgraded_or_seen_in_public_mode(self):
        with patch.object(server.image_actions.privacy, 'is_private_render', return_value=True):
            with self.assertRaisesRegex(ValueError, 'private mode'):
                server.image_actions.selected_image('selected')
            made = server.image_actions.create_character({'imageId': 'selected', 'private': False,
                'data': {'name': 'Private fixture', 'look': 'curly hair'}}, private=True)
        self.assertTrue(made['private'])
        name = made['versions'][0]['data']['portrait'].split('/')[-1]
        self.assertFalse(server.image_actions.portrait_visible(name))
        self.assertTrue(server.image_actions.portrait_visible(name, private=True))
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(self.base + '/api/subplots/image/priv/portraits/' + name)
        self.assertEqual(error.exception.code, 404)

    def test_missing_deleted_and_path_escape_images_are_refused(self):
        for changes in ({'deleted': True}, {'file': '../fixture.png'}, {'file': 'missing.png'}):
            with patch.object(store, 'log_read', return_value=[{**self.row, **changes}]):
                with self.assertRaises(ValueError):
                    server.image_actions.selected_image('selected')
        with self.assertRaises(ValueError):
            server.image_actions.selected_image('../../private')
        self.assertFalse(server.image_actions.portrait_visible('../config.json'))

    def test_creation_rejects_foreign_origin_and_leaves_no_preset(self):
        body = json.dumps({'imageId': 'selected', 'data': {'name': 'Do not create', 'look': 'hair'}}).encode()
        request = urllib.request.Request(self.base + '/api/subplots/image/api/character-from-image', body,
                                        {'Content-Type': 'application/json', 'Origin': 'https://example.invalid'})
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request)
        self.assertEqual(error.exception.code, 403)
        self.assertIsNone(store.load('character', 'do-not-create'))

    def test_saved_draft_picture_is_an_authorized_durable_img2img_source(self):
        import hashlib
        import io
        raw = b'\x89PNG\r\n\x1a\nfixture'
        asset = hashlib.sha256(raw).hexdigest()
        reference = '/api/subplots/draft-picture?' + urllib.parse.urlencode({'id': 'studio:public:' + 'a' * 32, 'asset': asset})
        with patch.object(server.image_actions.urllib.request, 'urlopen', return_value=io.BytesIO(raw)) as download:
            start = server._clean_start({'image': reference, 'denoise': 0.3}, False)
        self.assertTrue(start['image'].startswith('island/private/imagegen/portraits/scene-public-'))
        self.assertEqual(server._picture(start['image'], False), start['image'])
        self.assertEqual(download.call_args.args[0].host, '127.0.0.1:8771')
        private_ref = reference.replace('studio%3Apublic', 'studio%3Aprivate')
        with patch.object(server.image_actions.urllib.request, 'urlopen') as download:
            with self.assertRaisesRegex(ValueError, 'private mode'):
                server._picture(private_ref, False)
            download.assert_not_called()
        for invalid in ('https://example.invalid' + reference, reference.replace(asset, '../escape')):
            with self.assertRaises(ValueError):
                server.image_actions.draft_picture(invalid, True)


class AlwaysOnNegatives(unittest.TestCase):
    """The permanent words (web/always-negative.json, #667) reach every job, whatever negative the caller sent."""
    def setUp(self):
        reset()
        models = tempfile.TemporaryDirectory()
        self.addCleanup(models.cleanup)
        open(os.path.join(models.name, 'fixture.safetensors'), 'w').close()
        for name, value in (('MODELS_DIR', models.name), ('log', lambda msg: None)):
            p = patch.object(server, name, value)
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(server.JOBS.clear)

    def test_the_permanent_list_is_child_loli_and_the_shaved_side_terms(self):
        self.assertEqual(server.ALWAYS_NEG, ['child', 'loli', 'undercut', 'shaved sides', 'side shave', 'buzzed sides', 'sidecut'])

    def test_every_job_gets_the_words_it_lacks_and_keeps_its_own(self):
        always = ', '.join(server.ALWAYS_NEG)
        self.assertEqual(server.ensure_negative(''), always)
        self.assertEqual(server.ensure_negative('watermark'), f'watermark, {always}')
        self.assertEqual(server.ensure_negative('Undercut, watermark'), f'Undercut, watermark, child, loli, shaved sides, side shave, buzzed sides, sidecut')
        _, (job,) = server.new_run(dict(positive='a reader', negative='watermark', model_file='fixture.safetensors', w=64, h=64, seed_mode='fixed', seed=7))
        self.assertEqual(job['negative'], f'watermark, {always}')


if __name__ == '__main__':
    unittest.main()
