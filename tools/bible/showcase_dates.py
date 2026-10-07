"""Public Showcase chronology from entry commits (or local uncommitted edits)."""
import argparse
import datetime
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
ENTRY = re.compile(r'^showcase/([a-z0-9][a-z0-9-]*)/entry\.json$')


def showcase_dates(root=ROOT, *, local=False):
    """Feedback and media changes never change an entry's publication time."""
    def git(*args):
        return subprocess.check_output(['git', '-C', str(root), *args], text=True)

    dates = {}
    stamp = None
    for line in git('log', '--format=@%cI', '--name-only', 'HEAD', '--', 'showcase/*/entry.json').splitlines():
        if line.startswith('@'):
            stamp = line[1:]
        elif match := ENTRY.fullmatch(line):
            dates.setdefault(match[1], stamp)
    if local:
        changed = set(git('diff', '--name-only', 'HEAD', '--', 'showcase/*/entry.json').splitlines())
        changed.update(git('ls-files', '--others', '--exclude-standard', '--', 'showcase/*/entry.json').splitlines())
        for path in changed:
            match = ENTRY.fullmatch(path)
            source = root / path
            if match and source.is_file():
                dates[match[1]] = datetime.datetime.fromtimestamp(source.stat().st_mtime, datetime.timezone.utc).isoformat()
    return dates


def write_dates(destination, root=ROOT, *, local=False):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(showcase_dates(root, local=local), indent=2, sort_keys=True) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local', action='store_true')
    parser.add_argument('--output', default=ROOT / 'bible/showcase-dates.json')
    args = parser.parse_args()
    write_dates(args.output, local=args.local)
