"""Isolated tests for post.py: the body limit, id numbering across archives, and the byte-exact rotation.

Run: python3 -m unittest discover -s tools/collab -p 'test_post.py' -v
"""
import contextlib
import importlib.util
import io
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import codex_wake  # noqa: E402  (the watcher must keep its keys across a rotation)

_spec = importlib.util.spec_from_file_location('post', HERE / 'post.py')
post = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(post)


def entry(eid, date, body, kind='ask'):
    return f'\n## {eid} · {date} · {kind}\nrefs: none\nclaude-main: {body}\n'.encode()


class PostTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(self.tmp.name)
        self.patches = [
            mock.patch.object(post, 'ROOT', root),
            mock.patch.object(post, 'COLLAB', root / 'collab'),
            mock.patch.object(post, 'ARCHIVE', root / 'collab' / 'archive'),
            mock.patch.object(post, 'ROTATE_OVER', 1000),
            mock.patch.object(post, 'ROTATE_TO', 600),
        ]
        for p in self.patches:
            p.start()
        self.collab = root / 'collab'
        self.collab.mkdir()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        self.tmp.cleanup()

    def write_inbox(self, name, chunks, preamble=b'# Inbox\n\nAppend only.\n'):
        data = preamble + b''.join(chunks)
        (self.collab / f'{name}.md').write_bytes(data)
        return data

    def test_rotation_moves_oldest_entries_word_for_word(self):
        chunks = [entry(f'C-{i:04d}', '2026-09-29' if i <= 3 else '2026-10-02', 'x' * 150) for i in range(1, 9)]
        original = self.write_inbox('to-codex', chunks)
        pre = original[:original.index(b'## C-')]
        with contextlib.redirect_stderr(io.StringIO()):
            moved = post.rotate_inbox('to-codex')
        self.assertGreater(moved, 0)
        inbox = (self.collab / 'to-codex.md').read_bytes()
        self.assertLess(len(inbox), post.ROTATE_TO)
        self.assertTrue(inbox.startswith(pre))
        archived = b''.join((self.collab / 'archive' / name).read_bytes()
                            for name in ('to-codex-2026-09.md', 'to-codex-2026-10.md')
                            if (self.collab / 'archive' / name).exists())
        # Archived text, then what stayed, is exactly the original text after the preamble.
        self.assertEqual(archived + inbox[len(pre):], original[len(pre):])
        self.assertTrue((self.collab / 'archive' / 'to-codex-2026-09.md').exists())

    def test_repeated_heading_moves_with_its_copies(self):
        chunks = [entry('C-0001', '2026-09-29', 'a' * 150), entry('C-0002', '2026-09-29', 'b' * 150),
                  entry('C-0003', '2026-09-29', 'c' * 150), entry('C-0001', '2026-09-29', 'a' * 150),
                  entry('C-0004', '2026-10-02', 'd' * 150)]
        original = self.write_inbox('to-codex', chunks)
        before = codex_wake.entries(original.decode())
        with contextlib.redirect_stderr(io.StringIO()):
            post.rotate_inbox('to-codex')
        kept = (self.collab / 'to-codex.md').read_text()
        self.assertNotIn('## C-0001 · 2026-09-29 · ask', kept)
        # Every entry that stays keeps its key, so the wake watcher sends no nudge for it.
        self.assertLessEqual(set(codex_wake.entries(kept)), set(before))

    def test_long_body_is_refused_with_a_note_path(self):
        self.write_inbox('to-codex', [entry('C-0001', '2026-09-29', 'short')])
        out = io.StringIO()
        with mock.patch.object(sys, 'argv', ['post.py', 'to-codex', 'ask', 'claude-main/x', '--body', 'y' * 1501]):
            with contextlib.redirect_stderr(out), self.assertRaises(SystemExit) as stop:
                post.main()
        self.assertIn('refused', str(stop.exception.code))  # sys.exit(message): the message is the code
        self.assertIn('collab/notes/C-0002.md', str(stop.exception.code))
        self.assertEqual((self.collab / 'to-codex.md').read_bytes().count(b'## C-'), 1)

    def test_ids_continue_past_archived_entries(self):
        (self.collab / 'archive').mkdir()
        (self.collab / 'archive' / 'to-codex-2026-08.md').write_text('\n## C-0040 · 2026-08-01 · ask\nold\n')
        self.write_inbox('to-codex', [entry('C-0003', '2026-09-29', 'kept')])
        out = io.StringIO()
        with mock.patch.object(sys, 'argv', ['post.py', 'to-codex', 'answer', 'claude-main/x', '--body', 'ok']):
            with contextlib.redirect_stdout(out):
                post.main()
        self.assertEqual(out.getvalue().strip(), 'C-0041')


if __name__ == '__main__':
    unittest.main()
