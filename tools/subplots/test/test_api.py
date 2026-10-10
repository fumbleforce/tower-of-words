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

    def test_save_history_and_conflict(self):
        old=self.read(); edit={**old,'steps':[{'say':'a','text':'Changed'}],'metadata':{'notes':'An idea'}}
        saved=api.dispatch('save',edit)
        self.assertIn('Changed',self.file.read_text())
        self.assertIn("other:['b: Keep']",self.file.read_text())
        self.assertEqual(saved['metadata']['notes'],'An idea')
        before=api.dispatch('history',{'id':self.id,'version':saved['history'][0]})
        self.assertEqual(before['steps'],['a: Hello'])
        with self.assertRaisesRegex(ValueError,'CONFLICT'):api.dispatch('save',edit)

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

    def test_private_adapter_never_runs_in_qa(self):
        with self.assertRaisesRegex(ValueError,'not configured'):api.dispatch('catalog',{'scope':'local'})

if __name__=='__main__':unittest.main()
