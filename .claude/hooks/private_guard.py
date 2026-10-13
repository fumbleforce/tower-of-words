#!/usr/bin/env python3
"""PreToolUse: keep island/private/ to the layout in island/PRIVATE.md.

Blocks (exit 2, the reason on stderr goes back to the agent):
  - any Read, Glob, Grep, Write or Edit that touches island/private/user/ (Jørgen's alone);
  - a Write/Edit/NotebookEdit under island/private/ that breaks the layout (tools/private-layout.json);
  - a Bash command that makes or moves something new at the top of island/private/ or island/private/rewards/
    that breaks it (mkdir, touch, cp, mv, tee, a > redirect). Files written by a script's own code are not seen
    here; tools/private_layout.py (npm run check) catches those.
"""
import json
import os
import re
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(HERE)), 'tools'))
import private_layout as pl  # noqa: E402
from common import main_root  # noqa: E402

MARK = 'island/private/'


def rel_of(p):
    p = os.path.normpath(p).replace('\\', '/')
    i = p.find('/' + MARK)
    if i >= 0:
        return p[i + 1 + len(MARK):]
    if p.startswith(MARK):
        return p[len(MARK):]
    return None


def deny(msg):
    sys.stderr.write(msg + '\nThe layout is in island/PRIVATE.md (Layout) and tools/private-layout.json. Put the work where the layout says, or ask Jørgen before changing it.\n')
    sys.exit(2)


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    repo = main_root(data)
    tool = data.get('tool_name', '')
    ti = data.get('tool_input') or {}
    s = pl.spec()
    paths = [ti.get(k) for k in ('file_path', 'path', 'notebook_path') if isinstance(ti.get(k), str)]
    if tool == 'Glob' and isinstance(ti.get('pattern'), str):
        paths.append(ti['pattern'])
    writing = tool in ('Write', 'Edit', 'MultiEdit', 'NotebookEdit')
    for p in paths:
        rel = rel_of(p)
        if rel is None:
            continue
        if rel.split('/')[0] == s['user_only']:
            deny(f'Blocked: {p} is under island/private/user/, which is Jørgen\'s alone.')
        if writing:
            why = pl.path_problem(rel, s)
            if why and not os.path.exists(p):
                deny(f'Blocked: writing {p} breaks the private layout: {why}.')
    if tool == 'Bash':
        cmd = ti.get('command') or ''
        if re.search(r'island/private/+user\b', cmd):
            deny('Blocked: the command touches island/private/user/, which is Jørgen\'s alone.')
        if re.search(r'\b(mkdir|touch|cp|mv|tee|install|ln)\b|>', cmd):
            root = data.get('cwd') or os.getcwd()
            for m in re.finditer(r'island/private/+([A-Za-z0-9_.-]+)(?:/+([A-Za-z0-9_.-]+))?', cmd):
                rel = m.group(1) + ('/' + m.group(2) if m.group(2) else '')
                if m.group(2) and '.' not in m.group(2):
                    rel += '/_'  # a bare name in a command is a folder: judge it as one
                real = rel[:-2] if rel.endswith('/_') else rel
                if os.path.exists(os.path.join(repo, 'island/private', real)) or os.path.exists(os.path.join(root, 'island/private', real)):
                    continue
                why = pl.path_problem(rel, s)
                if why:
                    deny(f'Blocked: the command would create island/private/{real}, which breaks the private layout: {why}.')


main()
