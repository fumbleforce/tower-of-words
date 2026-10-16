"""Scene associations for agent and dashboard renders, using a temporary log and no generator."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools.imagegen import agentlog

store = agentlog.store


class SceneAssociation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for key, value in {'ROOT': str(self.root), 'LOG': str(self.root / 'log.jsonl'),
                           'OUTPUTS': str(self.root / 'outputs'), 'THUMBS': str(self.root / 'thumbs')}.items():
            p = patch.object(store, key, value)
            p.start()
            self.addCleanup(p.stop)
        self.scene = 'local:fixture:reading:look'
        self.slot = 'pic:fixture.1'

    def append(self, **fields):
        row = dict(id='one', source='agent', owner='fixture-worker', positive='Reading beside a desk',
                   compose=None, note='Keep this note', star=True, reject=False, custom={'keep': [1, 2]})
        row.update(fields)
        return store.log_append(row)

    def test_add_preserves_composition_and_agent_provenance(self):
        from PIL import Image
        image = self.root / 'render.png'
        Image.new('RGB', (16, 20)).save(image)
        compose = {'subplotId': self.scene, 'imageSlot': self.slot, 'people': {'reader': {'clothing': 'coat'}}}
        rid = agentlog.add({'compose': compose, 'owner': 'fixture-worker', 'round': 'fixture-1'}, str(image), copy=False)
        compose['people']['reader']['clothing'] = 'mutated caller'
        row = store.log_read()[0]
        self.assertEqual(row['id'], rid)
        self.assertEqual(row['compose']['people']['reader']['clothing'], 'coat')
        self.assertEqual((row['source'], row['owner'], row['round']), ('agent', 'fixture-worker', 'fixture-1'))
        self.assertIsNone(agentlog.add({'compose': {}}, str(image), copy=False))
        self.assertEqual(len(store.log_read()), 1)

    def test_one_dashboard_or_agent_record_changes_only_its_association(self):
        for source in ('agent', None):
            with self.subTest(source=source):
                Path(store.LOG).unlink(missing_ok=True)
                old = self.append(source=source, compose={'subplotId': 'fixture', 'seed': 123, 'people': {'reader': {}}})
                other = self.append(id='two', compose={'subplotId': 'different'})
                changed = agentlog.associate('one', self.scene, self.slot, expected_compose=old['compose'])
                expected = copy.deepcopy(old)
                expected['compose'].update(subplotId=self.scene, imageSlot=self.slot)
                self.assertEqual(changed, expected)
                self.assertEqual(store.log_read(), [expected, other])
                before = Path(store.LOG).read_bytes()
                agentlog.associate('one', self.scene, self.slot, expected_compose=old['compose'])
                self.assertEqual(Path(store.LOG).read_bytes(), before)

    def test_stale_caller_does_not_overwrite_concurrent_changes(self):
        self.append(compose={'scene': 'Original'})
        expected = store.log_read()[0]['compose']
        store.log_set('one', {'compose': {'scene': 'Changed by editor'}, 'fav': True})
        before = Path(store.LOG).read_bytes()
        with self.assertRaisesRegex(ValueError, 'changed'):
            agentlog.associate('one', self.scene, self.slot, expected_compose=expected)
        self.assertEqual(Path(store.LOG).read_bytes(), before)

    def test_missing_duplicate_or_invalid_target_leaves_log_unchanged(self):
        self.append()
        self.append()  # duplicate IDs are ambiguous, never update both
        before = Path(store.LOG).read_bytes()
        for rid, scene, slot, expected in [('one', self.scene, self.slot, None), ('missing', self.scene, self.slot, None),
                                          ('one', '', self.slot, None), ('one', self.scene, self.slot, [])]:
            with self.subTest(rid=rid, expected=expected), self.assertRaises(ValueError):
                agentlog.associate(rid, scene, slot, expected_compose=expected)
        self.assertEqual(Path(store.LOG).read_bytes(), before)

    def test_association_survives_scene_filter_and_legacy_shot_alias(self):
        spec = importlib.util.spec_from_file_location('association_subplot_api', Path(__file__).parents[1] / 'subplots/api.py')
        api = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(api)
        self.append(compose={'scene': 'Reading'})
        agentlog.associate('one', self.scene, 'image:0', expected_compose={'scene': 'Reading'})
        row = store.log_read()[0]
        runs = [{'run_id': row['id'], 'compose': row['compose'], 'renders': [row]}]
        found = {'scene': 'unrelated', 'files': ['unrelated.webp']}
        self.assertEqual(api.scene_runs('other-scene', runs, found), [])
        selected = api.scene_runs(self.scene, runs, found)
        self.assertEqual(len(selected), 1)
        named = api.as_shot_ids(self.scene, selected, [{'id': self.slot, 'aliases': ['image:0']}])
        self.assertEqual(named[0]['compose']['imageSlot'], self.slot)
        self.assertEqual(named[0]['renders'][0]['compose']['imageSlot'], self.slot)
        self.assertEqual(row['compose']['imageSlot'], 'image:0')

    def test_live_copy_is_webp_and_the_master_is_not_changed(self):
        from PIL import Image
        image = self.root / 'render.png'
        Image.new('RGB', (16, 20), (10, 20, 30)).save(image)
        before = image.read_bytes()
        rid = agentlog.add({'owner': 'fixture-worker', 'round': 'fixture-1'}, str(image))
        row = store.log_read()[0]
        self.assertEqual(row['id'], rid)
        self.assertTrue(row['file'].endswith('.webp'))
        self.assertEqual(Path(store.OUTPUTS, row['file']).read_bytes()[8:12], b'WEBP')
        self.assertEqual(image.read_bytes(), before)


class WebpCopy(unittest.TestCase):
    def test_copy_is_rgb_webp_at_the_same_size_and_the_source_is_kept(self):
        from PIL import Image
        from tools.imagegen import to_webp
        with tempfile.TemporaryDirectory() as d:
            src, dst = Path(d, 'master.png'), Path(d, 'copy.webp')
            Image.new('RGBA', (16, 20), (10, 20, 30, 255)).save(src)
            before = src.read_bytes()
            to_webp.save_webp(str(src), str(dst))
            data = dst.read_bytes()
            self.assertEqual((data[:4], data[8:12]), (b'RIFF', b'WEBP'))
            with Image.open(dst) as im:
                self.assertEqual((im.format, im.mode, im.size), ('WEBP', 'RGB', (16, 20)))
            self.assertEqual(src.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
