#!/usr/bin/env python3
"""What leaves R2 (tools/assets/sync.py): only Showcase and Review pictures, never a game file or a name another lock
file holds. The R2 client is faked; nothing is uploaded or deleted.

    python3 tools/assets/test_trim.py
"""
import io
import json
import os
import tempfile
import types
import unittest
from contextlib import redirect_stdout
from unittest import mock

import sync

SHOW = 'game3d/shots/karaoke-detail-20261008/a.png'
REVIEW = 'art/candidates/portraits/closed-1/b.webp'
SHOWCASE_COPY = 'bible/shots/showcase/cast-faces-1/faces-installed.webp'
GAME = 'game3d/audio/ln-1r27snx.mp3'
THUMB = 'tools/assets/thumbs/556eb79e019119f5.png'
OUTSIDE = 'legacy/proto2/x.webp'


def sha(n):
    return f'{n:064x}'


def lock_text(pairs):
    """A lock file's text naming (path, sha(n)) pairs."""
    return json.dumps({'files': {p: {'sha256': sha(n), 'size': 1, 'type': 'image/png'} for p, n in pairs}})


def entry(n, size):
    return {'sha256': sha(n), 'size': size, 'type': 'image/png'}


class Paths(unittest.TestCase):
    def test_a_library_root_is_a_game_path(self):
        self.assertTrue(sync.is_game_path(GAME))
        self.assertTrue(sync.is_game_path(THUMB))
        self.assertTrue(sync.is_game_path(SHOWCASE_COPY))  # under the bible/shots root, so never deleted
        self.assertFalse(sync.is_game_path(SHOW))
        self.assertFalse(sync.is_game_path(OUTSIDE))

    def test_removable_says_why_a_blob_stays(self):
        published = {SHOW, REVIEW}
        self.assertEqual(sync.removable([], published), 'no known path')
        self.assertEqual(sync.removable([SHOW, REVIEW], published), '')
        self.assertEqual(sync.removable([SHOW, GAME], published), 'a game file')
        self.assertEqual(sync.removable([OUTSIDE], published), 'never a Showcase or Review picture')
        self.assertEqual(sync.removable([OUTSIDE, SHOW], published), '')  # one published path is enough


class Histories(unittest.TestCase):
    def test_only_added_lock_lines_name_a_path_for_their_sha(self):
        text = ('+  "art/candidates/x \\"q\\".webp": {"size": 3, "sha256": "%s", "type": "image/webp"}\n' % sha(7)
                + '-  "old.png": {"size": 1, "sha256": "%s", "type": "image/png"}\n' % sha(8))
        with mock.patch.object(sync, 'git', return_value=text):
            self.assertEqual(sync.lock_history(), {sha(7): {'art/candidates/x "q".webp'}})

    def test_the_media_list_names_every_path_it_ever_published(self):
        text = ('+{\n+"about": "x",\n+"data": [\n+"game3d/shots/a/b.png",\n+"bible/shots/c \\"d\\".webp"\n+]}\n'
                '-"gone.png",\n')
        with mock.patch.object(sync, 'git', return_value=text):
            self.assertEqual(sync.published_paths(), {'game3d/shots/a/b.png', 'bible/shots/c "d".webp'})


class TrimPlan(unittest.TestCase):
    def test_only_unlocked_review_blobs_may_leave(self):
        remote = {sha(n): 10 * n for n in range(1, 7)}
        lock = {SHOW: entry(1, 10), GAME: entry(9, 90)}
        history = {sha(1): {SHOW}, sha(2): {REVIEW}, sha(3): {GAME}, sha(4): {SHOW}, sha(5): {OUTSIDE}}
        delete, keep = sync.trim_plan(remote, lock, named={sha(4)}, history=history, published={SHOW, REVIEW})
        self.assertEqual(set(delete), {sha(2)})
        self.assertEqual(delete[sha(2)], (20, [REVIEW]))
        self.assertEqual(keep[sha(3)][1], 'a game file')
        self.assertEqual(keep[sha(4)][1], 'another checkout or an unmerged branch names it')
        self.assertEqual(keep[sha(5)][1], 'never a Showcase or Review picture')
        self.assertEqual(keep[sha(6)][1], 'no known path')
        self.assertNotIn(sha(1), delete)
        self.assertNotIn(sha(1), keep)


class NamedElsewhere(unittest.TestCase):
    """Another checkout or branch protects what it adds to the lock file since its merge base, not what it inherited."""

    def test_only_what_another_checkout_or_branch_adds_is_named(self):
        with tempfile.TemporaryDirectory() as dirty, tempfile.TemporaryDirectory() as merged:
            os.makedirs(os.path.join(dirty, 'tools', 'assets'))
            with open(os.path.join(dirty, sync.LOCK_REL), 'w', encoding='utf-8') as f:
                f.write(lock_text([(SHOW, 11), (GAME, 20)]))  # 11 is new in this worktree, 20 is inherited
            listing = (f'worktree {dirty}\nHEAD aa\nbranch refs/heads/a\n\n'
                       f'worktree {merged}\nHEAD bb\nbranch refs/heads/b\n\n')
            texts = {'refs/heads/theirs:' + sync.LOCK_REL: lock_text([(GAME, 20), (REVIEW, 12)]),
                     'b-theirs:' + sync.LOCK_REL: lock_text([(GAME, 20)]),
                     'b-dirty:' + sync.LOCK_REL: lock_text([(GAME, 20)]),
                     'refs/heads/mine:' + sync.LOCK_REL: lock_text([(SHOW, 99)])}
            bases = {('HEAD', dirty): 'b-dirty', ('refs/heads/theirs', sync.ROOT): 'b-theirs'}

            def fake_git(*args, cwd=sync.ROOT, check=True):
                if args[:2] == ('worktree', 'list'):
                    return listing
                if args[0] == 'status':
                    return ' M tools/assets/assets.lock.json\n' if cwd == dirty else ''
                if args[0] == 'symbolic-ref':
                    return 'refs/heads/mine\n'
                if args[0] == 'for-each-ref':
                    return 'refs/heads/mine\nrefs/heads/theirs\n'
                if args[0] == 'merge-base':
                    return bases[(args[1], cwd)] + '\n'
                if args[0] == 'show':
                    return texts.get(args[1], '')
                raise AssertionError(f'unexpected git {args}')

            with mock.patch.object(sync, 'git', side_effect=fake_git), \
                    mock.patch.object(sync, 'is_ancestor', side_effect=lambda sub, ref, cwd: cwd == merged):
                self.assertEqual(sync.named_elsewhere(), {sha(11), sha(12)})


class Drop(unittest.TestCase):
    def test_a_push_deletes_only_published_blobs_that_nothing_names(self):
        deleted = []

        class Fake:
            def delete(self, s):
                deleted.append(s)

        dropped = {SHOW: entry(1, 5), REVIEW: entry(2, 6), GAME: entry(3, 7), OUTSIDE: entry(4, 8),
                   'game3d/shots/other.png': entry(5, 9), 'game3d/shots/still.png': entry(6, 10)}
        published = {SHOW, REVIEW, 'game3d/shots/other.png', 'game3d/shots/still.png'}
        with mock.patch.object(sync, 'named_elsewhere', return_value={sha(5)}), \
                mock.patch.object(sync, 'published_paths', return_value=published), redirect_stdout(io.StringIO()) as out:
            sync.drop_from_r2(Fake(), dropped, kept={sha(6)})
        self.assertEqual(sorted(deleted), [sha(1), sha(2)])
        self.assertIn('kept 1: a game file', out.getvalue())
        self.assertIn('kept 1: the lock file still names it', out.getvalue())
        self.assertIn('kept 1: another checkout or an unmerged branch names it', out.getvalue())
        self.assertIn('kept 1: never a Showcase or Review picture', out.getvalue())  # OUTSIDE was never published


class TrimCommand(unittest.TestCase):
    """trim --list writes the list; trim --delete removes exactly the listed blobs, and refuses a list that is stale."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.blobs = {sha(1): 10, sha(2): 20, sha(3): 30}
        self.lock = {SHOW: entry(1, 10)}
        self.history = {sha(1): {SHOW}, sha(2): {REVIEW}, sha(3): {GAME}}
        fake = self

        class R2:
            def __init__(self, env):
                pass

            def list_blobs(self):
                return dict(fake.blobs)

            def delete(self, s):
                fake.blobs.pop(s, None)

        self.patches = [mock.patch.object(sync, 'R2', R2), mock.patch.object(sync, 'load_env', return_value={}),
                        mock.patch.object(sync, 'load_lock', side_effect=lambda: self.lock),
                        mock.patch.object(sync, 'named_elsewhere', return_value=set()),
                        mock.patch.object(sync, 'published_paths', return_value={SHOW, REVIEW}),
                        mock.patch.object(sync, 'lock_history', side_effect=lambda: self.history)]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def run_trim(self, **kw):
        with redirect_stdout(io.StringIO()) as out:
            sync.cmd_trim(types.SimpleNamespace(list=kw.get('list', os.path.join(self.tmp.name, 'list.txt')),
                                                delete=kw.get('delete')))
        return out.getvalue()

    def test_list_then_delete_removes_exactly_the_listed_review_blobs(self):
        path = os.path.join(self.tmp.name, 'list.txt')
        out = self.run_trim(list=path)
        with open(path, encoding='utf-8') as f:
            listed = [line.split('\t')[0] for line in f if line.strip() and not line.startswith('#')]
        self.assertEqual(listed, [sha(2)])
        self.assertIn('delete: 1 blobs', out)
        self.run_trim(delete=path)
        self.assertEqual(set(self.blobs), {sha(1), sha(3)})  # the feed picture and the game file stay

    def test_a_list_that_no_longer_matches_a_fresh_listing_deletes_nothing(self):
        path = os.path.join(self.tmp.name, 'list.txt')
        self.run_trim(list=path)
        self.blobs.pop(sha(2))  # the listing changed after the list was written
        self.blobs[sha(4)] = 40  # and a new orphan appeared
        with self.assertRaises(SystemExit):
            self.run_trim(delete=path)
        self.assertEqual(set(self.blobs), {sha(1), sha(3), sha(4)})


if __name__ == '__main__':
    unittest.main()
