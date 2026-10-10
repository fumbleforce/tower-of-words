#!/usr/bin/env python3
"""Sync the used assets with Cloudflare R2. Git keeps code, text and tools/assets/assets.lock.json; R2 keeps the files.

Used = every binary file under a root in tools/assets/sync.json (minus its excludes), plus every file the asset
library (tools/assets/scan.py) marks approved or provisional, wherever it lives, plus the files named in the `data`
list of each file under `lists` in sync.json (any type: the public creator's bodies are JSON). Everything else binary is local
(WIP, candidates, rejected, screenshots, production, legacy). Anything private (island/private, any private/ folder)
is never uploaded, whatever the config says.

R2 stores each file once, by content: blobs/<first 2 of sha256>/<sha256>. A changed file is a new blob, so old
versions stay until someone deletes them. The lock file maps each path to its size, sha256 and content type.

Usage:
  python3 tools/assets/sync.py status [--remote] [--all]   drift between disk, lock file and (with --remote) R2
  python3 tools/assets/sync.py push [--dry-run] [--prune]   upload new and changed used files, rewrite the lock file
  python3 tools/assets/sync.py pull [PATH ...] [--force]    fetch missing or changed files (optionally under PATHs)
  python3 tools/assets/sync.py check [--offline]            exit 1 if a used file is not in the lock file or not in R2
  python3 tools/assets/sync.py forget PATH ...              drop lock entries of files retired from the live folders
                                                            (tools/assets/live.mjs retire calls it)
  python3 tools/assets/sync.py check --offline --staged    the commit hook: an unpushed file fails only if the commit
                                                            being made uses it (staged_refs says how)

Credentials come from .env (or the environment): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
R2_ENDPOINT and R2_REGION override the endpoint (for testing against another S3 server).
Only the Python standard library is needed (plus PyYAML for the asset library scan).
"""
import argparse
import concurrent.futures
import contextlib
import datetime
import fnmatch
import hashlib
import hmac
import io
import json
import mimetypes
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.join(ROOT, 'tools', 'assets')
CONF = json.load(open(os.path.join(HERE, 'sync.json'), encoding='utf-8'))
LOCK = os.path.join(HERE, 'assets.lock.json')
LOCK_REL = 'tools/assets/assets.lock.json'
BIN_EXT = {'.' + e.lower() for e in CONF['binary_ext']}
EMPTY_SHA = hashlib.sha256(b'').hexdigest()
TYPES = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
         '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.opus': 'audio/opus', '.flac': 'audio/flac',
         '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
         '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.woff2': 'font/woff2', '.woff': 'font/woff',
         '.ttf': 'font/ttf', '.otf': 'font/otf', '.blend': 'application/x-blender'}
WORKERS = 8


# ------------------------------------------------------------------ which files are used
def is_binary(p):
    return os.path.splitext(p)[1].lower() in BIN_EXT


def matches(p, pats):
    return any(p.startswith(x) if x.endswith('/') else fnmatch.fnmatch(p, x) for x in pats)


def is_private(p):
    # hard rule, not only config: a path with a private/ folder anywhere never leaves this machine
    return 'private' in p.split('/')[:-1] or matches(p, CONF['never'])


def content_type(p):
    ext = os.path.splitext(p)[1].lower()
    return TYPES.get(ext) or mimetypes.guess_type(p)[0] or 'application/octet-stream'


def library():
    """The asset library's entries (scan.py builds them on import without writing anything)."""
    cwd = os.getcwd()
    os.chdir(ROOT)
    sys.path.insert(0, HERE)
    sys.dont_write_bytecode = True
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            import scan
        return list(scan.A.values())
    finally:
        sys.path.pop(0)
        os.chdir(cwd)


def used_files():
    """{path: 'root' | 'list' | 'library'} for used files on this disk, and a list of problems met on the way."""
    used, problems = {}, []
    for lst in CONF.get('lists', []):
        for p in json.load(open(os.path.join(ROOT, lst), encoding='utf-8'))['data']:
            if is_private(p):
                problems.append(f'{lst}: {p} is private and is never uploaded')
            elif os.path.isfile(os.path.join(ROOT, p)):
                used[p] = 'list'
    for r in CONF['roots']:
        base = os.path.join(ROOT, r)
        for dp, dns, fns in os.walk(base):
            dns[:] = sorted(d for d in dns if not d.startswith('.'))
            for fn in fns:
                p = os.path.relpath(os.path.join(dp, fn), ROOT).replace(os.sep, '/')
                if is_binary(p) and not matches(p, CONF['exclude']) and not is_private(p):
                    used[p] = 'root'
    try:
        for e in library():
            if e.get('status') in CONF['library_statuses']:
                for p in e.get('paths', []):
                    if is_binary(p) and not is_private(p) and p not in used and os.path.isfile(os.path.join(ROOT, p)):
                        used[p] = 'library'
    except Exception as ex:  # a broken scan must not silently shrink the used set
        problems.append(f'asset library scan failed ({type(ex).__name__}: {ex}); only the roots were read')
    return used, problems


# ------------------------------------------------------------------ hashing, with a cache in .git
def git_dir():
    r = subprocess.run(['git', 'rev-parse', '--git-common-dir'], cwd=ROOT, capture_output=True, text=True)
    d = r.stdout.strip() or '.git'
    return d if os.path.isabs(d) else os.path.join(ROOT, d)


CACHE_PATH = os.path.join(git_dir(), 'assets-sync-cache.json')


def load_cache():
    try:
        return json.load(open(CACHE_PATH))
    except (OSError, ValueError):
        return {}


def save_cache(c):
    try:
        tmp = CACHE_PATH + '.tmp'
        json.dump(c, open(tmp, 'w'))
        os.replace(tmp, CACHE_PATH)
    except OSError:
        pass


def sha_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def local_state(paths, cache):
    """{path: (size, sha256)} for the paths that exist on disk."""
    out = {}
    todo = []
    for p in paths:
        full = os.path.join(ROOT, p)
        try:
            st = os.stat(full)
        except OSError:
            continue
        c = cache.get(p)
        if c and c[0] == st.st_size and c[1] == st.st_mtime_ns:
            out[p] = (st.st_size, c[2])
        else:
            todo.append((p, st))
    with concurrent.futures.ThreadPoolExecutor(WORKERS) as ex:
        for (p, st), sha in zip(todo, ex.map(lambda t: sha_file(os.path.join(ROOT, t[0])), todo)):
            cache[p] = [st.st_size, st.st_mtime_ns, sha]
            out[p] = (st.st_size, sha)
    return out


# ------------------------------------------------------------------ the lock file
def load_lock():
    try:
        return json.load(open(LOCK, encoding='utf-8'))['files']
    except FileNotFoundError:
        return {}


def save_lock(files):
    lines = ['{',
             ' "about": "Used assets: path, size, sha256, content type. Files live in R2 at blobs/<sha256[:2]>/<sha256>. '
             'Written by tools/assets/sync.py push; see notes/asset-storage-proposal.md.",',
             ' "files": {']
    items = sorted(files.items())
    for i, (p, v) in enumerate(items):
        entry = json.dumps({'size': v['size'], 'sha256': v['sha256'], 'type': v['type']}, ensure_ascii=False)
        lines.append(f'  {json.dumps(p, ensure_ascii=False)}: {entry}' + (',' if i < len(items) - 1 else ''))
    lines += [' }', '}', '']
    tmp = LOCK + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    os.replace(tmp, LOCK)


def blob_key(sha):
    return f'blobs/{sha[:2]}/{sha}'


# ------------------------------------------------------------------ R2 over the S3 API (SigV4, standard library only)
def load_env():
    env = {}
    try:
        for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip().removeprefix('export ').strip()] = v.strip().strip('"').strip("'")
    except OSError:
        pass
    env.update({k: v for k, v in os.environ.items() if k.startswith('R2_')})
    return env


class R2:
    NEED = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']

    def __init__(self, env):
        missing = [k for k in self.NEED if not env.get(k) and not (k == 'R2_ACCOUNT_ID' and env.get('R2_ENDPOINT'))]
        if missing:
            raise SystemExit(f'missing in .env: {", ".join(missing)} (setup: notes/asset-storage-proposal.md, "Setup")')
        self.endpoint = (env.get('R2_ENDPOINT') or f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com").rstrip('/')
        self.region = env.get('R2_REGION', 'auto')
        self.bucket = env['R2_BUCKET']
        self.ak, self.sk = env['R2_ACCESS_KEY_ID'], env['R2_SECRET_ACCESS_KEY']
        self.host = urllib.parse.urlsplit(self.endpoint).netloc

    def _sign(self, method, uri, query, payload_sha):
        now = datetime.datetime.now(datetime.timezone.utc)
        amz, day = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
        q = '&'.join(f"{urllib.parse.quote(k, safe='-_.~')}={urllib.parse.quote(v, safe='-_.~')}" for k, v in sorted(query.items()))
        hdrs = {'host': self.host, 'x-amz-content-sha256': payload_sha, 'x-amz-date': amz}
        signed = ';'.join(sorted(hdrs))
        creq = '\n'.join([method, uri, q, ''.join(f'{k}:{hdrs[k]}\n' for k in sorted(hdrs)), signed, payload_sha])
        scope = f'{day}/{self.region}/s3/aws4_request'
        sts = '\n'.join(['AWS4-HMAC-SHA256', amz, scope, hashlib.sha256(creq.encode()).hexdigest()])
        k = ('AWS4' + self.sk).encode()
        for part in (day, self.region, 's3', 'aws4_request'):
            k = hmac.new(k, part.encode(), hashlib.sha256).digest()
        sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
        hdrs['authorization'] = f'AWS4-HMAC-SHA256 Credential={self.ak}/{scope}, SignedHeaders={signed}, Signature={sig}'
        del hdrs['host']
        return hdrs, q

    def request(self, method, key='', query=None, body=None, payload_sha=EMPTY_SHA, headers=None, tries=4):
        uri = '/' + urllib.parse.quote(self.bucket, safe='') + ('/' + urllib.parse.quote(key, safe='/-_.~') if key else '')
        for attempt in range(tries):
            hdrs, q = self._sign(method, uri, query or {}, payload_sha)
            hdrs.update(headers or {})
            data = body() if callable(body) else body
            req = urllib.request.Request(self.endpoint + uri + ('?' + q if q else ''), data=data, method=method, headers=hdrs)
            try:
                return urllib.request.urlopen(req, timeout=120)
            except urllib.error.HTTPError as e:
                if e.code < 500 or attempt == tries - 1:
                    raise RuntimeError(f'{method} {key or self.bucket}: HTTP {e.code} {e.read()[:300].decode(errors="replace")}') from None
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                if attempt == tries - 1:
                    raise RuntimeError(f'{method} {key or self.bucket}: {e}') from None
            finally:
                if hasattr(data, 'close'):
                    data.close()
            time.sleep(1.5 * (attempt + 1))

    def list_blobs(self):
        """{sha256: size} for every blob in the bucket."""
        out, token = {}, None
        ns = '{http://s3.amazonaws.com/doc/2006-03-01/}'
        while True:
            q = {'list-type': '2', 'prefix': 'blobs/', 'max-keys': '1000'}
            if token:
                q['continuation-token'] = token
            root = ET.fromstring(self.request('GET', query=q).read())
            for c in root.iter(ns + 'Contents'):
                out[c.find(ns + 'Key').text.rsplit('/', 1)[-1]] = int(c.find(ns + 'Size').text)
            nxt = root.find(ns + 'NextContinuationToken')
            if root.findtext(ns + 'IsTruncated') != 'true' or nxt is None:
                return out
            token = nxt.text

    def put(self, path, sha, size, ctype):
        self.request('PUT', blob_key(sha), body=lambda: open(os.path.join(ROOT, path), 'rb'), payload_sha=sha,
                     headers={'content-length': str(size), 'content-type': ctype}).read()

    def get(self, sha, dest):
        """Download a blob to dest (atomically), checking its sha256."""
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        r = self.request('GET', blob_key(sha))
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), prefix='.sync-')
        h = hashlib.sha256()
        try:
            with os.fdopen(fd, 'wb') as f:
                for chunk in iter(lambda: r.read(1 << 20), b''):
                    h.update(chunk)
                    f.write(chunk)
            if h.hexdigest() != sha:
                raise RuntimeError(f'{dest}: downloaded data does not match sha256 {sha[:12]}')
            os.replace(tmp, dest)
        except BaseException:
            with contextlib.suppress(OSError):
                os.unlink(tmp)
            raise


# ------------------------------------------------------------------ drift
def drift(remote=None):
    """Compare the used files on disk with the lock file (and R2, if a blob listing is given)."""
    used, problems = used_files()
    lock = load_lock()
    cache = load_cache()
    have = local_state(sorted(set(used) | set(lock)), cache)
    save_cache(cache)
    d = {'used': used, 'lock': lock, 'have': have, 'problems': problems,
         'new': sorted(p for p in used if p not in lock),
         'changed': sorted(p for p in used if p in lock and have[p][1] != lock[p]['sha256']),
         'missing': sorted(p for p in lock if p not in have),
         'dropped': sorted(p for p in lock if p in have and p not in used),
         'private': sorted(p for p in lock if is_private(p)),
         'outside': sorted(p for p, why in used.items() if why == 'library')}
    if remote is not None:
        d['unsent'] = sorted(p for p in lock if lock[p]['sha256'] not in remote)
    return d


def mb(n):
    return f'{n / 2**20:.1f} MB'


def show(title, paths, all_, sizes=None):
    if not paths:
        return
    extra = f', {mb(sum(sizes[p] for p in paths))}' if sizes else ''
    print(f'{title}: {len(paths)}{extra}')
    for p in paths if all_ else paths[:12]:
        print('   ', p)
    if not all_ and len(paths) > 12:
        print(f'    ... {len(paths) - 12} more (--all)')


def cmd_status(a):
    remote = R2(load_env()).list_blobs() if a.remote else None
    d = drift(remote)
    sizes = {p: v[0] for p, v in d['have'].items()}
    total = sum(sizes[p] for p in d['used'])
    print(f"used on disk: {len(d['used'])} files, {mb(total)} ({len(d['outside'])} of them outside the roots, "
          f"picked by the asset library); lock file: {len(d['lock'])} entries")
    for p in d['problems']:
        print('PROBLEM', p)
    show('not in the lock file (push)', d['new'], a.all, sizes)
    show('changed since the lock file (push)', d['changed'], a.all, sizes)
    show('in the lock file, missing here (pull)', d['missing'], a.all)
    show('in the lock file, no longer used (push drops them)', d['dropped'], a.all)
    show('PRIVATE path in the lock file', d['private'], True)
    show('used outside the roots (asset library)', d['outside'], a.all)
    if remote is not None:
        show('in the lock file, not in R2 (push)', d['unsent'], a.all)
        print(f'R2: {len(remote)} blobs, {mb(sum(remote.values()))}')
    if not any(d[k] for k in ('new', 'changed', 'missing', 'dropped', 'private')) and not d.get('unsent'):
        print('in sync')


def run_parallel(fn, jobs, label):
    done, failed = [], []
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(WORKERS) as ex:
        futs = {ex.submit(fn, j): j for j in jobs}
        for i, f in enumerate(concurrent.futures.as_completed(futs), 1):
            j = futs[f]
            try:
                f.result()
                done.append(j)
            except Exception as e:
                failed.append(j)
                print(f'FAILED {j[0]}: {e}', file=sys.stderr)
            if i % 50 == 0 or i == len(jobs):
                print(f'  {label} {i}/{len(jobs)} ({time.time() - t0:.0f} s)', flush=True)
    return done, failed


def cmd_push(a):
    r2 = None if a.dry_run else R2(load_env())
    remote = r2.list_blobs() if r2 else {}
    d = drift()
    for p in d['problems']:
        print('PROBLEM', p)
    if d['problems'] and not a.dry_run:
        raise SystemExit('not pushing while the used set may be incomplete')
    have, used, lock = d['have'], d['used'], d['lock']
    jobs, seen = [], set()
    for p in sorted(used):
        size, sha = have[p]
        if sha not in remote and sha not in seen:
            seen.add(sha)
            jobs.append((p, sha, size, content_type(p)))
    print(f"{len(used)} used files; to upload: {len(jobs)} ({mb(sum(j[2] for j in jobs))}); "
          f"lock: +{len(d['new'])} new, {len(d['changed'])} changed, -{len(d['dropped'])} no longer used"
          + (f", -{len(d['missing'])} missing here (--prune)" if a.prune else ''))
    if a.dry_run:
        show('would upload', [j[0] for j in jobs], a.all)
        return
    done, failed = run_parallel(lambda j: r2.put(*j), jobs, 'uploaded') if jobs else ([], [])
    bad = {j[1] for j in failed}
    files = {p: v for p, v in lock.items() if p not in used and p not in d['dropped'] and not (a.prune and p in d['missing'])}
    for p in used:
        size, sha = have[p]
        if sha in bad:
            if p in lock:
                files[p] = lock[p]  # keep the last version that did reach R2
            continue
        files[p] = {'size': size, 'sha256': sha, 'type': content_type(p)}
    files = {p: v for p, v in files.items() if not is_private(p)}
    save_lock(files)
    print(f'uploaded {len(done)} files; lock file has {len(files)} entries. Commit {LOCK_REL}.')
    if failed:
        raise SystemExit(f'{len(failed)} uploads failed; run push again')


def cmd_pull(a):
    lock = load_lock()
    want = {p: v for p, v in lock.items() if not a.paths or any(p == x.rstrip('/') or p.startswith(x.rstrip('/') + '/') for x in a.paths)}
    cache = load_cache()
    have = local_state(sorted(want), cache)
    jobs, kept = [], []
    for p, v in sorted(want.items()):
        if p in have and have[p][1] == v['sha256']:
            continue
        if p in have and not a.force:
            kept.append(p)
            continue
        jobs.append((p, v['sha256'], v['size']))
    show('changed here, not overwritten (push them, or pull --force)', kept, a.all)
    print(f'{len(want)} files in the lock file{" under " + ", ".join(a.paths) if a.paths else ""}; '
          f'to fetch: {len(jobs)} ({mb(sum(j[2] for j in jobs))})')
    if a.dry_run or not jobs:
        return
    r2 = R2(load_env())
    done, failed = run_parallel(lambda j: r2.get(j[1], os.path.join(ROOT, j[0])), jobs, 'fetched')
    for p, sha, size in done:
        st = os.stat(os.path.join(ROOT, p))
        cache[p] = [st.st_size, st.st_mtime_ns, sha]
    save_cache(cache)
    print(f'fetched {len(done)} files')
    if failed:
        raise SystemExit(f'{len(failed)} downloads failed; run pull again')


def staged_refs():
    """What the commit being made uses, from the index: the text of its added or changed text files, and their folders.

    A used file on disk that is unlocked, or changed since the lock, is the commit's problem only if the commit uses
    it: its path or file name appears in that text as a whole name, or it sits in a folder the commit adds or changes
    files in (a Showcase entry.json next to its images). Anything else is someone's work in progress in this checkout
    (or linked from the main one), not this commit's business."""
    listed = subprocess.run(['git', 'diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'], cwd=ROOT,
                            capture_output=True, check=True).stdout.decode()
    texts, dirs = [], set()
    for name in filter(None, listed.split('\0')):
        dirs.add(os.path.dirname(name))
        blob = subprocess.run(['git', 'show', f':{name}'], cwd=ROOT, capture_output=True, check=True).stdout
        if b'\0' not in blob[:1 << 16] and len(blob) <= CONF['max_text_kb'] * 1024:
            texts.append(blob.decode('utf-8', 'replace'))
    return '\n'.join(texts), dirs


def used_by(p, refs):
    text, dirs = refs
    if os.path.dirname(p) in dirs:
        return True
    return re.search(r'(?<![\w.-])' + re.escape(os.path.basename(p)) + r'(?![\w-])', text) is not None


def cmd_check(a):
    remote = None
    problems = []
    if not a.offline:
        try:
            remote = R2(load_env()).list_blobs()
        except (SystemExit, RuntimeError) as e:
            problems.append(f'cannot list R2: {e} (--offline skips the R2 check)')
    d = drift(remote)
    new, changed, elsewhere = d['new'], d['changed'], []
    if a.staged:  # the commit hook: judge what this commit uses, not every stray file in the checkout
        refs = staged_refs()
        elsewhere = [p for p in new + changed if not used_by(p, refs)]
        new, changed = [p for p in new if p not in elsewhere], [p for p in changed if p not in elsewhere]
    problems += d['problems']
    problems += [f'used, not in the lock file: {p}' for p in new]
    problems += [f'changed, not pushed: {p}' for p in changed]
    problems += [f'private path in the lock file: {p}' for p in d['private']]
    problems += [f'in the lock file, not in R2: {p}' for p in d.get('unsent', [])]
    for p in d['missing'][:5]:
        print(f'note: missing here (pull fetches it): {p}')
    if len(d['missing']) > 5:
        print(f"note: {len(d['missing']) - 5} more missing here")
    for p in elsewhere[:3]:
        print(f'note: not pushed, but this commit does not use it: {p}')
    if len(elsewhere) > 3:
        print(f'note: {len(elsewhere) - 3} more not pushed that this commit does not use')
    for p in problems[:40]:
        print('FAIL', p)
    if len(problems) > 40:
        print(f'FAIL ... {len(problems) - 40} more')
    print(f"check: {len(d['used'])} used files, {len(d['lock'])} in the lock file"
          + ('' if remote is None else f', {len(remote)} blobs in R2') + f": {'OK' if not problems else f'{len(problems)} problems'}")
    sys.exit(1 if problems else 0)


def cmd_forget(a):
    # tools/assets/live.mjs retire moves a live file out of its root; its lock entry goes in the same commit. Only
    # entries whose file is gone from this disk are dropped (a folder path drops everything under it).
    files = load_lock()
    gone = [p for p in files if any(p == q or (q.endswith('/') and p.startswith(q)) for q in a.paths)
            and not os.path.exists(os.path.join(ROOT, p))]
    for p in gone:
        del files[p]
    if gone:
        save_lock(files)
    print(f'lock: {len(gone)} entr{"y" if len(gone) == 1 else "ies"} dropped')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('status', help='drift between disk, lock file and R2')
    s.add_argument('--remote', action='store_true', help='also list R2 (needs credentials)')
    s.add_argument('--all', action='store_true', help='list every path, not the first 12')
    s = sub.add_parser('push', help='upload new and changed used files and rewrite the lock file')
    s.add_argument('--dry-run', action='store_true')
    s.add_argument('--prune', action='store_true', help='drop lock entries whose file is gone from this disk')
    s.add_argument('--all', action='store_true')
    s = sub.add_parser('pull', help='fetch files that are missing or different here')
    s.add_argument('paths', nargs='*', help='only under these paths')
    s.add_argument('--force', action='store_true', help='overwrite files changed here')
    s.add_argument('--dry-run', action='store_true')
    s.add_argument('--all', action='store_true')
    s = sub.add_parser('check', help='exit 1 if a used file is not in the lock file or not in R2')
    s.add_argument('--offline', action='store_true', help='skip the R2 listing')
    s.add_argument('--staged', action='store_true',
                   help='fail on an unpushed file only if the staged commit uses it (the commit hook)')
    s = sub.add_parser('forget', help='drop the lock entries of retired files (gone from this disk)')
    s.add_argument('paths', nargs='+')
    a = ap.parse_args()
    {'status': cmd_status, 'push': cmd_push, 'pull': cmd_pull, 'check': cmd_check, 'forget': cmd_forget}[a.cmd](a)


if __name__ == '__main__':
    main()
