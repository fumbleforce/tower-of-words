"""Exercise hook compatibility without reading or writing real feedback/private data."""
import contextlib
import importlib.util
import io
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
POLICY_ROOT = Path(subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse',
                                          '--path-format=absolute', '--git-common-dir'], text=True).strip()).parent
spec = importlib.util.spec_from_file_location('codex_hooks', HERE / 'codex_hooks.py')
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


class HooksTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / '.git').mkdir()
        shutil.copytree(ROOT / '.claude/hooks', self.root / '.claude/hooks')
        (self.root / 'tools').mkdir()
        guard = POLICY_ROOT / '.claude/hooks/private_guard.py'
        if guard.exists():
            shutil.copy(guard, self.root / '.claude/hooks/private_guard.py')
        for name in ('private_layout.py', 'private-layout.json'):
            if (POLICY_ROOT / 'tools' / name).exists():
                shutil.copy(POLICY_ROOT / 'tools' / name, self.root / 'tools' / name)
        self.old_root, self.old_hooks = adapter.ROOT, adapter.HOOKS
        adapter.ROOT, adapter.HOOKS = self.root, self.root / '.claude/hooks'

    def tearDown(self):
        adapter.ROOT, adapter.HOOKS = self.old_root, self.old_hooks
        self.temp.cleanup()

    def test_retry_deduplicates_but_later_identical_prompt_is_logged(self):
        data = {'prompt': 'Kenji sounds wrong. 日本語', 'session_id': 'test', 'turn_id': 'one'}
        for _ in range(2):
            self.assertEqual(adapter.invoke('feedback_log.py', data).returncode, 0)
        data['turn_id'] = 'two'
        adapter.invoke('feedback_log.py', data)
        log = next((self.root / 'notes/feedback-log').glob('*.md')).read_text()
        self.assertEqual(log.count(data['prompt']), 2)

    def test_game_feedback_reaches_each_client_once(self):
        feedback = self.root / 'notes/feedback-game/example'
        feedback.mkdir(parents=True)
        (feedback / 'text.md').write_text('# Feedback\n\nContext\n\nThe map is hard to read.')
        for client in ('claude', 'codex'):
            data = {'client': client}
            first = adapter.invoke('game_feedback_new.py', data)
            self.assertIn('The map is hard to read.', first.stdout)
            self.assertEqual(adapter.invoke('game_feedback_new.py', data).stdout, '')

    def test_broken_guard_dependency_blocks_instead_of_allowing_tool(self):
        (self.root / '.claude/hooks/private_guard.py').write_text('import missing_guard_dependency\n')
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(adapter.main('guard', {'tool_name': 'Bash', 'tool_input': {'command': 'true'}}), 2)

    def test_native_patch_guard_checks_all_headers(self):
        if not (self.root / '.claude/hooks/private_guard.py').exists():
            self.skipTest('Local private-layout guard is not installed')
        for header in ('Add File', 'Update File', 'Delete File', 'Move to'):
            payload = {'tool_name': 'apply_patch', 'tool_input': {
                'command': f'*** Begin Patch\n*** {header}: island/private/user/example.txt\n*** End Patch'}}
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(adapter.main('guard', payload), 2)

    def test_public_patch_allowed_and_new_bad_layout_denied(self):
        if not (self.root / '.claude/hooks/private_guard.py').exists():
            self.skipTest('Local private-layout guard is not installed')
        for path, expected in [('game3d/example.js', 0), ('island/private/stray.txt', 2)]:
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(adapter.main('guard', {'tool_name': 'apply_patch', 'tool_input': {
                    'command': f'*** Add File: {path}\n+example'}}), expected)

    def test_bash_and_image_guard(self):
        if not (self.root / '.claude/hooks/private_guard.py').exists():
            self.skipTest('Local private-layout guard is not installed')
        payloads = [
            {'tool_name': 'Bash', 'tool_input': {'command': 'cat island/private/user/example'}},
            {'tool_name': 'view_image', 'tool_input': {'path': 'island/private/user/example.png'}},
            {'tool_name': 'Read', 'tool_input': {'file_path': 'manifest.user.json'}},
        ]
        for payload in payloads:
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(adapter.main('guard', payload), 2)


if __name__ == '__main__':
    unittest.main()
