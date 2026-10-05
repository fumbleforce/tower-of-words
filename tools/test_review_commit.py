"""tools/review_commit.py in throwaway git repos.

Run: python3 -m unittest discover -s tools -p 'test_review_commit.py'
"""
import contextlib
import io
import json
import os
import subprocess
import tempfile
import unittest

import review_commit


def git(root, *args):
    return subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, check=True).stdout


def write(root, rel, data):
    p = os.path.join(root, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    return p


class ReviewCommitTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='review-commit-test-')
        self.root = os.path.join(self.tmp.name, 'repo')
        os.makedirs(self.root)
        git(self.root, 'init', '-q', '-b', 'main')
        git(self.root, 'config', 'user.name', 'test')
        git(self.root, 'config', 'user.email', 'test@example.invalid')
        git(self.root, 'config', 'core.hooksPath', os.devnull)
        self.review = write(self.root, 'reviews/a/review.json', {'status': 'open'})
        write(self.root, 'notes.txt', {})
        git(self.root, 'add', '.')
        git(self.root, 'commit', '-q', '-m', 'start')

    def tearDown(self):
        self.tmp.cleanup()

    def commit(self, paths, root=None):
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            ok = review_commit.commit(paths, 'Review: a, decided', root=root or self.root)
        return ok, err.getvalue()

    def test_commits_only_the_given_files_with_facts_none(self):
        write(self.root, 'reviews/a/review.json', {'status': 'decided'})
        fb = write(self.root, 'reviews/a/feedback.json', {'picked': ['x']})  # new, untracked
        write(self.root, 'notes.txt', {'other': 1})  # someone's unstaged edit stays out
        ok, err = self.commit([self.review, fb])
        self.assertTrue(ok, err)
        self.assertEqual(git(self.root, 'log', '-1', '--format=%B').strip(), 'Review: a, decided\n\nFacts: none')
        self.assertEqual(sorted(git(self.root, 'show', '--name-only', '--format=', 'HEAD').split()),
                         ['reviews/a/feedback.json', 'reviews/a/review.json'])
        self.assertEqual(git(self.root, 'status', '--porcelain').strip(), 'M notes.txt')

    def test_nothing_changed_makes_no_commit(self):
        head = git(self.root, 'rev-parse', 'HEAD')
        self.assertEqual(self.commit([self.review]), (False, ''))
        self.assertEqual(git(self.root, 'rev-parse', 'HEAD'), head)

    def test_skips_with_a_warning_when_other_changes_are_staged(self):
        write(self.root, 'reviews/a/review.json', {'status': 'decided'})
        write(self.root, 'notes.txt', {'other': 1})
        git(self.root, 'add', 'notes.txt')
        head = git(self.root, 'rev-parse', 'HEAD')
        ok, err = self.commit([self.review])
        self.assertFalse(ok)
        self.assertIn('other changes are staged (notes.txt)', err)
        self.assertEqual(git(self.root, 'rev-parse', 'HEAD'), head)
        self.assertEqual(git(self.root, 'diff', '--cached', '--name-only').split(), ['notes.txt'])

    def test_skips_with_a_warning_in_a_worktree(self):
        wt = os.path.join(self.tmp.name, 'wt')
        git(self.root, 'worktree', 'add', '-q', '-b', 'side', wt)
        path = write(wt, 'reviews/a/review.json', {'status': 'decided'})
        head = git(wt, 'rev-parse', 'HEAD')
        ok, err = self.commit([path], root=wt)
        self.assertFalse(ok)
        self.assertIn('in a worktree', err)
        self.assertEqual(git(wt, 'rev-parse', 'HEAD'), head)

    def test_ignores_files_outside_reviews_and_showcase(self):
        private = write(self.root, 'island/private/rewards/reviews/a/feedback.json', {'picked': ['x']})
        other = write(self.root, 'notes.txt', {'other': 1})
        self.assertEqual(self.commit([private, other]), (False, ''))
        self.assertEqual(git(self.root, 'rev-list', '--count', 'HEAD').strip(), '1')


if __name__ == '__main__':
    unittest.main()
