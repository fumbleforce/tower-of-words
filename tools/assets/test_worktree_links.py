"""CPU-only checks of the asset store's pruning and of the stale-link drop, with synthetic directories only.

Run: python3 -m unittest discover -s tools/assets -p 'test_worktree_links.py'
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import worktree_links


class ReferenceScanTests(unittest.TestCase):
    def test_private_subtrees_are_never_enumerated(self):
        with tempfile.TemporaryDirectory(prefix='asset-scan-test-') as tmp:
            main = Path(tmp) / 'main'
            external = Path(tmp) / 'external-worktree'
            nested = main / '.claude/worktrees/nested'
            store = main / worktree_links.STORE
            protected = []
            for checkout, name in ((main, 'main'), (nested, 'nested'), (external, 'external')):
                checkout.mkdir(parents=True, exist_ok=True)
                public = checkout / 'public.glb'
                public.symlink_to(store / name / 'model.glb')
                private = checkout / 'island/private'
                (private / 'user').mkdir(parents=True)
                (private / 'user/hidden-link').symlink_to(store / 'hidden' / 'model.glb')
                protected.append(private)
            # Even inspecting a symlink named private is unnecessary for the public asset scan.
            symlink_parent = main / 'another'
            symlink_parent.mkdir()
            (symlink_parent / 'private').symlink_to(store / 'hidden-directory', target_is_directory=True)
            original_scan, original_readlink = os.scandir, os.readlink

            def scan(path):
                path = Path(path)
                self.assertFalse(any(path == p or p in path.parents for p in protected), path)
                return original_scan(path)

            def readlink(path, *args, **kwargs):
                self.assertNotEqual(Path(path).name, 'private')
                return original_readlink(path, *args, **kwargs)

            listing = f'worktree {main}\n\nworktree {nested}\n\nworktree {external}\n'
            git_result = subprocess.CompletedProcess([], 0, stdout=listing)
            with patch.object(worktree_links.subprocess, 'run', return_value=git_result), \
                    patch.object(worktree_links.os, 'scandir', side_effect=scan), \
                    patch.object(worktree_links.os, 'readlink', side_effect=readlink):
                used = worktree_links.linked_entries(str(main), str(store))
            self.assertEqual(used, {'main', 'nested', 'external'})


class DropStaleTests(unittest.TestCase):
    """drop_stale on a temp tree: a main checkout, a worktree with its branch's lock file and live.json, the store."""

    def setUp(self):
        tmp = tempfile.TemporaryDirectory(prefix='drop-stale-test-')
        self.addCleanup(tmp.cleanup)
        base = Path(tmp.name)
        self.main, self.wt = base / 'main', base / 'wt'
        self.store = self.main / worktree_links.STORE
        self.main.mkdir()
        self.wt.mkdir()
        self.copies = 0
        self.put(self.wt / worktree_links.LOCK, json.dumps({'about': 'test', 'files': {
            'art/approved/keep.png': {'size': 1, 'sha256': 'a' * 64, 'type': 'image/png'},
            'game3d/assets/characters/aoi/base.webp': {'size': 1, 'sha256': 'b' * 64, 'type': 'image/webp'},
        }}))
        self.put(self.wt / worktree_links.LIVE, json.dumps({'units': {
            'game3d/assets/characters/aoi/': {'loaded_by': 'js/cast3d.js#aoi'},
            'game3d/assets/portraits/mio-a.webp': {'loaded_by': 'js/ui/portraits.js'},
            'game3d/audio/{index}.mp3': {'list': 'game3d/audio/index.json', 'each': 'game3d/audio/{}.mp3'},
        }}))
        self.put(self.wt / 'game3d/audio/index.json', json.dumps(['a']))
        # main still has Aoi's portrait; everything else the links below point at is gone from main
        self.put(self.main / 'game3d/assets/characters/aoi/base.webp', 'main copy')

    def put(self, path, text):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

    def link(self, rel, copy=True):
        """A link at wt/<rel> into the store, the way setup makes one (its store copy is made unless copy is False)."""
        self.copies += 1
        target = self.store / f'{self.copies:03d}' / Path(rel).name
        if copy:
            self.put(target, 'store copy')
        here = self.wt / rel
        here.parent.mkdir(parents=True, exist_ok=True)
        here.symlink_to(target)
        return here

    def test_removes_only_store_links_the_branch_no_longer_expects(self):
        stale = [
            self.link('game3d/assets/characters/chibi-aoi/base.webp'),  # the chibi kit: main lost it
            self.link('game3d/assets/characters/chibi-kenji/model.glb'),  # its folder keeps a real file
            self.link('game3d/audio/zz.mp3'),  # main lost it, and the list has no zz
            self.link('art/approved/old.png'),
            self.link('game3d/assets/portraits/mio-a.webp', copy=False),  # main and the store copy are both gone
        ]
        self.put(self.wt / 'game3d/assets/characters/chibi-kenji/notes.txt', 'a real file')
        kept = [
            self.link('game3d/assets/characters/aoi/base.webp'),  # main has it
            self.link('game3d/assets/characters/aoi/extra.glb'),  # main lost it, but the folder unit registers it
            self.link('game3d/audio/a.mp3'),  # main lost it, but the list registers it
            self.link('art/approved/keep.png'),  # main lost it, but the lock file names it
        ]
        # never removed: a real file, a link straight to main's file, a link elsewhere, and a link under private
        self.put(self.wt / 'game3d/assets/real.webp', 'a real file')
        straight = self.wt / 'tools/main-direct.webp'
        straight.parent.mkdir(parents=True, exist_ok=True)
        straight.symlink_to(self.main / 'game3d/assets/characters/aoi/base.webp')
        elsewhere = self.wt / 'tools/elsewhere.txt'
        elsewhere.symlink_to(self.wt / 'tools/anything-else')
        private = self.wt / 'island/private/user/hidden.png'
        private.parent.mkdir(parents=True)
        private.symlink_to(self.store / '999' / 'hidden.png')

        removed, folders = worktree_links.drop_stale(str(self.main), str(self.wt))

        self.assertEqual(sorted(removed), sorted([
            ('game3d/assets/characters/chibi-aoi/base.webp', False),
            ('game3d/assets/characters/chibi-kenji/model.glb', False),
            ('game3d/audio/zz.mp3', False),
            ('art/approved/old.png', False),
            ('game3d/assets/portraits/mio-a.webp', True),
        ]))
        self.assertEqual(sorted(folders), ['game3d/assets/characters/chibi-aoi', 'game3d/assets/portraits'])
        for link in stale:
            self.assertFalse(os.path.lexists(link), link)
        for link in kept + [straight, elsewhere, private]:
            self.assertTrue(os.path.islink(link), link)
        self.assertEqual((self.wt / 'game3d/assets/real.webp').read_text(encoding='utf-8'), 'a real file')
        notes = self.wt / 'game3d/assets/characters/chibi-kenji/notes.txt'
        self.assertEqual(notes.read_text(encoding='utf-8'), 'a real file')
        self.assertEqual((self.main / 'game3d/assets/characters/aoi/base.webp').read_text(encoding='utf-8'), 'main copy')
        self.assertEqual(len(list(self.store.glob('*/*'))), self.copies - 1)  # the store is never touched

    def test_removes_nothing_without_a_readable_lock_file_or_registry(self):
        link = self.link('game3d/assets/characters/chibi-aoi/base.webp')
        (self.wt / worktree_links.LIVE).unlink()
        self.assertEqual(worktree_links.drop_stale(str(self.main), str(self.wt)), ([], []))
        self.assertTrue(os.path.islink(link))
        self.put(self.wt / worktree_links.LIVE, json.dumps({'units': {}}))
        (self.wt / worktree_links.LOCK).unlink()
        self.assertEqual(worktree_links.drop_stale(str(self.main), str(self.wt)), ([], []))
        self.assertTrue(os.path.islink(link))

    def test_a_list_unit_without_its_list_file_keeps_what_it_could_name(self):
        (self.wt / 'game3d/audio/index.json').unlink()
        link = self.link('game3d/audio/zz.mp3')
        self.assertEqual(worktree_links.drop_stale(str(self.main), str(self.wt)), ([], []))
        self.assertTrue(os.path.islink(link))

    def test_a_folder_the_removal_empties_goes_up_to_the_first_one_with_anything_in_it(self):
        self.link('deep/one/two/x.webp')
        self.put(self.wt / 'deep/keep.txt', 'a real file')
        removed, folders = worktree_links.drop_stale(str(self.main), str(self.wt))
        self.assertEqual(removed, [('deep/one/two/x.webp', False)])
        self.assertEqual(folders, ['deep/one/two', 'deep/one'])
        self.assertTrue((self.wt / 'deep/keep.txt').is_file())

    def test_the_command_prints_each_removed_link_and_folder(self):
        self.link('game3d/assets/characters/chibi-aoi/base.webp')
        self.put(self.wt / 'game3d/assets/characters/aoi/keep.txt', 'a real file')
        result = subprocess.run([sys.executable, worktree_links.__file__, 'drop-stale', str(self.main), str(self.wt)],
                                capture_output=True, text=True, check=True)
        self.assertIn('removed 1 link(s) to files main no longer has', result.stdout)
        self.assertIn('  game3d/assets/characters/chibi-aoi/base.webp\n', result.stdout)
        self.assertIn('removed 1 folder(s) those links left empty:\n  game3d/assets/characters/chibi-aoi/\n',
                      result.stdout)
        self.assertFalse(os.path.lexists(self.wt / 'game3d/assets/characters/chibi-aoi'))


if __name__ == '__main__':
    unittest.main()
