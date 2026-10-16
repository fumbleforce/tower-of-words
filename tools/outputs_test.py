#!/usr/bin/env python3
"""Checks for tools/outputs.py on temporary checkouts: what goes, what stays, and what --apply logs.

Run: python3 tools/outputs_test.py   (npm run check runs it too)
"""
import contextlib
import io
import os
import sys
import tempfile
import time
import unittest
from unittest import mock

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outputs  # noqa: E402

DAY = 86400
OLD = 30 * DAY
RECENT = 2 * DAY
NOW = time.time()


class Tree:
    """A temporary git checkout. write() makes a file whose modification time is `age` seconds old."""

    def __init__(self, test):
        temp = tempfile.TemporaryDirectory(prefix='outputs-test-')
        test.addCleanup(temp.cleanup)
        self.root = temp.name
        outputs.git(self.root, 'init', '-q')

    def write(self, rel, age=OLD, text='x' * 100):
        path = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        os.utime(path, (NOW - age, NOW - age))
        return path

    def track(self, rel):
        outputs.git(self.root, 'add', '--', rel)

    def exists(self, rel):
        return os.path.lexists(os.path.join(self.root, rel))

    def sweep(self, apply=False, days=14, log=None):
        tracked = outputs.tracked_paths(self.root)
        refs = outputs.reference_sets(self.root, tracked)
        return outputs.sweep(self.root, tracked, refs, days, now=NOW, apply=apply, log=log or (lambda text: None))

    def cli(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = outputs.main(['prune', '--root', self.root, *args])
        return code, out.getvalue()


class SweepRules(unittest.TestCase):
    def setUp(self):
        self.tree = Tree(self)

    def test_dry_run_deletes_nothing_and_counts_the_folder(self):
        self.tree.write('game3d/shots/old-job/a.png')
        result = self.tree.sweep(apply=False)
        self.assertTrue(self.tree.exists('game3d/shots/old-job/a.png'))
        self.assertEqual(result['game3d/shots'].folders, 1)
        self.assertEqual(result['game3d/shots'].go_bytes, 100)

    def test_recent_job_is_kept(self):
        self.tree.write('game3d/shots/new-job/a.png', age=RECENT)
        self.tree.sweep(apply=True)
        self.assertTrue(self.tree.exists('game3d/shots/new-job/a.png'))

    def test_a_job_is_as_new_as_its_newest_file(self):
        self.tree.write('game3d/shots/mixed/old.png')
        self.tree.write('game3d/shots/mixed/new.png', age=RECENT)
        self.tree.sweep(apply=True)
        self.assertTrue(self.tree.exists('game3d/shots/mixed/old.png'))
        self.assertTrue(self.tree.exists('game3d/shots/mixed/new.png'))

    def test_tracked_files_stay_and_keep_their_folder(self):
        self.tree.write('art/candidates/round-a/gen.py')
        self.tree.track('art/candidates/round-a/gen.py')
        self.tree.write('art/candidates/round-a/pic.webp')
        self.tree.sweep(apply=True)
        self.assertTrue(self.tree.exists('art/candidates/round-a/gen.py'))
        self.assertFalse(self.tree.exists('art/candidates/round-a/pic.webp'))

    def test_render_roots_take_only_pictures_and_video(self):
        for name in ('a.png', 'mesh.glb', 'notes.json', 'log.txt', 'clip.mp4'):
            self.tree.write(f'art/parts/part-a/{name}')
        self.tree.write('art/production/manifest.json')
        self.tree.write('art/production/round-1/frame.webp')
        self.tree.sweep(apply=True)
        self.assertFalse(self.tree.exists('art/parts/part-a/a.png'))
        self.assertFalse(self.tree.exists('art/parts/part-a/clip.mp4'))
        self.assertFalse(self.tree.exists('art/production/round-1/frame.webp'))
        for name in ('mesh.glb', 'notes.json', 'log.txt'):
            self.assertTrue(self.tree.exists(f'art/parts/part-a/{name}'))
        self.assertTrue(self.tree.exists('art/production/manifest.json'))

    def test_notes_keep_text_and_take_pictures(self):
        self.tree.write('notes/feedback-game/s1/shot.png')
        self.tree.write('notes/feedback-game/s1/text.md')
        self.tree.write('notes/feedback-game/s1/context.json')
        self.tree.write('notes/playtests/cold/screen.webp')
        self.tree.write('notes/playtests/cold-note.md')
        self.tree.track('notes/playtests/cold-note.md')
        self.tree.sweep(apply=True)
        self.assertFalse(self.tree.exists('notes/feedback-game/s1/shot.png'))
        self.assertFalse(self.tree.exists('notes/playtests/cold/screen.webp'))
        self.assertTrue(self.tree.exists('notes/feedback-game/s1/text.md'))
        self.assertTrue(self.tree.exists('notes/feedback-game/s1/context.json'))
        self.assertTrue(self.tree.exists('notes/playtests/cold-note.md'))

    def test_containers_split_into_runs(self):
        self.tree.write('game3d/shots/fast/run-old/1366x860.png')
        self.tree.write('game3d/shots/fast/run-old/result.json')
        self.tree.write('game3d/shots/fast/run-new/1366x860.png', age=RECENT)
        self.tree.write('game3d/shots/fast2/run-a/x.png')
        self.tree.write('game3d/shots/fast2/run-b/x.png')
        self.tree.sweep(apply=True)
        self.assertFalse(os.path.exists(os.path.join(self.tree.root, 'game3d/shots/fast/run-old')))
        self.assertTrue(self.tree.exists('game3d/shots/fast/run-new/1366x860.png'))
        self.assertFalse(os.path.exists(os.path.join(self.tree.root, 'game3d/shots/fast2')))

    def test_private_approved_live_and_retired_are_never_touched(self):
        paths = ['island/private/rewards/x.png', 'art/approved/c/x.png', 'game3d/assets/x.png',
                 'game3d/audio/x.mp3', 'art/production/retired/2026-01-01/x.png']
        for rel in paths:
            self.tree.write(rel)
        self.tree.sweep(apply=True)
        for rel in paths:
            self.assertTrue(self.tree.exists(rel), rel)

    def test_references_keep_files_and_folders(self):
        self.tree.write('art/candidates/round-b/pic.webp')
        self.tree.write('reviews/r1/review.json',
                        text='{"media": [{"image": "art/candidates/round-b/pic.webp"}]}', age=RECENT)
        self.tree.write('showcase/s1/entry.json',
                        text='{"links": [{"href": "game3d/shots/whole-job/"}], "img": "game3d/shots/one/a.png"}',
                        age=RECENT)
        self.tree.write('game3d/shots/whole-job/a.png')
        self.tree.write('game3d/shots/whole-job/sub/b.png')
        self.tree.write('game3d/shots/one/a.png')
        self.tree.write('game3d/shots/one/b.png')
        self.tree.write('bible/data.json', text='{"img": "/bible/shots/loose.png"}', age=RECENT)
        self.tree.write('bible/shots/loose.png')
        self.tree.write('bible/shots/manifest.json', text='{"ref": "bible/shots/other.png"}')
        self.tree.write('bible/shots/other.png')
        self.tree.write('docs/game/places.md', text='![x](http://127.0.0.1:8771/game3d/shots/http-job/a.png)',
                        age=RECENT)
        self.tree.write('game3d/shots/http-job/a.png')
        self.tree.write('reviews/r2/viewer.html', text='<img src="../../art/candidates/round-c/rel.png">', age=RECENT)
        self.tree.write('art/candidates/round-c/rel.png')
        self.tree.write('game3d/js/vrm/scene.js', text="const image = '/art/parts/part-b/a.png';\n"
                        "const folder = new URL('../../../art/candidates/code-folder/', import.meta.url);\n",
                        age=RECENT)
        self.tree.write('art/parts/part-b/a.png')
        self.tree.write('art/candidates/code-folder/x.png')
        self.tree.write('art/candidates/unnamed/x.png')
        self.tree.sweep(apply=True)
        for kept in ('art/candidates/round-b/pic.webp', 'game3d/shots/whole-job/a.png',
                     'game3d/shots/whole-job/sub/b.png', 'game3d/shots/one/a.png', 'bible/shots/loose.png',
                     'game3d/shots/http-job/a.png', 'art/candidates/round-c/rel.png', 'art/parts/part-b/a.png',
                     'art/candidates/code-folder/x.png'):
            self.assertTrue(self.tree.exists(kept), kept)
        for gone in ('game3d/shots/one/b.png', 'bible/shots/other.png', 'art/candidates/unnamed/x.png'):
            self.assertFalse(self.tree.exists(gone), gone)

    def test_odd_names_and_sentence_punctuation_are_matched(self):
        self.tree.write('docs/game/places.md', text='The clip is game3d/shots/follow/candidate2/page@abc123.webm.\n',
                        age=RECENT)
        self.tree.write('game3d/shots/follow/candidate2/page@abc123.webm')
        self.tree.write('showcase/s2/entry.json', text='{"img": "game3d/shots/gait/390x844-chibi=0-after/a.png"}',
                        age=RECENT)
        self.tree.write('game3d/shots/gait/390x844-chibi=0-after/a.png')
        self.tree.write('game3d/shots/gait/390x844-chibi=0-after/b.png')
        self.tree.sweep(apply=True)
        self.assertTrue(self.tree.exists('game3d/shots/follow/candidate2/page@abc123.webm'))
        self.assertTrue(self.tree.exists('game3d/shots/gait/390x844-chibi=0-after/a.png'))
        self.assertFalse(self.tree.exists('game3d/shots/gait/390x844-chibi=0-after/b.png'))

    def test_tracked_registries_keep_files_but_untracked_manifests_do_not(self):
        self.tree.write('art/parts/library.json', text='{"parts": [{"img": "art/parts/job-q/a.png"}]}', age=RECENT)
        self.tree.track('art/parts/library.json')
        self.tree.write('art/parts/job-q/a.png')
        self.tree.write('art/parts/job-r/manifest.json', text='{"img": "art/parts/job-r/b.png"}')
        self.tree.write('art/parts/job-r/b.png')
        self.tree.sweep(apply=True)
        self.assertTrue(self.tree.exists('art/parts/job-q/a.png'))
        self.assertFalse(self.tree.exists('art/parts/job-r/b.png'))

    def test_lock_spend_and_sync_lists_keep_files(self):
        self.tree.write('tools/assets/assets.lock.json',
                        text='{"files": {"bible/shots/locked.png": {"size": 1}}}', age=RECENT)
        self.tree.write('bible/shots/locked.png')
        self.tree.write('tools/spend.json', text='[{"out": "art/parts/job-p/pics/a1.png"}]', age=RECENT)
        self.tree.write('art/parts/job-p/pics/a1.png')
        self.tree.write('tools/assets/sync.json', text='{"lists": ["tools/creator/public.json"]}', age=RECENT)
        self.tree.write('tools/creator/public.json', text='{"x": "art/candidates/listed/y.png"}', age=RECENT)
        self.tree.write('art/candidates/listed/y.png')
        self.tree.sweep(apply=True)
        self.assertTrue(self.tree.exists('bible/shots/locked.png'))
        self.assertTrue(self.tree.exists('art/parts/job-p/pics/a1.png'))
        self.assertTrue(self.tree.exists('art/candidates/listed/y.png'))

    def test_symlinks_are_never_followed_or_removed(self):
        secret = self.tree.write('island/private/secret.png')
        link = os.path.join(self.tree.root, 'game3d/shots/links/target.png')
        os.makedirs(os.path.dirname(link))
        os.symlink(secret, link)
        self.tree.sweep(apply=True)
        self.assertTrue(os.path.islink(link))
        self.assertTrue(self.tree.exists('island/private/secret.png'))

    def test_a_linked_scratch_root_is_skipped(self):
        outside = tempfile.TemporaryDirectory(prefix='outputs-outside-')
        self.addCleanup(outside.cleanup)
        target = os.path.join(outside.name, 'elsewhere')
        os.makedirs(target)
        with open(os.path.join(target, 'old.png'), 'w', encoding='utf-8') as f:
            f.write('x')
        os.utime(os.path.join(target, 'old.png'), (NOW - OLD, NOW - OLD))
        os.makedirs(os.path.join(self.tree.root, 'game3d'), exist_ok=True)
        os.symlink(target, os.path.join(self.tree.root, 'game3d/shots'))
        result = self.tree.sweep(apply=True)
        self.assertNotIn('game3d/shots', result)
        self.assertTrue(os.path.exists(os.path.join(target, 'old.png')))

    def test_days_option_sets_the_age(self):
        self.tree.write('game3d/shots/month-old/a.png', age=OLD)
        self.tree.sweep(apply=True, days=60)
        self.assertTrue(self.tree.exists('game3d/shots/month-old/a.png'))

    def test_missing_scratch_roots_are_skipped(self):
        result = self.tree.sweep()
        self.assertEqual(result, {})


class Cli(unittest.TestCase):
    def setUp(self):
        self.tree = Tree(self)
        self.state = tempfile.TemporaryDirectory(prefix='outputs-state-')
        self.addCleanup(self.state.cleanup)
        patch = mock.patch.object(outputs.cachedir, 'state_root', return_value=self.state.name)
        patch.start()
        self.addCleanup(patch.stop)

    def test_summary_is_one_dry_run_line(self):
        self.tree.write('game3d/shots/old-job/a.png')
        code, out = self.tree.cli('--summary')
        self.assertEqual(code, 0)
        lines = out.splitlines()
        self.assertEqual(len(lines), 1)
        self.assertIn('1 folders', lines[0])
        self.assertIn('Dry run', lines[0])
        self.assertTrue(self.tree.exists('game3d/shots/old-job/a.png'))

    def test_dry_run_lists_folders_with_list(self):
        self.tree.write('game3d/shots/old-job/a.png')
        code, out = self.tree.cli('--list')
        self.assertEqual(code, 0)
        self.assertIn('game3d/shots/old-job  1 files', out)
        self.assertIn('Nothing deleted', out)

    def test_apply_deletes_and_logs_each_file(self):
        self.tree.write('game3d/shots/old-job/a.png')
        code, out = self.tree.cli('--apply')
        self.assertEqual(code, 0)
        self.assertFalse(self.tree.exists('game3d/shots/old-job/a.png'))
        with open(os.path.join(self.state.name, 'outputs-prune.log'), encoding='utf-8') as f:
            log = f.read()
        self.assertIn('deleted game3d/shots/old-job/a.png 100', log)
        self.assertIn('== prune --apply done', log)
        self.assertIn(os.path.join(self.state.name, 'outputs-prune.log'), out)

    def test_tracked_from_is_refused_with_apply(self):
        listing = os.path.join(self.tree.root, 'listing.z')
        with open(listing, 'wb') as f:
            f.write(b'')
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
            self.tree.cli('--apply', '--tracked-from', listing)
        self.assertEqual(caught.exception.code, 2)

    def test_git_hook_variables_do_not_redirect_the_listing(self):
        self.tree.write('art/candidates/round-a/gen.py')
        self.tree.track('art/candidates/round-a/gen.py')
        with mock.patch.dict(os.environ, {'GIT_DIR': os.path.join(self.tree.root, 'nowhere')}):
            self.assertEqual(outputs.tracked_paths(self.tree.root), {'art/candidates/round-a/gen.py'})

    def test_tracked_from_list_is_read_as_nul_separated_paths(self):
        listing = os.path.join(self.tree.root, 'listing.z')
        with open(listing, 'wb') as f:
            f.write(b'art/candidates/round-a/gen.py\0bible/shots/x.png\0')
        self.assertEqual(outputs.tracked_paths(self.tree.root, listing),
                         {'art/candidates/round-a/gen.py', 'bible/shots/x.png'})


if __name__ == '__main__':
    unittest.main()
