"""Public chronology uses content history, never feedback or checkout times."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from showcase_dates import showcase_dates


class ShowcaseDatesTest(unittest.TestCase):
    def test_commits_feedback_and_local_edits(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            def git(*args, date=None):
                env = dict(os.environ)
                if date:
                    env.update(GIT_AUTHOR_DATE=date, GIT_COMMITTER_DATE=date)
                subprocess.run(['git', '-C', folder, *args], check=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            git('init')
            git('config', 'user.email', 'test@example.invalid')
            git('config', 'user.name', 'Test')
            entry = root / 'showcase/bakery/entry.json'
            entry.parent.mkdir(parents=True)
            entry.write_text('{}')
            git('add', '.')
            git('commit', '-m', 'bakery', date='2026-10-07T02:00:00+02:00')
            pool = root / 'showcase/pool/entry.json'
            pool.parent.mkdir()
            pool.write_text('{}')
            git('add', '.')
            git('commit', '-m', 'pool', date='2026-10-07T11:00:00+02:00')
            (entry.parent / 'feedback.json').write_text('{}')
            git('add', '.')
            git('commit', '-m', 'feedback', date='2026-10-07T12:00:00+02:00')
            dates = showcase_dates(root)
            self.assertEqual(dates['bakery'], '2026-10-07T02:00:00+02:00')
            self.assertEqual(dates['pool'], '2026-10-07T11:00:00+02:00')
            entry.write_text('{"caption":"new round"}')
            os.utime(entry, (1791378000, 1791378000))
            newest = root / 'showcase/new/entry.json'
            newest.parent.mkdir()
            newest.write_text('{}')
            local = showcase_dates(root, local=True)
            self.assertGreater(local['bakery'], dates['pool'])
            self.assertIn('new', local)
            self.assertEqual(showcase_dates(root), dates)
            self.assertEqual(local['pool'], dates['pool'])
            git('add', str(entry))
            git('commit', '-m', 'new round', date='2026-10-07T13:00:00+02:00')
            self.assertEqual(showcase_dates(root)['bakery'], '2026-10-07T13:00:00+02:00')


if __name__ == '__main__':
    unittest.main()
