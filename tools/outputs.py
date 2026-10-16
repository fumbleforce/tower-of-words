#!/usr/bin/env python3
"""Sweep scratch output that has not changed for 14 days, and keep anything still in use.

    python3 tools/outputs.py prune              dry run (the default): per scratch root, the folders and GB that
                                                would go, and the GB kept because something refers to them
    python3 tools/outputs.py prune --list       the same, plus each folder that would go
    python3 tools/outputs.py prune --summary    one line (./start prints it)
    python3 tools/outputs.py prune --apply      delete. Every deleted file is logged to ~/.cache/amakawa/outputs-prune.log

    --days N           the age limit (default 14)
    --root DIR         the checkout to sweep (default: the one this file is in)
    --tracked-from F   a `git ls-files -z` list to use instead of running git in --root (dry runs only)

The rules and their reasons are in ARCHITECTURE.md (Tool state and outputs). The scratch roots, the render types and
the never-touched folders are the constants below.
"""
import argparse
import dataclasses
import datetime as dt
import glob
import json
import os
import posixpath
import re
import stat
import subprocess
import sys
import time
from urllib.parse import unquote

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, 'lib'))
import cachedir  # noqa: E402  tools/lib/cachedir.py: where tool state lives

DAYS = 14
GB = 1e9
# Scratch roots. 'all' takes every untracked file in an old job. 'render' takes only pictures and video, so the
# sources, logs and notes beside the renders stay.
SCRATCH = {
    'game3d/shots': 'all',
    'art/candidates': 'all',
    'bible/shots': 'all',
    'art/parts': 'render',
    'art/production': 'render',
    'notes/playtests': 'render',
    'notes/feedback-game': 'render',
}
RENDER_EXT = {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif', '.bmp', '.tif', '.tiff',
              '.mp4', '.webm', '.mov', '.mkv'}
# Never swept, however old or untracked: private folders, approved and live assets, and retired live files.
NEVER = ['island/private', 'art/approved', 'game3d/assets', 'game3d/audio', 'art/production/retired', '.git']
# Sources that name scratch paths, which then stay. Data: the review and showcase items, the bible and the pages
# it publishes, the docs the bible reads, the asset library and its lock, and the spend ledger (paid outputs).
# Every tracked JSON or YAML file is a source too (registries such as art/parts/library.json).
DATA_SOURCES = ['reviews', 'showcase', 'bible', 'docs/game', 'notes/walkthrough', 'GUIDE.md',
                'notes/RELATIONSHIPS.md', 'notes/ISLAND.md', 'art/approved/README.md', 'tools/assets/*.json',
                'tools/spend.json']
DATA_EXT = ('.json', '.yaml', '.yml')
DATA_SKIP = ['bible/shots']
# Game code, which loads some of its pictures and models from these folders. Tool scripts are not sources: they
# name old folders as examples and workspaces.
CODE_SOURCES = ['game3d']
CODE_SKIP = ['game3d/shots', 'game3d/tools', 'game3d/test']
TEXT_EXT = {'.json', '.js', '.mjs', '.cjs', '.html', '.css', '.md', '.yaml', '.yml', '.txt', '.svg', '.py', '.sh',
            '.csv'}
# A path word: everything up to a quote, bracket, template or URL delimiter. Names may hold @ = # ! and non-ASCII.
TOKEN = re.compile(r"[^\s'\"`<>(){}\[\],;|$?&:*\\]+")
HOST = re.compile(r"https?://[^/\s'\"`<>()]*")


@dataclasses.dataclass
class Entry:
    rel: str
    size: int
    mtime: float
    link: bool


@dataclasses.dataclass
class Job:
    rel: str
    go: list = dataclasses.field(default_factory=list)  # entries that would be deleted
    kept: int = 0  # bytes kept because something refers to them


@dataclasses.dataclass
class Stats:
    folders: int = 0
    go_bytes: int = 0
    kept_bytes: int = 0
    jobs: list = dataclasses.field(default_factory=list)  # (rel, files, bytes) for --list

    def add(self, job):
        self.kept_bytes += job.kept
        if job.go:
            size = sum(e.size for e in job.go)
            self.folders += 1
            self.go_bytes += size
            self.jobs.append((job.rel, len(job.go), size))


@dataclasses.dataclass
class Refs:
    names: set  # scratch paths that a source names: a file, or a folder (which keeps everything under it)

    def holds(self, rel):
        parts = rel.split('/')
        return any('/'.join(parts[:i]) in self.names for i in range(1, len(parts) + 1))


def is_within(rel, folder):
    return rel == folder or rel.startswith(folder + '/')


def protected(rel):
    return any(is_within(rel, p) for p in NEVER)


def in_scratch(rel):
    return any(rel.startswith(top + '/') for top in SCRATCH)


def in_scope(rel, scope):
    return scope == 'all' or posixpath.splitext(rel)[1].lower() in RENDER_EXT


def relpath(root, full):
    return os.path.relpath(full, root).replace(os.sep, '/')


def git(root, *args):
    """Run git in root. GIT_* variables from a hook (GIT_DIR, GIT_INDEX_FILE) are dropped, so git works on root only."""
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    return subprocess.run(['git', '-C', root, *args], check=True, capture_output=True, env=env).stdout


def tracked_paths(root, listing=None):
    """Every git-tracked path, from a `git ls-files -z` list file or from git in root."""
    if listing:
        with open(listing, 'rb') as f:
            data = f.read()
    else:
        try:
            data = git(root, 'ls-files', '-z', '--full-name')
        except (OSError, subprocess.CalledProcessError) as err:
            sys.exit(f'outputs: cannot list the tracked files of {root}: {err}')
    return {os.fsdecode(p) for p in data.split(b'\0') if p}


def top_jobs(root, top):
    """(rel, is_folder) for every job directly under a scratch root."""
    for name in sorted(os.listdir(os.path.join(root, top))):
        rel = f'{top}/{name}'
        full = os.path.join(root, rel)
        if os.path.islink(full) or protected(rel):
            continue
        if os.path.isdir(full):
            yield from folder_jobs(root, rel)
        elif os.path.isfile(full):
            yield rel, False


def folder_jobs(root, rel):
    """A folder that holds files is one job, with everything under it. A folder of only folders is a container:
    its subfolders are the jobs (game3d/shots/fast/<run> is one job per run)."""
    subdirs, has_files = [], False
    for name in sorted(os.listdir(os.path.join(root, rel))):
        child = f'{rel}/{name}'
        full = os.path.join(root, child)
        if os.path.islink(full) or protected(child):
            continue
        if os.path.isdir(full):
            subdirs.append(child)
        elif os.path.isfile(full):
            has_files = True
    if has_files or not subdirs:
        yield rel, True
    else:
        for child in subdirs:
            yield from folder_jobs(root, child)


def stat_entry(root, full):
    """The Entry for one file, or None when it has just gone (another process may be writing or deleting)."""
    try:
        st = os.lstat(full)
    except FileNotFoundError:
        return None
    return Entry(relpath(root, full), st.st_size, st.st_mtime, stat.S_ISLNK(st.st_mode))


def job_entries(root, rel, is_folder):
    if not is_folder:
        entry = stat_entry(root, os.path.join(root, rel))
        if entry:
            yield entry
        return
    for dirpath, dirs, names in os.walk(os.path.join(root, rel)):
        dirs[:] = [d for d in dirs if not protected(relpath(root, os.path.join(dirpath, d)))
                   and not os.path.islink(os.path.join(dirpath, d))]
        for name in names:
            entry = stat_entry(root, os.path.join(dirpath, name))
            if entry:
                yield entry


def plan(root, rel, is_folder, scope, tracked, refs, cutoff):
    """The job's deletions, or None when the job is recent (its newest file is inside the limit) or empty."""
    entries = list(job_entries(root, rel, is_folder))
    if not entries or max(e.mtime for e in entries) >= cutoff:
        return None
    job = Job(rel)
    for e in entries:
        if e.link or e.rel in tracked or protected(e.rel) or not in_scope(e.rel, scope):
            continue
        if refs.holds(e.rel):
            job.kept += e.size
        else:
            job.go.append(e)
    return job


def remove_empty(folder, stop, root, log):
    """Remove folder and its emptied parents, up to (not including) the scratch root folder stop."""
    while folder.startswith(stop + os.sep):
        try:
            os.rmdir(folder)
        except OSError:
            return
        log(f'removed folder {relpath(root, folder)}')
        folder = os.path.dirname(folder)


def delete(root, top, job, log):
    """Delete the job's files and the folders they empty. Returns the bytes that could not be removed."""
    touched, failed = set(), 0
    for e in job.go:
        full = os.path.join(root, e.rel)
        try:
            os.remove(full)
        except OSError as err:
            log(f'error {e.rel}: {err.strerror}')
            failed += e.size
            continue
        log(f'deleted {e.rel} {e.size}')
        touched.add(os.path.dirname(full))
    stop = os.path.join(root, top)
    for folder in sorted(touched, key=len, reverse=True):
        remove_empty(folder, stop, root, log)
    return failed


def sweep(root, tracked, refs, days=DAYS, now=None, apply=False, log=None):
    """Per scratch root, the Stats of what would go (with apply: what was deleted)."""
    cutoff = (time.time() if now is None else now) - days * 86400
    result = {}
    for top, scope in SCRATCH.items():
        base = os.path.join(root, top)
        if not os.path.isdir(base) or os.path.islink(base):  # a linked root could point outside the checkout
            continue
        stats = result[top] = Stats()
        for rel, is_folder in top_jobs(root, top):
            job = plan(root, rel, is_folder, scope, tracked, refs, cutoff)
            if job is None:
                continue
            stats.add(job)
            if apply and job.go:
                stats.go_bytes -= delete(root, top, job, log)
    return result


def read_text(root, rel):
    """The text of a source file; a file that cannot be read names nothing."""
    try:
        with open(os.path.join(root, rel), encoding='utf-8', errors='replace') as f:
            return f.read()
    except OSError:
        return ''


def text_files(root, pattern, skip=()):
    """Text files a source names: the file itself, or every text file under the folder. Links are never followed."""
    for path in sorted(glob.glob(os.path.join(root, pattern), recursive=True)):
        if os.path.islink(path):
            continue
        if os.path.isfile(path):
            yield relpath(root, path)
            continue
        for dirpath, dirnames, names in os.walk(path):
            here = relpath(root, dirpath)
            dirnames[:] = [d for d in dirnames
                           if f'{here}/{d}' not in skip and not os.path.islink(os.path.join(dirpath, d))]
            for name in names:
                full = os.path.join(dirpath, name)
                if os.path.splitext(name)[1].lower() in TEXT_EXT and not os.path.islink(full):
                    yield relpath(root, full)


def tokens(text):
    """Path words (anything with a slash in it), with a served URL's host removed. A word that ends in sentence
    punctuation is also read without it."""
    text = HOST.sub('', text.replace('\\/', '/'))
    out = []
    for word in TOKEN.findall(text):
        if '/' not in word.strip('/'):
            continue
        out.append(word)
        trimmed = word.rstrip('.!?#')
        if trimmed != word and '/' in trimmed:
            out.append(trimmed)
    return out


def resolve(token, src_dir):
    """Repo-relative readings of a path word: from the repo root and from the file that names it. A leading slash
    is the site root, which is the repo root."""
    path = unquote(token)
    bases = [''] if path.startswith('/') else ['', src_dir]
    out = set()
    for base in bases:
        rel = posixpath.normpath(posixpath.join(base, path.lstrip('/')))
        if rel not in ('.', '..') and not rel.startswith('../'):
            out.add(rel)
    return out


def sync_lists(root):
    path = os.path.join(root, 'tools/assets/sync.json')
    if not os.path.isfile(path):
        return []
    with open(path, encoding='utf-8') as f:
        return list(json.load(f).get('lists', []))


def tracked_data(root, tracked):
    """Tracked JSON and YAML files. A tracked file is never deleted, so it counts even inside a scratch root
    (art/parts/library.json); the bible captures and the game captures are not data."""
    skip = DATA_SKIP + CODE_SKIP
    return [t for t in sorted(tracked)
            if t.endswith(DATA_EXT) and not any(is_within(t, s) for s in skip) and os.path.isfile(os.path.join(root, t))]


def reference_sets(root, tracked):
    """Every scratch path that a source names (see DATA_SOURCES, CODE_SOURCES and tracked_data)."""
    sources = [(p, DATA_SKIP) for p in DATA_SOURCES + sync_lists(root)] + [(p, CODE_SKIP) for p in CODE_SOURCES]
    srcs = [src for pattern, skip in sources for src in text_files(root, pattern, skip)]
    names = set()
    for src in srcs + tracked_data(root, tracked):
        for word in tokens(read_text(root, src)):
            names.update(r for r in resolve(word, posixpath.dirname(src)) if in_scratch(r))
    return Refs(names)


def gb(n):
    return f'{n / GB:.2f} GB'


def table(result, verb):
    lines = []
    for top, s in result.items():
        lines.append(f'  {top:<22} {s.folders:>6} folders  {gb(s.go_bytes):>11} {verb}  '
                     f'{gb(s.kept_bytes):>10} kept because referenced')
    return lines


def totals(result):
    folders = sum(s.folders for s in result.values())
    go = sum(s.go_bytes for s in result.values())
    kept = sum(s.kept_bytes for s in result.values())
    return folders, go, kept


def main(argv=None):
    ap = argparse.ArgumentParser(description='Sweep scratch output older than the limit (see the top of this file).')
    ap.add_argument('command', choices=['prune'])
    ap.add_argument('--apply', action='store_true', help='delete (the default is a dry run)')
    ap.add_argument('--list', action='store_true', help='dry run: also list each folder that would go')
    ap.add_argument('--summary', action='store_true', help='dry run: print one line')
    ap.add_argument('--days', type=int, default=DAYS, help=f'age limit in days (default {DAYS})')
    ap.add_argument('--root', default=ROOT, help='the checkout to sweep')
    ap.add_argument('--tracked-from', metavar='FILE', help='a git ls-files -z list, instead of git in --root')
    a = ap.parse_args(argv)
    if a.apply and a.tracked_from:
        ap.error('--tracked-from is for dry runs only')
    if a.apply and a.summary:
        ap.error('--summary is a dry run')
    if a.days < 1:
        ap.error('--days must be at least 1')
    root = os.path.abspath(a.root)
    tracked = tracked_paths(root, a.tracked_from)
    refs = reference_sets(root, tracked)
    if not a.apply:
        result = sweep(root, tracked, refs, a.days)
        folders, go, kept = totals(result)
        if a.summary:
            print(f'outputs: {folders} folders, {gb(go)} would go, {gb(kept)} kept because referenced '
                  f'(untouched for {a.days} days). Dry run: python3 tools/outputs.py prune --list')
            return 0
        print(f'outputs prune, dry run, {a.days} days, {root}')
        print('\n'.join(table(result, 'would go')))
        print(f'  {"total":<22} {folders:>6} folders  {gb(go):>11} would go  {gb(kept):>10} kept because referenced')
        if a.list:
            for top, s in result.items():
                for rel, files, size in s.jobs:
                    print(f'    {rel}  {files} files  {gb(size)}')
        print('Nothing deleted. Use --apply to delete, or --list to name each folder.')
        return 0
    log_path = os.path.join(cachedir.state_root(), 'outputs-prune.log')
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    stamp = dt.datetime.now().astimezone().isoformat(timespec='seconds')
    with open(log_path, 'a', encoding='utf-8') as f:
        def log(text):
            f.write(f'{dt.datetime.now().astimezone().isoformat(timespec="seconds")} {text}\n')
        log(f'== prune --apply started {stamp}, {a.days} days, {root}')
        result = sweep(root, tracked, refs, a.days, apply=True, log=log)
        folders, go, kept = totals(result)
        log(f'== prune --apply done: {folders} folders, {gb(go)} deleted, {gb(kept)} kept because referenced')
    print(f'outputs prune, applied, {a.days} days, {root}')
    print('\n'.join(table(result, 'deleted')))
    print(f'  {"total":<22} {folders:>6} folders  {gb(go):>11} deleted  {gb(kept):>10} kept because referenced')
    print(f'Log: {log_path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
