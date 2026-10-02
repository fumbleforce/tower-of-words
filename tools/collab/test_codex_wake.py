"""Isolated delivery tests. The fake queue is a real subprocess with a durable log."""
import json
from pathlib import Path
import tempfile
import unittest
import uuid

import codex_wake as wake


class WakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "collab").mkdir()
        self.inbox = self.root / "collab/to-codex.md"
        self.inbox.write_text("## C-0001 · 2026-10-01 · ask\nrefs: old\nOld message.\n")
        self.state = self.root / "state"
        self.codex = self.root / "codex"
        self.codex.write_text(
            "#!/usr/bin/env python3\nimport json, pathlib, sys\n"
            "root = pathlib.Path(__file__).parent\n"
            "if (root / 'fail').exists(): sys.exit(1)\n"
            "with (root / 'sent').open('a') as f: f.write(json.dumps(sys.argv[1:]) + '\\n')\n")
        self.codex.chmod(0o755)
        self.thread = str(uuid.uuid4())
        wake.bind(self.root, self.state, self.thread, str(self.codex))

    def append(self, text):
        with self.inbox.open("a") as out:
            out.write(text)

    def messages(self):
        sent = self.root / "sent"
        return [json.loads(line) for line in sent.read_text().splitlines()] if sent.exists() else []

    def settle(self, at=10):
        wake.tick(self.root, self.state, now=at)
        wake.tick(self.root, self.state, now=at + 3)

    def test_baseline_no_replay_and_one_delivery_after_restart(self):
        self.settle()
        self.assertEqual(self.messages(), [])
        self.append("\n## C-0002 · 2026-10-02 · ask\nPlease review.\n")
        wake.tick(self.root, self.state, now=20)
        self.assertEqual(self.messages(), [])
        wake.tick(self.root, self.state, now=23)
        wake.tick(self.root, self.state, now=30)
        self.assertEqual(len(self.messages()), 1)
        self.assertIn("C-0002", self.messages()[0][-1])
        self.assertEqual(self.messages()[0][0:3], ["queue", "--thread", self.thread])

    def test_queue_failure_retries_without_losing_message(self):
        self.append("\n## C-0002 · 2026-10-02 · ask\nPlease review.\n")
        (self.root / "fail").touch()
        with self.assertRaises(RuntimeError):
            self.settle()
        (self.root / "fail").unlink()
        wake.tick(self.root, self.state, now=30)
        self.assertEqual(len(self.messages()), 1)

    def test_partial_write_waits_and_coalesces_multiple_senders(self):
        self.append("\n## C-0002 · 2026-10-02 · ask\nrefs: new\n")
        self.settle()
        self.assertEqual(self.messages(), [])
        self.append("Please review.\n\n## G-0002 · 2026-10-02 · answer\nDone.\n")
        self.settle(20)
        self.assertEqual(len(self.messages()), 1)
        self.assertIn("C-0002, G-0002", self.messages()[0][-1])

    def test_rebind_preserves_pending_messages(self):
        self.append("\n## C-0002 · 2026-10-02 · ask\nPlease review.\n")
        other = str(uuid.uuid4())
        wake.bind(self.root, self.state, other, str(self.codex))
        self.settle()
        self.assertEqual(self.messages()[0][2], other)

    def test_duplicate_ids_and_identical_headings_are_distinct(self):
        for _ in range(2):
            self.append("\n## C-0002 · 2026-10-02 · answer\nDone.\n")
        self.settle()
        self.assertIn("C-0002, C-0002", self.messages()[0][-1])

    def test_old_body_edits_and_atomic_replacement_do_not_replay(self):
        self.settle()
        replacement = self.root / "replacement"
        replacement.write_text(self.inbox.read_text().replace("Old message.", "Corrected message."))
        replacement.replace(self.inbox)
        self.settle(20)
        self.assertEqual(self.messages(), [])

    def test_corrupt_state_fails_without_resetting_history(self):
        (self.state / "state.json").write_text("invalid")
        with self.assertRaises(ValueError):
            self.settle()
        self.assertEqual((self.state / "state.json").read_text(), "invalid")


if __name__ == "__main__":
    unittest.main()
