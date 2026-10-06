#!/usr/bin/env python3
"""Codex adapter for the repository's shared Claude command hooks.

Accepts the native hook JSON on stdin. `prompt` logs and checks notifications;
`check` checks notifications without inventing a user message; `guard` adapts
Codex file edits to the existing private-layout guard. No model or network API.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
HOOKS = ROOT / '.claude' / 'hooks'


def invoke(name, data):
    env = {**os.environ, 'CLAUDE_PROJECT_DIR': str(ROOT)}
    script = HOOKS / name
    if name == 'private_guard.py' and not script.exists():
        # The local privacy/layout policy is deliberately outside the public commit.
        common = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse',
                                          '--path-format=absolute', '--git-common-dir'], text=True).strip()
        script = Path(common).parent / '.claude/hooks' / name
    if not script.is_file():
        raise RuntimeError(f'Required shared hook is missing: {name}')
    return subprocess.run([sys.executable, str(script)], input=json.dumps(data),
                          text=True, capture_output=True, env=env, timeout=20)


def guard_inputs(data):
    """Native Bash already uses command; patch headers need individual file checks."""
    tool = data.get('tool_name', '')
    ti = data.get('tool_input') or {}
    if tool == 'apply_patch':
        patch = ti.get('command', '') if isinstance(ti, dict) else ti
        for _, name in re.findall(r'^\*\*\* (Add File|Update File|Delete File|Move to): (.+)$', patch, re.M):
            yield {**data, 'tool_name': 'Write', 'tool_input': {'file_path': name}}
    elif tool == 'view_image':
        yield {**data, 'tool_name': 'Read', 'tool_input': {'file_path': ti.get('path', '')}}
    else:
        yield data


def main(mode, data):
    data = {**data, 'client': 'codex', 'session_id': 'codex/' + data.get('session_id', '?')}
    if mode == 'guard':
        if 'manifest.user.json' in json.dumps(data.get('tool_input', {})):
            print('Blocked: manifest.user.json belongs to Jørgen alone.', file=sys.stderr)
            return 2
        for item in guard_inputs(data):
            result = invoke('private_guard.py', item)
            if result.returncode:
                print(result.stderr, file=sys.stderr, end='')
                return 2  # Codex blocks on 2; a generic hook error alone does not block the tool.
        return 0
    if mode not in ('prompt', 'check'):
        raise ValueError('Expected prompt, check or guard')
    scripts = ['review_new.py', 'game_feedback_new.py']
    if mode == 'prompt':
        scripts.insert(0, 'feedback_log.py')
    context = []
    for name in scripts:
        result = invoke(name, data)
        if result.returncode:
            raise RuntimeError(f'{name} failed: {result.stderr.strip()}')
        if result.stdout.strip():
            output = json.loads(result.stdout)
            text = output.get('hookSpecificOutput', {}).get('additionalContext')
            if text:
                context.append(text)
    if context:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': data.get('hook_event_name', 'UserPromptSubmit'),
                                                'additionalContext': '\n\n'.join(context)}}))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main(sys.argv[1], json.load(sys.stdin)))
    except (ValueError, KeyError, OSError, subprocess.SubprocessError, RuntimeError) as error:
        print(f'Codex repository hook failed: {error}', file=sys.stderr)
        raise SystemExit(2 if sys.argv[1:2] == ['guard'] else 1)
