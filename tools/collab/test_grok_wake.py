"""Isolated tests for the Grok inbox wake. No live session and no Codex queue."""
import json
import os
from pathlib import Path
import tempfile
import unittest

import grok_wake as wake


class WakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "collab").mkdir()
        self.inbox = self.root / "collab/to-grok.md"
        self.inbox.write_text("## C-0001 · 2026-10-01 · ask\nrefs: old\nOld message.\n")
        self.state = self.root / "state"

    def append(self, text):
        with self.inbox.open("a") as out:
            out.write(text)

    def seed(self, at=10):
        self.assertIsNone(wake.collect(self.root, self.state, at, require_idle=False))

    def test_baseline_skips_existing_entries(self):
        self.seed()
        self.assertIsNone(wake.collect(self.root, self.state, 20, require_idle=False))

    def test_running_turn_holds_mail_until_stop(self):
        self.seed()
        self.append("\n## C-0002 · 2026-10-02 · ask\nPlease look.\n")
        self.assertIsNone(wake.collect(self.root, self.state, 20, require_idle=False))
        self.assertIsNone(wake.collect(self.root, self.state, 23, require_idle=True))
        message = wake.collect(self.root, self.state, 24, require_idle=False)
        self.assertIn("C-0002", message)
        self.assertIsNone(wake.collect(self.root, self.state, 30, require_idle=False))

    def test_idle_watcher_delivers_once_and_goes_busy(self):
        self.seed()
        wake.set_idle(self.state, True)
        self.append("\n## X-0002 · 2026-10-02 · review\nA finding.\n")
        self.assertIsNone(wake.collect(self.root, self.state, 20, require_idle=True))
        message = wake.collect(self.root, self.state, 23, require_idle=True)
        self.assertIn("X-0002", message)
        self.assertFalse(wake.read_state(self.state)["idle"])
        self.assertIsNone(wake.collect(self.root, self.state, 30, require_idle=True))

    def test_partial_heading_waits_then_coalesces(self):
        self.seed()
        self.append("\n## C-0002 · 2026-10-02 · ask\nrefs: new\n")
        self.assertIsNone(wake.collect(self.root, self.state, 20, require_idle=False))
        self.assertIsNone(wake.collect(self.root, self.state, 23, require_idle=False))
        self.append("Please look.\n\n## X-0009 · 2026-10-02 · answer\nDone.\n")
        self.assertIsNone(wake.collect(self.root, self.state, 30, require_idle=False))
        message = wake.collect(self.root, self.state, 33, require_idle=False)
        self.assertIn("C-0002, X-0009", message)

    def test_duplicate_headings_stay_distinct(self):
        self.seed()
        for _ in range(2):
            self.append("\n## C-0002 · 2026-10-02 · answer\nDone.\n")
        self.assertIsNone(wake.collect(self.root, self.state, 12, require_idle=False))
        message = wake.collect(self.root, self.state, 15, require_idle=False)
        self.assertIn("C-0002, C-0002", message)

    def test_body_edit_does_not_replay(self):
        self.seed()
        replacement = self.root / "replacement"
        replacement.write_text(self.inbox.read_text().replace("Old message.", "Corrected."))
        replacement.replace(self.inbox)
        self.assertIsNone(wake.collect(self.root, self.state, 13, require_idle=False))
        self.assertIsNone(wake.collect(self.root, self.state, 16, require_idle=False))

    def test_stop_ignores_subagents_and_shutdown(self):
        self.seed()
        wake.set_idle(self.state, False)
        self.append("\n## C-0002 · 2026-10-02 · ask\nPlease look.\n")
        self.assertIsNone(wake.collect(self.root, self.state, 12, require_idle=False))
        self.assertIsNone(wake.check(self.root, self.state, {"reason": "end_turn", "subagentType": "builder"}, now=14))
        self.assertIsNone(wake.check(self.root, self.state, {"reason": "shutdown"}, now=15))
        self.assertFalse(wake.read_state(self.state).get("idle"))
        self.assertIn("C-0002", wake.check(self.root, self.state, {"reason": "end_turn"}, now=16))

    def test_quiet_stop_arms_idle_when_the_watcher_is_up(self):
        self.seed()
        wake.remember_watcher(self.state, os.getpid())
        self.assertIsNone(wake.check(self.root, self.state, {"reason": "end_turn"}, now=20))
        self.assertTrue(wake.read_state(self.state)["idle"])

    def test_quiet_stop_asks_for_the_watcher_when_it_is_down(self):
        self.seed()
        reason = wake.check(self.root, self.state, {"reason": "end_turn"}, now=20)
        self.assertIn("grok-inbox-wake", reason)
        self.assertIn("grok_wake.py watch", reason)
        self.assertFalse(wake.read_state(self.state)["idle"])

    def test_prompt_marks_the_main_session_busy_only(self):
        self.seed()
        wake.set_idle(self.state, True)
        wake.prompt(self.state, {"subagentType": "builder"})
        self.assertTrue(wake.read_state(self.state)["idle"])
        wake.prompt(self.state, {})
        self.assertFalse(wake.read_state(self.state)["idle"])

    def test_second_watcher_refuses_the_live_pid(self):
        self.assertTrue(wake.remember_watcher(self.state, os.getpid()))
        self.assertFalse(wake.remember_watcher(self.state, os.getpid() + 1))
        wake.clear_watcher(self.state, os.getpid())
        self.assertIsNone(wake.read_state(self.state)["watcher_pid"])


if __name__ == "__main__":
    unittest.main()
