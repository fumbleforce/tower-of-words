"""Public-fixture checks for the bible builder's optional historical notes."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import yaml


class OptionalHistoricalNotesTest(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('bible_build', Path(__file__).with_name('build.py'))
        self.build = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.build)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.build.ROOT = str(self.root)
        self.build.PUB_OUT = str(self.root / 'bible/data.json')
        (self.root / 'bible').mkdir()

    def test_public_build_without_historical_notes(self):
        data = {key: [] for key in ('characters', 'places', 'locations', 'removed', 'cast_rules',
                                   'places_mentioned', 'rules', 'legacy_rules')}
        data.update(story={'legacy': [], 'legacy_docs': []}, art={'models': [], 'quotes': [], 'donts': []},
                    audio={'music': [], 'quotes': [], 'tracks': []}, reviews={},
                    questions={key: [] for key in ('open', 'conflicts', 'closed', 'closes', 'legacy')})
        (self.root / 'bible/facts.yaml').write_text(yaml.safe_dump(data), encoding='utf-8')
        with patch.object(self.build, 'build_private') as private, contextlib.redirect_stdout(io.StringIO()):
            self.build.build()
        private.assert_called_once_with([])
        output = json.loads(Path(self.build.PUB_OUT).read_text(encoding='utf-8'))
        self.assertEqual([row['items'] for row in output['questions']['legacy_lists']], [[], [], []])
        for name in ('mini-stories',):
            self.assertTrue(any(f'optional historical note missing: notes/{name}.md' in warning
                                for warning in self.build.WARN))
        self.assertFalse((self.root / 'island').exists())

    def test_present_note_is_still_parsed(self):
        (self.root / 'notes').mkdir()
        (self.root / 'notes/mini-stories.md').write_text(
            '## 1. Mio: A legacy arc\nOld arc text.\n## Open questions for Jørgen\n1. Old question?\n',
            encoding='utf-8')
        self.assertEqual(self.build.mini_arcs()['mio'][0]['md'], 'Old arc text.')
        self.assertEqual(self.build.numbered('notes/mini-stories.md', 'Open questions')[0]['t'], 'Old question?')
        self.assertEqual(self.build.WARN, [])

    def test_retired_sources_have_archive_metadata_without_access(self):
        with patch.object(self.build, 'exists', side_effect=AssertionError('archive must not be read')):
            source = self.build.source('legacy/proto2/gallery/index.html ~ old approval')
            self.assertTrue(source['archived'])
            self.assertEqual(self.build.legacy_note('notes/map-design.md'), [])
        self.assertEqual(self.build.WARN, [])

    def test_required_facts_are_still_required(self):
        with self.assertRaises(FileNotFoundError), patch.object(self.build, 'build_private') as private:
            self.build.build()
        private.assert_not_called()


if __name__ == '__main__':
    unittest.main()
