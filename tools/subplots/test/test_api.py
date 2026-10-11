import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('subplot_api', Path(__file__).parents[1] / 'api.py')
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

class Saves(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'game3d/story').mkdir(parents=True)
        self.file = self.root / 'game3d/story/test.js'
        self.file.write_text("export default {nodes:{hello:['a: Hello'],other:['b: Keep']}};")
        self.env = patch.dict(os.environ, {'SUBPLOTS_STATE': str(self.root / 'state'), 'SUBPLOTS_PUBLIC_ONLY':'1'})
        self.env.start(); self.addCleanup(self.env.stop)
        self.root_patch = patch.object(api, 'ROOT', self.root)
        self.root_patch.start(); self.addCleanup(self.root_patch.stop)
        self.id = 'public:game3d/story/test.js#hello'

    def read(self):
        return api.dispatch('read', {'id':self.id})

    def test_story_map_follows_a_saved_way_in(self):
        self.file.write_text("export default {on:{'talk:a':'hello'},nodes:{hello:['a: Hello'],other:['b: Keep']}};")
        row = lambda: next(s for s in api.dispatch('map', {})['scenes'] if s['id'] == self.id)
        self.assertEqual(row()['entries'], [{'event': 'talk:a', 'condition': '', 'once': False}])
        old = self.read()
        api.dispatch('save', {**old, 'entries': [{'event': 'talk:a', 'condition': "period == 'lunch'", 'once': True}]})
        self.assertIn("""'talk:a':{ if: "period == 'lunch'", node: 'hello', once: true }""", self.file.read_text())
        self.assertEqual(row()['entries'], [{'event': 'talk:a', 'condition': "period == 'lunch'", 'once': True}])

    def test_a_new_scene_from_a_template_is_written_and_readable(self):
        place = self.root / 'game3d/story/day2/office.js'
        place.parent.mkdir(parents=True)
        place.write_text("export default {on:{'talk:mio':'hello'},nodes:{hello:['mio: Hi.']}};\n")
        made = api.dispatch('create', {'day': 2, 'place': 'office', 'template': 'exchange', 'title': 'Lunch plans', 'event': 'talk:emi', 'who': 'emi', 'name': 'Emi'})
        self.assertEqual(made['id'], 'public:game3d/story/day2/office.js#lunch_plans')
        self.assertIn("'talk:emi': 'lunch_plans'", place.read_text())
        self.assertEqual(api.dispatch('read', {'id': made['id']})['steps'][0]['text'], '(What Emi says.)')
        with self.assertRaisesRegex(ValueError, 'no story file'):
            api.dispatch('create', {'day': 4, 'place': 'office', 'template': 'look', 'title': 'x', 'event': 'talk:desk'})

    def test_save_history_and_conflict(self):
        old=self.read(); edit={**old,'steps':[{'say':'a','text':'Changed'}],'metadata':{'notes':'An idea'}}
        saved=api.dispatch('save',edit)
        self.assertIn('Changed',self.file.read_text())
        self.assertIn("other:['b: Keep']",self.file.read_text())
        self.assertEqual(saved['metadata']['notes'],'An idea')
        before=api.dispatch('history',{'id':self.id,'version':saved['history'][0]})
        self.assertEqual(before['steps'],['a: Hello'])
        with self.assertRaisesRegex(ValueError,'CONFLICT'):api.dispatch('save',edit)

    def test_story_check_refuses_a_save_and_voice_lines_are_listed(self):
        tools = self.root / 'game3d/tools'; tools.mkdir(parents=True)
        # stand-ins for the public checks: a problem when the story says BROKEN, and no clip for any line
        (tools / 'story-check.mjs').write_text("import fs from 'node:fs';const s=fs.readFileSync('game3d/story/test.js','utf8');"
            "console.log(s.includes('BROKEN')?'story/test.js: hello: unknown speaker zed':'story check: ok');")
        (tools / 'day9-story-check.mjs').write_text("import fs from 'node:fs';import assert from 'node:assert/strict';"
            "assert(!fs.readFileSync('game3d/story/test.js','utf8').includes('BROKEN'), 'test/hello: missing nowhere');")
        (tools / 'voice-manifest.mjs').write_text("if(process.argv.includes('--check'))console.log('NO CLIP ln-1 a: Fine now');")
        old = self.read(); source = self.file.read_text()
        with self.assertRaises(api.CheckFailed) as caught:
            api.dispatch('save', {**old, 'steps': ['zed: BROKEN']})
        self.assertEqual(caught.exception.problems, ['hello: missing nowhere', 'hello: unknown speaker zed'])
        self.assertEqual(self.file.read_text(), source)
        self.assertEqual(self.read()['history'], [])
        saved = api.dispatch('save', {**old, 'steps': ['a: Fine now']})
        self.assertIn('Fine now', self.file.read_text())
        self.assertEqual(saved['unvoiced'], [{'speaker': 'a', 'text': 'Fine now'}])

    def test_draft_does_not_touch_source(self):
        old=self.file.read_text(); edit=self.read();edit['steps']=['a: Draft']
        api.dispatch('draft',edit)
        self.assertEqual(self.file.read_text(),old)
        self.assertEqual(self.read()['draft']['steps'],['a: Draft'])

    def test_metadata_change_invalidates_other_editor(self):
        old=self.read();api.dispatch('save',{**old,'metadata':{'notes':'First window'}})
        with self.assertRaisesRegex(ValueError,'CONFLICT'):api.dispatch('save',{**old,'metadata':{'notes':'Second'}})

    def test_metadata_failure_rolls_back_source(self):
        old=self.read(); source=self.file.read_text();write=api.atomic
        def fail(path,data):
            if path.name=='metadata.json':raise OSError('disk full')
            return write(path,data)
        with patch.object(api,'atomic',fail),self.assertRaises(OSError):
            api.dispatch('save',{**old,'steps':['a: Changed']})
        self.assertEqual(self.file.read_text(),source)

    def test_authoring_cache_refreshes_when_story_source_changes(self):
        with patch.object(api.subprocess, 'run', wraps=api.subprocess.run) as run:
            first = api.dispatch('authoring', {})
            second = api.dispatch('authoring', {})
            self.assertEqual(run.call_count, 1)
            self.assertEqual(first, second)
            self.file.write_text("export default {nodes:{new_scene:[]}};")
            updated = api.dispatch('authoring', {})
            self.assertEqual(run.call_count, 2)
            self.assertEqual(updated['nodes'][0]['title'], 'New scene')

    def test_image_reference_proxy_rejects_escape_before_contacting_service(self):
        paths = ['/repo/island/private/rewards/library/fixture-1/image.png', '/repo/../forbidden.png',
                 '/repo/./island/private/rewards/library/fixture-1/image.png',
                 '/repo/%2e%2e/forbidden.png', '/repo/%252e%252e/forbidden.png',
                 '/priv/portraits/../forbidden.png']
        with patch.object(api.urllib.request, 'urlopen') as request:
            for path in paths:
                with self.subTest(path=path), self.assertRaises(ValueError):
                    api.image_proxy(None, path)
            request.assert_not_called()

    def test_private_adapter_never_runs_in_qa(self):
        with self.assertRaisesRegex(ValueError,'not configured'):api.dispatch('catalog',{'scope':'local'})

class ScenePictures(unittest.TestCase):
    def test_keys_shared_by_a_scene_and_its_rounds(self):
        self.assertEqual(api.picture_key('encounters/d1-copier-s02c.webp'), 'copier')
        self.assertEqual(api.picture_key('island/private/rewards/day1/copier-2'), 'copier')
        self.assertEqual(api.picture_key('peeks/mio-bench-3'), 'mio-bench')
        self.assertEqual(api.picture_key('encounters/d1-gate-search-s01-sk.webp'), 'gate-search')
        self.assertEqual(api.picture_key('d1'), '')

    def test_runs_matched_from_rounds_names_picks_and_the_composer(self):
        runs = [
            {'run_id': 'a', 'round': 'island/private/rewards/peeks/emi-office-11', 'renders': [{'id': 'a1'}]},
            {'run_id': 'b', 'round': 'island/private/rewards/peeks/emi-office-13', 'renders': [{'id': 'b1'}]},
            {'run_id': 'c', 'round': 'island/private/rewards/days/aoi-counter-1', 'renders': [{'id': 'c1'}]},
            {'run_id': 'd', 'round': None, 'compose': {'subplotId': 'local:x:emi_look:start'}, 'renders': [{'id': 'd1'}]},
            {'run_id': 'e', 'round': None, 'renders': [{'id': 'e1'}]},
            {'run_id': 'f', 'round': None, 'renders': [{'id': 'f1'}]},
        ]
        found = {'rounds': ['island/private/rewards/peeks/emi-office-11'], 'scene': 'emi_look', 'files': ['encounters/emi-look-1.webp'],
                 'metadata': {'images': {'image:0': {'id': 'e1'}}}}
        got = [r['run_id'] for r in api.scene_runs('local:x:emi_look:start', runs, found)]
        self.assertEqual(got, ['a', 'b', 'd', 'e'])

    def test_renders_made_under_an_old_place_based_id_name_the_shot_now(self):
        scene = 'local:x:emi_look:start'
        runs = [{'run_id': 'a', 'compose': {'subplotId': scene, 'imageSlot': 'image:1'},
                 'renders': [{'id': 'a1', 'compose': {'subplotId': scene, 'imageSlot': 'image:1'}}, {'id': 'a2'}]},
                {'run_id': 'b', 'renders': [{'id': 'b1', 'compose': {'subplotId': 'local:x:other:start', 'imageSlot': 'image:1'}}]}]
        images = [{'id': 'file:encounters/a.webp', 'aliases': ['image:0']}, {'id': 'pic:emi.2', 'aliases': ['image:1']}]
        got = api.as_shot_ids(scene, runs, images)
        self.assertEqual(got[0]['compose']['imageSlot'], 'pic:emi.2')
        self.assertEqual(got[0]['renders'][0]['compose']['imageSlot'], 'pic:emi.2')
        self.assertEqual(got[0]['renders'][1], {'id': 'a2'})
        self.assertEqual(got[1]['renders'][0]['compose']['imageSlot'], 'image:1')
        self.assertEqual(runs[0]['compose']['imageSlot'], 'image:1')  # the history's own records are not changed

if __name__=='__main__':unittest.main()
