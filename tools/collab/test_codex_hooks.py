"""Exercise hook compatibility without reading or writing real feedback/private data."""
import contextlib
import importlib.util
import io
import hashlib
import json
from datetime import datetime
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

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

    def test_internal_envelopes_do_not_become_human_feedback(self):
        envelopes = [f'<{tag} source="test">Internal instructions</{tag}>'
                     for tag in ('agent-message', 'cross-session-message', 'codex_internal_context')]
        for prompt in [*envelopes, '\n  ' + '\n'.join(envelopes) + '\n']:
            with self.subTest(prompt=prompt):
                result = adapter.invoke('feedback_log.py', {'prompt': prompt})
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, '')
        self.assertFalse((self.root / 'notes/feedback-log').exists())

    def test_user_prose_and_quotes_of_internal_tags_are_logged_verbatim(self):
        prompts = [
            'Please stop recording <agent-message> notices.',
            'He wrote "<cross-session-message>hello</cross-session-message>".',
            '````\n<agent-message>quoted</agent-message>\n````',
            '<agent-message>an incomplete tag in my report',
            '<agent-message>quoted</agent-message> Please fix this.',
            '<agent-message>one</agent-message> My feedback. <agent-message>two</agent-message>',
            '<agent-message-example>my example</agent-message>',
            '  日本語\n\nKeep this spacing.\n',
            'Keep my <system-reminder>quoted words</system-reminder> too.',
            '<system-reminder>Please keep this user feedback.</system-reminder>',
            '<agent-message>quoted</agent-message> <system-reminder>Please fix it.</system-reminder>',
            '<system-reminder>context</system-reminder>\n<agent-message>quoted</agent-message>',
            '<task-notification>quoted</task-notification> Please fix this.',
            '<command-name>quoted</command-name> Please fix this.',
            '<system-reminder>Please fix this.</system-reminder>/compact',
        ]
        for number, prompt in enumerate(prompts):
            result = adapter.invoke('feedback_log.py', {'prompt': prompt, 'turn_id': str(number)})
            self.assertEqual(result.returncode, 0, result.stderr)
        log = next((self.root / 'notes/feedback-log').glob('*.md')).read_text()
        for prompt in prompts:
            self.assertIn('\n' + prompt + '\n', log)

    def test_commands_and_complete_control_envelopes_are_excluded(self):
        for prompt in ('', '  ', '/compact', '<task-notification>done</task-notification>',
                       '<command-name>/compact</command-name>', '<local-command-stdout>done</local-command-stdout>',
                       '<bash-stdout>done</bash-stdout>', '<teammate-message>done</teammate-message>'):
            result = adapter.invoke('feedback_log.py', {'prompt': prompt})
            self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.root / 'notes/feedback-log').exists())

    def test_native_and_manual_retries_share_the_legacy_marker(self):
        folder = self.root / 'notes/feedback-log'
        folder.mkdir(parents=True)
        path = folder / (datetime.now().astimezone().strftime('%Y-%m-%d') + '.md')
        identity = 'codex/test\0one\0Keep this.'
        marker = '<!-- feedback-event ' + hashlib.sha256(identity.encode()).hexdigest() + ' -->'
        prior = marker + '\nAlready logged by the native hook.\n'
        path.write_text(prior)
        original_invoke = adapter.invoke

        def invoke_logger_only(name, data):
            if name == 'feedback_log.py':
                return original_invoke(name, data)
            return subprocess.CompletedProcess([], 0, '', '')

        with mock.patch.object(adapter, 'invoke', side_effect=invoke_logger_only):
            for _ in range(2):
                self.assertEqual(adapter.main('prompt', {
                    'prompt': '  Keep this.\n', 'session_id': 'test', 'turn_id': 'one'}), 0)
        self.assertEqual(path.read_text(), prior)
        result = original_invoke('feedback_log.py', {
            'prompt': '  Keep this.\n', 'session_id': 'codex/test', 'turn_id': 'two'})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('\n  Keep this.\n\n', path.read_text())

    def test_logger_filesystem_failure_is_visible_and_propagates(self):
        (self.root / 'notes').write_text('This file prevents creating the log directory.')
        result = adapter.invoke('feedback_log.py', {'prompt': 'Do not lose this.'})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Feedback log failed:', result.stderr)
        self.assertEqual(result.stdout, '')
        with self.assertRaisesRegex(RuntimeError, 'feedback_log.py failed: Feedback log failed:'):
            adapter.main('prompt', {'prompt': 'Do not lose this.'})

    def test_logger_malformed_input_is_visible(self):
        script = self.root / '.claude/hooks/feedback_log.py'
        for payload in ('{', json.dumps(['unexpected payload'])):
            with self.subTest(payload=payload):
                result = subprocess.run(['python3', str(script)], input=payload,
                                        text=True, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Feedback log failed:', result.stderr)
        self.assertFalse((self.root / 'notes/feedback-log').exists())

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
