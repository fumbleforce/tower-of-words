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
        self.assertEqual(api.dispatch('picture-source', {'id': scene_id, 'slot': 'image:0'})['job'], self.job)
        self.assertEqual(api.dispatch('picture-source', {'id': scene_id, 'slot': 'image:0'})['start']['image'], scene['images'][0]['url'])
        self.assertTrue(api.public_only('read', {'id': scene_id}))
        with patch.object(api, 'image_render', side_effect=ValueError('Deleted')), patch.object(api, 'image_history', return_value=[]):
            self.assertEqual(api.dispatch('pictures', {'id': scene_id})['runs'][0]['renders'][0]['positive'], 'a rainy station')
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
