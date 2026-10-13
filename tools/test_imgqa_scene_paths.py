"""CPU regressions for path-dependent grading, with no image or model imports."""
import ast
import copy
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock


def load_functions():
    source = Path(__file__).with_name('imgqa_scene.py')
    tree = ast.parse(source.read_text())
    functions = {'thr', 'grade', 'outfit_enabled', 'grade_face', 'grade_outfit',
                 'analyse', 'finish', 'regrade', 'add_outfit'}
    constants = {'THRESH', 'OUTFIT', 'COLOUR_WORDS', 'CALIBRATION', 'OUTFIT_CALIBRATION'}
    nodes = [n for n in tree.body if
             (isinstance(n, ast.FunctionDef) and n.name in functions) or
             (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in constants for t in n.targets))]
    namespace = {'os': os, 'json': json}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), namespace)
    return namespace


def grade(key, value, thresholds):
    low, high = thresholds[key]
    if key in ('cover', 'glasses_want'):
        return 'pass' if value >= low else 'warn' if value >= high else 'fail'
    return 'pass' if value <= low else 'warn' if value <= high else 'fail'


def worst(*statuses):
    return max(statuses, key={'na': -1, 'pass': 0, 'warn': 1, 'fail': 2}.get, default='pass')


def face():
    return dict(who='synthetic', box=[0, 0, 50, 50], ccip=.1, glasses={'p': .9},
                hair={'measured': False}, outfit=dict(regions={}, tags={'jacket': .9}))


class OutfitPathTests(unittest.TestCase):
    def setUp(self):
        self.ns = load_functions()
        self.qa = SimpleNamespace(grade=grade, worst=worst, load=Mock(return_value={'grey': None}),
                                  to_pil=lambda x: x)
        self.ns['imgqa'] = self.qa
        self.person = dict(glasses=True, hair_check=False, outfit=dict(parts=[], forbid_tags=['jacket'],
                           allow_in={'jacket': ['normal-set/']}))
        self.cast = SimpleNamespace(people={'synthetic': self.person})

    def write_report(self, rd, f):
        Path(rd, 'imgqa-scene.json').write_text(json.dumps({'images': [{'path': 'shot.webp', 'faces': [f]}]}))

    def test_regrade_preserves_directory_allow_in(self):
        with tempfile.TemporaryDirectory() as root:
            rd = Path(root, 'normal-set')
            rd.mkdir()
            initial = face()
            self.ns['grade_face'](initial, self.person, str(rd / 'shot.webp'))
            self.assertEqual(initial['status'], 'pass')
            self.write_report(rd, initial)
            result = self.ns['regrade'](self.cast, str(rd))
            self.assertEqual(result[0]['faces'][0]['status'], 'pass')
            self.assertEqual(result[0]['faces'][0]['outfit']['why'], [])

    def test_unmatched_allow_in_still_warns(self):
        f = face()
        self.ns['grade_face'](f, self.person, '/synthetic/other/shot.webp')
        self.assertEqual(f['status'], 'warn')
        self.assertTrue(f['outfit']['tag_warn'])

    def test_regrade_excludes_cached_outfit_failure(self):
        with tempfile.TemporaryDirectory() as rd:
            self.person['outfit_in'] = ['selected-set/']
            f = face()
            f['outfit'].update(status='fail', why=['old failure'], tag_warn=True)
            f['outfit']['regions']['torso'] = dict(status='fail', visible=1, cloth=.5, coverage={}, foreign=1)
            self.write_report(rd, f)
            result = self.ns['regrade'](self.cast, rd)[0]['faces'][0]
            self.assertEqual(result['status'], 'pass')
            self.assertEqual(result['outfit']['status'], 'na')
            self.assertEqual(result['outfit']['why'], [])
            self.assertNotIn('tag_warn', result['outfit'])
            self.assertEqual(result['outfit']['regions']['torso']['status'], 'na')

    def test_add_outfit_only_measures_selected_paths(self):
        with tempfile.TemporaryDirectory() as root:
            self.person['outfit_in'] = ['selected-set/']
            measure = Mock(return_value=face()['outfit'])
            self.ns.update(measure_outfit=measure, flat=lambda _: None, skin_lab=lambda *_: None,
                           round_images=lambda _: [], private_root=lambda: root)
            for name, calls in [('other-set', 0), ('selected-set', 1)]:
                rd = Path(root, name)
                rd.mkdir()
                (rd / 'shot.webp').touch()  # existence only, never opened as an image
                self.write_report(rd, face())
                result = self.ns['add_outfit'](self.cast, str(rd))
                self.assertEqual(measure.call_count, calls)
                self.assertEqual(result[0]['faces'][0]['outfit']['status'], 'na' if not calls else 'warn')
            self.assertEqual(self.qa.load.call_count, 1)

    def test_initial_analyse_respects_outfit_in(self):
        self.person['outfit_in'] = ['selected-set/']
        self.cast.refs = {'synthetic': {}}
        self.cast.pool = lambda _: []
        self.cast.distances = lambda *_: {'synthetic': .1}
        self.cast.assign = lambda *_: [('synthetic', .1)]
        self.qa.load.return_value.update(w=100, h=100)
        self.qa.detect_all = lambda _: [([0, 0, 50, 50], 1)]
        measure = Mock(return_value=copy.deepcopy(face()['outfit']))
        self.ns.update(measure_face=lambda *_: {'feat': [], 'tags': {'glasses': .9}, 'hair': None,
                                               'skin': None, 'box': [0, 0, 50, 50]},
                       raw_hair=lambda *_: {'measured': False}, raw_skin=lambda *_: None,
                       is_male=lambda _: False, measure_outfit=measure)
        excluded, _ = self.ns['analyse'](self.cast, '/synthetic/other-set/shot.webp')
        self.assertNotIn('outfit', excluded['faces'][0])
        measure.assert_not_called()
        included, _ = self.ns['analyse'](self.cast, '/synthetic/selected-set/shot.webp')
        self.assertIn('outfit', included['faces'][0])
        measure.assert_called_once()


if __name__ == '__main__':
    unittest.main()
