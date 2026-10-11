"""CPU regression fixtures for the voice-consistency gate (no models, no GPU, no TTS). Plain python3:
  python3 -m unittest tools/voice/test_voice_gate.py
Functions are lifted from segvoice.py and export.py by ast, so librosa/torch are not needed."""
import ast, re, statistics, unittest
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent


def lift(file, funcs, consts=()):
    tree = ast.parse((HERE / file).read_text())
    return [n for n in tree.body if (isinstance(n, ast.FunctionDef) and n.name in funcs)
            or (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id in consts for t in n.targets))]


def segvoice():
    ns = {'re': re, 'np': SimpleNamespace(median=statistics.median)}
    exec(compile(ast.Module(body=lift('segvoice.py', ('hum', 'breaks'), ('SR', 'ABS', 'GAP', 'HUM')), type_ignores=[]), 'segvoice', 'exec'), ns)
    return ns


def rows():
    return [{'t': [0, 1], 'sim': .2}, {'t': [1, 2], 'sim': .9}, {'t': [2, 3], 'sim': .9}]


class HumTest(unittest.TestCase):
    def test_only_a_real_hum_is_exempt(self):
        ns, y = segvoice(), [0] * 48000
        for heard, flagged in (('Chair', [0]), ('Hmm', []), ('Mm.', []), ('', [0]), ('...', [0]), ('  ', [0]), (None, [0])):
            with self.subTest(heard=heard):
                self.assertEqual(ns['breaks'](rows(), y, lambda _: heard), flagged)


class ForcePickTest(unittest.TestCase):
    def pick(self, take, listened=None):
        ns = {'M': {'fx': {'bad': take}}, 'RAW': 'fx', 'force': {'fx': 'bad'}, 'listened': listened or {},
              'os': SimpleNamespace(path=SimpleNamespace(exists=lambda _: True)), 'score': lambda *a: 0}
        exec(compile(ast.Module(body=lift('export.py', ('voice_clear', 'pick')), type_ignores=[]), 'export', 'exec'), ns)
        return ns['pick']({'key': 'fx', 'said': 'Example'})[0]

    bad = {'text': 'Example', 'ok': False, 'voice_ok': False, 'voice_breaks': [0]}

    def test_force_cannot_pick_a_voice_break_take(self):
        self.assertIsNone(self.pick(self.bad))
        self.assertIsNone(self.pick({**self.bad, 'voice_ok': True}))  # breaks listed: still failed

    def test_force_picks_a_clean_take(self):
        self.assertEqual(self.pick({'text': 'Example', 'ok': True, 'voice_ok': True, 'voice_breaks': []}), 'bad')

    def test_recorded_listening_override_is_the_only_way(self):
        self.assertEqual(self.pick(self.bad, {'fx': {'take': 'bad', 'by': 'j', 'date': '2026-10-11'}}), 'bad')
        self.assertIsNone(self.pick(self.bad, {'fx': {'take': 'other'}}))


if __name__ == '__main__':
    unittest.main()
