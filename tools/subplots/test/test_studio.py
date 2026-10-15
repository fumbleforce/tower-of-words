"""Image-to-scene tests use temporary state and service fixtures only."""
import base64
import copy
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import parse_qsl, urlsplit

spec = importlib.util.spec_from_file_location('subplot_api_studio_test', Path(__file__).parents[1] / 'api.py')
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=')


class StudioDrafts(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.env = patch.dict(os.environ, {'SUBPLOTS_STATE': str(self.root / 'state'), 'SUBPLOTS_PUBLIC_ONLY': '1'})
        self.env.start()
        self.addCleanup(self.env.stop)
        p = patch.object(api, 'ROOT', self.root)
        p.start()
        self.addCleanup(p.stop)
        api.REQUEST.private = False
        api.STATUS_CACHE.clear()
        (self.root / 'game3d/story').mkdir(parents=True)
        self.story = self.root / 'game3d/story/fixture.js'
        self.story.write_text("export default {nodes:{start:['> Unchanged.']}};")
        self.job = {'id': 'render-1', 'private': False, 'file': 'run/one.png', 'url': '/api/subplots/image/out/run/one.png',
                    'positive': 'a rainy station', 'negative': 'blurry', 'seed': 42, 'w': 896, 'h': 1152,
                    'steps': 24, 'cfg': 6, 'sampler': 'euler', 'scheduler': 'normal', 'model_file': 'fixture.safetensors',
                    'compose': {'environment': 'rain', 'camera': 'close', 'extra': 'a red umbrella'}}
        self.lookup = patch.object(api, 'image_render', side_effect=lambda image_id: copy.deepcopy(self.job) if image_id == self.job['id'] else (_ for _ in ()).throw(ValueError('Unavailable')))
        self.lookup.start()
        self.addCleanup(self.lookup.stop)
        p = patch.object(api, 'image_bytes', return_value=PNG)
        self.bytes = p.start()
        self.addCleanup(p.stop)

    def create(self, **kw):
        return api.dispatch('create-from-image', {'imageId': self.job['id'], 'title': 'The station', **kw})['id']

    def read(self, scene_id):
        return api.dispatch('read', {'id': scene_id})

    def test_create_catalog_edit_save_history_and_preserved_source(self):
        before = self.story.read_bytes()
        scene_id = self.create()
        scene = self.read(scene_id)
        self.assertTrue(scene['studioDraft'])
        self.assertEqual(scene['audience'], 'public')
        self.assertEqual(scene['steps'][0]['imageSlot'], 'image:0')
        self.assertEqual(scene['title'], 'The station')
        self.assertNotIn('sources', scene)
        self.assertIn(scene_id, [r['id'] for r in api.dispatch('catalog', {})['scenes']])
        source_job = api.dispatch('picture-source', {'id': scene_id, 'slot': 'image:0'})['job']
        self.assertEqual(source_job, {**self.job, 'url': scene['images'][0]['url'], 'status': 'done', 'deleted': False, 'raw_file': None})
        self.assertEqual(scene['images'][0]['savedPick'], scene['metadata']['images']['image:0'])
        self.assertEqual(api.dispatch('picture-source', {'id': scene_id, 'slot': 'image:0'})['start']['image'], scene['images'][0]['url'])
        self.assertTrue(api.public_only('read', {'id': scene_id}))
        with patch.object(api, 'image_render', side_effect=ValueError('Deleted')), patch.object(api, 'image_history', return_value=[]):
            preserved = api.dispatch('pictures', {'id': scene_id})['runs'][0]['renders'][0]
            self.assertEqual(preserved['positive'], 'a rainy station')
            self.assertEqual(preserved['status'], 'done')
            self.assertEqual(preserved['url'], scene['images'][0]['url'])
            scene['steps'].append({'narration': 'Rain settles on the empty platform.'})
            scene['metadata']['notes'] = 'Keep the umbrella.'
            saved = api.dispatch('save', scene)
            self.assertEqual(saved['steps'][-1]['narration'], 'Rain settles on the empty platform.')
            self.assertEqual(saved['metadata']['notes'], 'Keep the umbrella.')
            old = api.dispatch('history', {'id': scene_id, 'version': saved['history'][0]})
            self.assertEqual(len(old['steps']), 1)
            self.assertNotIn('sources', old)
            query = dict(parse_qsl(urlsplit(saved['metadata']['images']['image:0']['url']).query))
            self.assertEqual(api.studio_drafts().picture(query), (PNG, 'image/png'))
            restored = api.dispatch('save', {**saved, 'steps': old['steps'], 'metadata': old['metadata']})
            self.assertEqual(len(restored['steps']), 1)
        self.assertEqual(self.story.read_bytes(), before)

    def test_external_generation_evidence_survives_draft_save_and_source_lookup(self):
        self.job.update(seed=None,model_file=None,steps=None,cfg=None,sampler=None,scheduler=None,
                        provenance={'schema':1,'kind':'external','engine':'image_gen.imagegen','replay':False,
                                    'requested':{'prompt':'a rainy station','transparent_background':False},
                                    'observed':{'provider_output':'fixture.png'},'unavailable':['seed','cfg'],
                                    'output':{'path':'original.png','sha256':'a'*64,'width':1,'height':1},
                                    'references':[{'path':'first.png','sha256':'b'*64,'width':1,'height':1}]})
        original = copy.deepcopy(self.job)
        scene_id = self.create()
        scene = self.read(scene_id)
        scene['steps'].append({'narration':'The doors close.'})
        api.dispatch('save',scene)
        with patch.object(api,'image_render',side_effect=ValueError('Original no longer available')):
            source = api.dispatch('picture-source',{'id':scene_id,'slot':'image:0'})['job']
        self.assertEqual(source['provenance'],original['provenance'])
        self.assertEqual(source['positive'],original['positive'])
        self.assertIsNone(source['seed'])
        self.assertIsNone(source['model_file'])
        self.assertEqual(self.job,original)

    def test_discarded_pick_persists_saved_picture_and_empty_revisions_stay_empty(self):
        scene_id = self.create()
        scene = self.read(scene_id)
        scene['metadata']['images']['image:0'] = {'id': 'render-2'}
        # The shared Keep handler restores the adapter's saved pick before Save.
        scene['metadata']['images']['image:0'] = copy.deepcopy(scene['images'][0]['savedPick'])
        scene['metadata']['notes'] = 'Keep the saved picture.'
        with patch.object(api, 'image_render', side_effect=ValueError('Deleted')):
            saved = api.dispatch('save', scene)
        self.assertEqual(saved['metadata']['images']['image:0']['id'], 'render-1')
        self.assertEqual(saved['images'][0]['savedPick']['id'], 'render-1')
        empty = api.dispatch('save', {**saved, 'metadata': {**saved['metadata'], 'images': {}}})
        self.assertEqual(empty['metadata']['images'], {})
        self.assertEqual(empty['images'], [])
        filled = api.dispatch('save', {**empty, 'metadata': saved['metadata']})
        old = api.dispatch('history', {'id': scene_id, 'version': filled['history'][0]})
        restored = api.dispatch('save', {**filled, 'steps': old['steps'], 'metadata': old['metadata']})
        self.assertEqual(restored['metadata']['images'], {})
        self.assertEqual(restored['images'], [])

    def test_existing_history_rows_use_the_preserved_result_without_changing_service_data(self):
        self.job['raw_file'] = 'run/before-face-fix.png'
        scene_id = self.create()
        scene = self.read(scene_id)
        history = [{'run_id': 'original', 'renders': [{**self.job, 'deleted': True}]}]
        before = copy.deepcopy(history)
        with patch.object(api, 'image_history', return_value=history):
            render = api.dispatch('pictures', {'id': scene_id})['runs'][0]['renders'][0]
        self.assertEqual(history, before)
        self.assertEqual(render['url'], scene['images'][0]['url'])
        self.assertEqual(render['status'], 'done')
        self.assertFalse(render.get('deleted'))
        self.assertIsNone(render['raw_file'])

    def test_revisions_guard_save_validate_and_autosave(self):
        scene_id = self.create()
        first = self.read(scene_id)
        newer = api.dispatch('save', {**first, 'steps': first['steps'] + ['> New window.']})
        for action in ('save', 'draft', 'validate'):
            with self.subTest(action=action), self.assertRaisesRegex(ValueError, 'CONFLICT'):
                api.dispatch(action, first)
        newer['steps'].append('> Autosaved.')
        api.dispatch('draft', {**newer, 'at': 1234})
        self.assertEqual(self.read(scene_id)['draft']['steps'][-1], '> Autosaved.')
        self.assertNotIn('sources', self.read(scene_id)['draft'])
        self.assertEqual(len(self.read(scene_id)['steps']), 2)
        self.assertEqual(api.dispatch('validate', newer), {'ok': True})
        api.dispatch('draft', {**newer, 'discard': True})
        self.assertIsNone(self.read(scene_id)['draft'])

    def test_private_drafts_and_assets_never_open_in_public_mode(self):
        self.job['private'] = True
        with self.assertRaises(PermissionError):
            self.create()
        api.REQUEST.private = True
        scene_id = self.create()
        scene = self.read(scene_id)
        self.assertEqual(scene['audience'], 'private')
        public_alias = scene_id.replace(':private:', ':public:')
        api.REQUEST.private = False
        self.assertFalse(api.public_only('read', {'id': scene_id}))
        self.assertEqual(api.studio_drafts().rows(), [])
        for action in ('read', 'save', 'history', 'picture-source', 'pictures'):
            with self.subTest(action=action), self.assertRaises(PermissionError):
                api.dispatch(action, {'id': scene_id})
        with self.assertRaisesRegex(ValueError, 'not found'):
            self.read(public_alias)
        query = dict(parse_qsl(urlsplit(scene['metadata']['images']['image:0']['url']).query))
        with self.assertRaises(PermissionError):
            api.studio_drafts().picture(query)

    def test_save_resolves_new_picks_and_ignores_caller_paths(self):
        scene_id = self.create()
        scene = self.read(scene_id)
        self.job['id'] = 'render-2'
        self.job['positive'] = 'a sunny station'
        scene['metadata']['images']['image:0'] = {'id': 'render-2', 'url': 'https://untrusted/image', 'file': '../../secret'}
        scene['steps'][0]['imageUrl'] = 'https://untrusted/image'
        saved = api.dispatch('save', scene)
        self.assertNotIn('imageUrl', saved['steps'][0])
        pick = saved['metadata']['images']['image:0']
        self.assertEqual(pick['positive'], 'a sunny station')
        self.assertNotIn('file', pick)
        self.assertTrue(pick['url'].startswith('/api/subplots/draft-picture?'))
        api.REQUEST.private = True
        self.job.update(id='render-3', private=True)
        saved['metadata']['images']['image:0'] = {'id': 'render-3'}
        with self.assertRaises(PermissionError):
            api.dispatch('save', saved)
        self.assertEqual(self.read(scene_id)['metadata']['images']['image:0']['id'], 'render-2')

    def test_autosaved_image_survives_original_deletion(self):
        scene_id = self.create()
        scene = self.read(scene_id)
        self.job['id'] = 'render-2'
        scene['metadata']['images']['image:0'] = {'id': 'render-2'}
        api.dispatch('draft', scene)
        restored = self.read(scene_id)
        with patch.object(api, 'image_render', side_effect=ValueError('Deleted')):
            saved = api.dispatch('save', {**restored, **restored['draft']})
        self.assertEqual(saved['metadata']['images']['image:0']['id'], 'render-2')

    def test_invalid_inputs_and_failed_image_copy_leave_no_scene(self):
        for payload in ({'title': ''}, {'title': 'x' * 161}, {'imageId': '../image'}, {'imageId': 'missing'}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                self.create(**payload)
        self.bytes.return_value = b'<html>error</html>'
        with self.assertRaisesRegex(ValueError, 'supported picture'):
            self.create()
        self.assertEqual(api.studio_drafts().rows(), [])

    def test_draft_comments_are_local_and_keep_audience_guards(self):
        scene_id = self.create()
        with patch.object(api, 'comments', side_effect=AssertionError('Legacy comments must not be read')):
            comment = api.dispatch('comment', {'action': 'add', 'id': scene_id, 'text': 'A little more rain.', 'beat': {'path': [0]}})['comment']
            self.assertTrue(api.public_only('comment', {'comment': comment['id']}))
            self.assertEqual(api.dispatch('comments', {'ids': scene_id})['comments'][0]['text'], 'A little more rain.')
            api.dispatch('comment', {'action': 'done', 'comment': comment['id']})
            self.assertEqual(api.dispatch('comments', {'ids': scene_id})['comments'][0]['status'], 'done')
        self.assertFalse((self.root / 'island').exists())

    def test_service_asset_urls_refuse_escape_or_external_sources(self):
        # Call the original module function: the fixture patches the public callback only.
        original_spec = importlib.util.spec_from_file_location('subplot_unpatched_test', Path(api.__file__))
        original = importlib.util.module_from_spec(original_spec)
        original_spec.loader.exec_module(original)
        with patch.object(original.urllib.request, 'urlopen') as request:
            for url in ('https://example.org/image.png', '/api/subplots/image/repo/secret',
                        '/api/subplots/image/out/../secret', '/api/subplots/image/out/%2e%2e/secret',
                        '/api/subplots/image/out/%252e%252e/secret', '/api/subplots/image/out/a.png?token=x'):
                with self.subTest(url=url), self.assertRaises(ValueError):
                    original.image_bytes({'url': url})
            request.assert_not_called()


if __name__ == '__main__':
    unittest.main()
