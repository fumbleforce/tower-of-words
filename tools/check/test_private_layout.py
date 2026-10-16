#!/usr/bin/env python3
"""The layout rules and the moved map (tools/private_layout.py). Text only: no file under island/private/ is read."""
import os
import sys
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # tools/
import private_layout as pl  # noqa: E402


class Rounds(unittest.TestCase):
    def setUp(self):
        self.s = pl.spec()

    def test_marketing_is_a_project(self):
        self.assertIn('marketing', self.s['rewards']['projects'])
        self.assertIsNone(pl.path_problem('rewards/marketing/command-1/index.html', self.s))
        self.assertIsNone(pl.path_problem('rewards/marketing/motifs-2/raw/receipt.json', self.s))
        self.assertIsNone(pl.path_problem('rewards/marketing/index.html', self.s))

    def test_marketing_takes_rounds_and_nothing_else_at_its_top(self):
        for bad in ('rewards/marketing/README.md', 'rewards/marketing/docs', 'rewards/marketing/motifs2',
                    'rewards/marketing/motifs-x'):
            self.assertIsNotNone(pl.path_problem(bad, self.s), bad)

    def test_a_new_top_level_round_is_still_refused(self):
        self.assertIsNotNone(pl.path_problem('rewards/marketing-4', self.s))

    def test_every_moved_target_is_a_valid_place(self):
        # a folder is judged as a file inside it, the way the Bash guard judges a bare name
        for old, new in self.s['rewards']['moved'].items():
            last = new.split('/')[-1]
            probe = 'rewards/' + new if '.' in last else 'rewards/' + new + '/_'
            self.assertIsNone(pl.path_problem(probe, self.s), (old, new))


class Resolve(unittest.TestCase):
    def setUp(self):
        self.s = pl.spec()

    def check(self, path, want):
        self.assertEqual(pl.resolve(path, self.s), want)

    def test_marketing_rounds_resolve_to_the_project(self):
        self.check('rewards/library/marketing-1/raw/x.png', 'rewards/marketing/command-1/raw/x.png')
        self.check('rewards/library/marketing-2/index.html', 'rewards/marketing/motifs-1/index.html')
        self.check('island/private/rewards/library/marketing-3/prompts.json', 'rewards/marketing/motifs-2/prompts.json')

    def test_the_staging_doc_resolves_to_its_new_name(self):
        self.check('rewards/docs/marketing-1-staging.md', 'rewards/docs/marketing-command-1-staging.md')

    def test_older_flat_names_still_resolve(self):
        self.check('rewards/skimpy-aoi-2/index.html', 'rewards/skimpy/aoi-2/index.html')
        self.check('rewards/img/a.webp', 'rewards/archive/img/a.webp')

    def test_current_names_do_not_move(self):
        self.check('rewards/index.html', 'rewards/index.html')
        self.check('rewards/marketing/command-1/index.html', 'rewards/marketing/command-1/index.html')
        self.check('game/live.json', 'game/live.json')
        self.check('rewards/library/copier-1/index.html', 'rewards/library/copier-1/index.html')


if __name__ == '__main__':
    unittest.main()
