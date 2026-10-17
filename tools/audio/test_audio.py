"""Tests for the audio route's refusals (standard library only; part of npm run check).

    python3 tools/audio/test_audio.py"""
import os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import presets, ratchet
from generators import KINDS_OF, seed_for


def preset(kind, **v):
    base = {'v': 1, 'date': '2026-10-16', 'by': 'test/test', 'generator': 'synth', 'prompt': 'a click', 'settings': {},
            'length': None, 'loop': None, 'loudness': -30, 'use': 'a test'}
    return {'id': 'x', 'kind': kind, 'versions': [{**base, **v}]}


class Presets(unittest.TestCase):
    def test_every_committed_preset_is_valid(self):
        self.assertEqual(presets.check(), [])

    def test_generator_not_in_the_table_is_refused(self):
        self.assertTrue(presets.problems('music', preset('music', generator='musicgen'), 'x.json', KINDS_OF))

    def test_generator_not_allowed_for_the_kind_is_refused(self):
        for kind, gen in (('music', 'sa3'), ('song', 'lyria-2'), ('ambience', 'yue2'), ('sfx', 'lyria-2'), ('ambience', 'cc0'), ('sfx', 'supplied')):
            self.assertTrue(presets.problems(kind, preset(kind, generator=gen), 'x.json', KINDS_OF), (kind, gen))

    def test_allowed_pairs_pass(self):
        for kind, gen in (('music', 'lyria-2'), ('music', 'yue2'), ('music', 'supplied'), ('song', 'yue2'), ('ambience', 'sa3'), ('ambience', 'synth'),
                          ('sfx', 'synth'), ('sfx', 'sa3'), ('sfx', 'cc0')):
            extra = {'context': 'Hamada, karaoke box, evening'} if kind == 'song' else {}
            self.assertEqual(presets.problems(kind, preset(kind, generator=gen, **extra), 'x.json', KINDS_OF), [], (kind, gen))

    def test_a_song_needs_its_context(self):
        self.assertTrue(presets.problems('song', preset('song', generator='yue2'), 'x.json', KINDS_OF))

    def test_versions_are_numbered_in_order(self):
        p = preset('sfx')
        p['versions'].append({**p['versions'][0], 'v': 3})
        self.assertTrue(presets.problems('sfx', p, 'x.json', KINDS_OF))

    def test_seeds_follow_the_preset(self):
        v = {'settings': {'seed': 5100, 'seed_step': 131}}
        self.assertEqual([seed_for(v, n) for n in (1, 2, 3, 4)], [5100, 5231, 5362, 5493])


class Ratchet(unittest.TestCase):
    def test_a_new_script_fails_and_a_grown_one_fails(self):
        bad, _ = ratchet.findings({'tools/new.py': 1, 'tools/old.py': 3}, {'tools/old.py': 2})
        self.assertEqual(len(bad), 2)

    def test_a_shrunk_script_is_a_note(self):
        bad, notes = ratchet.findings({'tools/old.py': 1}, {'tools/old.py': 2})
        self.assertEqual((bad, len(notes)), ([], 1))


if __name__ == '__main__':
    unittest.main()
