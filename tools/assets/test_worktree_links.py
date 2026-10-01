"""CPU-only asset-pruning boundary checks, with synthetic directories only.

Run: python3 -m unittest discover -s tools/assets -p 'test_worktree_links.py'
"""
import os
from pathlib import Path
import subprocess
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


if __name__ == '__main__':
    unittest.main()
