#!/usr/bin/env python3
"""Sync the used assets with Cloudflare R2. Git keeps code, text and tools/assets/assets.lock.json; R2 keeps the files.

Used = every binary file under a root in tools/assets/sync.json (minus its excludes), plus every file the asset
library (tools/assets/scan.py) marks approved or provisional, wherever it lives, plus the files named in the `data`
list of each file under `lists` in sync.json (any type: the public creator's bodies are JSON). Everything else binary is local
(WIP, candidates, rejected, screenshots, production, legacy). Anything private (island/private, any private/ folder)
is never uploaded, whatever the config says.

R2 stores each file once, by content: blobs/<first 2 of sha256>/<sha256>. A changed file is a new blob. Only the Showcase
and Review pictures the bible published (bible/pages-media.json) are ever deleted from R2: a push deletes the blobs of
the lock entries it drops, and `trim` lists and deletes the older ones. Game files are never deleted. The lock file maps
each path to its size, sha256 and content type.

Usage:
  python3 tools/assets/sync.py status [--remote] [--all]   drift between disk, lock file and (with --remote) R2
  python3 tools/assets/sync.py push [--dry-run] [--prune] [--only PATH ...]
                                                            upload new and changed used files, rewrite the lock file,
                                                            delete from R2 the published pictures' blobs it dropped
  python3 tools/assets/sync.py pull [PATH ...] [--force]    fetch missing or changed files (optionally under PATHs)
  python3 tools/assets/sync.py check [--offline]            exit 1 if a used file is not in the lock file or not in R2
  python3 tools/assets/sync.py trim [--list PATH | --delete PATH]
                                                            list the R2 blobs no lock file names, or delete exactly
                                                            the ones a list file names (trim_plan says which may go)
  python3 tools/assets/sync.py forget PATH ...              drop lock entries of files retired from the live folders
                                                            (tools/assets/live.mjs retire calls it)
  python3 tools/assets/sync.py check --offline --staged    the commit hook: an unpushed file fails only if the commit
                                                            being made uses it (staged_refs says how)

Credentials come from .env (or the environment): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
R2_ENDPOINT and R2_REGION override the endpoint (for testing against another S3 server).
Only the Python standard library is needed (plus PyYAML for the asset library scan).
"""
import argparse
import collections
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
sys.path.insert(0, os.path.join(ROOT, 'tools', 'lib'))
import cachedir  # noqa: E402  (tool state lives under ~/.cache/amakawa, never in .git)


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

    def delete(self, sha):
        """Delete one blob. Only drop_from_r2 and cmd_trim call this, and only for published Showcase and Review pictures."""
        self.request('DELETE', blob_key(sha)).read()


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
    if a.only:
        # a targeted push (the commit hook, tools/bible/pages.py register): only these used files are uploaded and
        # locked; no other lock entry changes, so nothing is dropped
        absent = [p for p in a.only if p not in used]
        if absent:
            raise SystemExit(f'not used here (listed or in a root, and on this disk): {", ".join(absent[:5])}')
        used = {p: used[p] for p in a.only}
        d = dict(d, new=[p for p in used if p not in lock],
                 changed=[p for p in used if p in lock and have[p][1] != lock[p]['sha256']], dropped=[], missing=[])
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
    drop_from_r2(r2, {p: lock[p] for p in d['dropped']}, {v['sha256'] for v in files.values()})


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


# ------------------------------------------------------------------ what leaves R2
# A picture that drops off the public feed, or a closed Review's, leaves R2 with the next push; older ones leave with
# trim. Only pictures the bible published ever leave, and the picture stays on this disk either way.
LOCK_ENTRY =re.compile(r'^\+  "((?:[^"\\]|\\.)*)": \{"size": (\d+), "sha256": "([0-9a-f]{64})"', re.M)
MEDIA_LIST = 'bible/pages-media.json'  # written by tools/bible/pages.py, one path per line
MEDIA_ENTRY = re.compile(r'^\+"((?:[^"\\]|\\.)*)",?$', re.M)
TRIM_LIST = os.path.join(cachedir.state_root(), 'r2-trim-list.txt')


def is_game_path(p):
    """A file under a library root (sync.json roots): the game's or the bible's, never deleted from R2."""
    return p.startswith(tuple(CONF['roots']))


def published_paths():
    """Every path the bible's media list ever named on main: the Showcase and Review pictures the public site shows."""
    out = set()
    for m in MEDIA_ENTRY.finditer(git('log', '-p', '--format=', '--', MEDIA_LIST)):
        out.add(json.loads(f'"{m.group(1)}"'))
    return out


def removable(paths, published):
    """'' when a blob may leave R2, else why it stays: it has no known path, a game file is among its paths, or none of its
    paths was ever published."""
    if not paths:
        return 'no known path'
    if any(is_game_path(p) for p in paths):
        return 'a game file'
    if not any(p in published for p in paths):
        return 'never a Showcase or Review picture'
    return ''


def git(*args, cwd=ROOT, check=True):
    return subprocess.run(['git', *args], cwd=cwd, capture_output=True, encoding='utf-8', errors='replace',
                          check=check).stdout


def is_ancestor(sub, ref, cwd):
    return subprocess.run(['git', 'merge-base', '--is-ancestor', sub, ref], cwd=cwd, capture_output=True).returncode == 0


def lock_pairs(text):
    """{(path, sha256)} of a lock file's text; no text names nothing."""
    if not text.strip():
        return set()
    try:
        return {(p, v['sha256']) for p, v in json.loads(text)['files'].items()}
    except (ValueError, KeyError, TypeError, AttributeError) as ex:
        raise SystemExit(f'cannot read a lock file ({ex}); nothing is deleted from R2 until it reads')


def added_shas(text, rev, cwd):
    """The sha256s of the entries a checkout or branch (rev, its lock file's text) adds to the lock file after its merge
    base with main. An entry it inherited from that base is left out: if main has dropped it, a landing drops it too."""
    base = git('merge-base', rev, 'main', cwd=cwd, check=False).strip()
    old = lock_pairs(git('show', f'{base}:{LOCK_REL}', cwd=cwd, check=False)) if base else set()
    return {sha for _, sha in lock_pairs(text) - old}


def named_elsewhere():
    """The sha256s another checkout or an unmerged branch adds to the lock file (added_shas). Such a blob stays: its
    owner's check or landing would find it missing. This checkout's own branch and lock file are left out, since the
    caller is changing them. A clean worktree whose HEAD main has merged adds nothing main lacks."""
    shas, here = set(), os.path.realpath(ROOT)
    for line in git('worktree', 'list', '--porcelain').splitlines():
        path = line[len('worktree '):] if line.startswith('worktree ') else ''
        if not os.path.isdir(path) or os.path.realpath(path) == here:  # a removed worktree names nothing
            continue
        if git('status', '--porcelain', '--', LOCK_REL, cwd=path).strip():  # uncommitted lock changes
            text = ''
            if os.path.isfile(os.path.join(path, LOCK_REL)):
                with open(os.path.join(path, LOCK_REL), encoding='utf-8') as f:
                    text = f.read()
            shas |= added_shas(text, 'HEAD', path)
        elif not is_ancestor('HEAD', 'main', path):  # detached, or work main does not have yet
            shas |= added_shas(git('show', f'HEAD:{LOCK_REL}', cwd=path, check=False), 'HEAD', path)
    current = git('symbolic-ref', '-q', 'HEAD', check=False).strip()
    for ref in git('for-each-ref', '--no-merged=main', '--format=%(refname)', 'refs/heads').split():
        if ref not in (current, 'refs/heads/main'):
            shas |= added_shas(git('show', f'{ref}:{LOCK_REL}', check=False), ref, ROOT)
    return shas


def lock_history():
    """{sha256: {path, ...}} for every lock entry this branch's history of the lock file ever added: the old paths of a
    blob that no lock file names any more."""
    out = {}
    for m in LOCK_ENTRY.finditer(git('log', '-p', '--format=', '--', LOCK_REL)):
        out.setdefault(m.group(3), set()).add(json.loads(f'"{m.group(1)}"'))
    return out


def gib(sizes):
    return sum(sizes) / 2**30


def drop_from_r2(r2, dropped, kept):
    """Delete from R2 the blobs a push just took out of the lock file: pictures that left the Showcase feed, or closed
    Reviews. dropped: {path: lock entry} as the push removed them; kept: the sha256s the new lock file holds. A blob stays
    when the new lock file still names it, when another checkout or an unmerged branch names it, or when removable() says
    it must (a game file, or never a published picture)."""
    if not dropped:
        return
    blobs = {}
    for p, v in dropped.items():
        blobs.setdefault(v['sha256'], [v['size'], set()])[1].add(p)
    named, published = named_elsewhere(), published_paths()
    gone, stay = [], []
    for sha, (size, paths) in sorted(blobs.items()):
        if sha in kept:
            why = 'the lock file still names it'
        elif sha in named:
            why = 'another checkout or an unmerged branch names it'
        else:
            why = removable(paths, published)
        if why:
            stay.append(why)
        else:
            gone.append((sha, size))
    done, failed = run_parallel(lambda j: r2.delete(j[0]), gone, 'deleted') if gone else ([], [])
    print(f'R2: deleted {len(done)} blobs ({gib(j[1] for j in done):.2f} GB) that left the lock file; '
          f'pictures stay on this disk')
    for why, n in collections.Counter(stay).most_common():
        print(f'  kept {n}: {why}')
    if failed:
        raise SystemExit(f'{len(failed)} deletes failed; trim --list and trim --delete finish them')


def trim_plan(remote, lock, named, history, published):
    """The R2 blobs no lock file names and that may leave, as {sha: (size, paths)}, and the ones that stay, as
    {sha: (size, why)}. A blob may leave when no lock file, other checkout or unmerged branch names it, and removable()
    accepts its old paths (history: {sha: paths} from the lock file's history; published: published_paths())."""
    locked = {v['sha256'] for v in lock.values()}
    delete, keep = {}, {}
    for sha, size in sorted(remote.items()):
        if sha in locked:
            continue
        paths = sorted(history.get(sha, ()))
        why = 'another checkout or an unmerged branch names it' if sha in named else removable(paths, published)
        if why:
            keep[sha] = (size, why)
        else:
            delete[sha] = (size, paths)
    return delete, keep


def cmd_trim(a):
    """Blobs in R2 that no lock file names: --list writes the list of those that may leave, and --delete removes exactly
    the blobs a list file names, when a fresh listing matches it. Pictures stay on this disk."""
    r2 = R2(load_env())
    remote = r2.list_blobs()
    lock = load_lock()
    locked = {v['sha256'] for v in lock.values()}
    delete, keep = trim_plan(remote, lock, named_elsewhere(), lock_history(), published_paths())
    if a.delete:
        with open(a.delete, encoding='utf-8') as f:
            listed = {line.split('\t', 1)[0] for line in f if line.strip() and not line.startswith('#')}
        if listed != set(delete):
            raise SystemExit(f'{a.delete} does not match a fresh listing: {len(listed - set(delete))} listed blobs no longer '
                             f'qualify, {len(set(delete) - listed)} qualifying blobs are not listed. Run trim --list again.')
        done, failed = run_parallel(lambda j: r2.delete(j[0]), [(s, delete[s][0]) for s in sorted(delete)], 'deleted')
        after = r2.list_blobs()
        missing = sorted(locked - set(after))
        print(f'trim: deleted {len(done)} blobs ({gib(delete[j[0]][0] for j in done):.2f} GB). R2 now holds '
              f'{len(after)} blobs, {mb(sum(after.values()))}; lock entries missing from R2: {len(missing)}')
        if failed or missing:
            raise SystemExit(f'{len(failed)} deletes failed and {len(missing)} lock entries are missing from R2')
        return
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M')
    lines = [f'# R2 trim list, made {now} UTC by tools/assets/sync.py trim --list',
             f'# delete: {len(delete)} blobs, {gib(s for s, _ in delete.values()):.2f} GB. Each is in R2, no lock file, '
             'other checkout or unmerged branch names it, was a published picture, and no path is a game file.',
             f'# keep: {len(keep)} blobs, {gib(s for s, _ in keep.values()):.2f} GB, not listed here.',
             '# format: sha256, bytes, first old path (+ the count of any others)']
    for sha, (size, paths) in sorted(delete.items(), key=lambda kv: kv[1][1][0] if kv[1][1] else ''):
        more = f' (+{len(paths) - 1})' if len(paths) > 1 else ''
        lines.append(f"{sha}\t{size}\t{(paths[0] if paths else '') + more}")
    os.makedirs(os.path.dirname(os.path.abspath(a.list)), exist_ok=True)
    with open(a.list + '.tmp', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    os.replace(a.list + '.tmp', a.list)
    print(f'R2 holds {len(remote)} blobs, {mb(sum(remote.values()))}; the lock file names {len(locked & set(remote))} of them')
    print(f'delete: {len(delete)} blobs, {gib(s for s, _ in delete.values()):.2f} GB, listed in {a.list}')
    print('checked: none is in the lock file; none is named by another checkout or an unmerged branch; '
          'each was a published picture; none is a game file')
    for why, n in collections.Counter(w for _, w in keep.values()).most_common():
        print(f'keep: {n} blobs ({why})')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('status', help='drift between disk, lock file and R2')
    s.add_argument('--remote', action='store_true', help='also list R2 (needs credentials)')
    s.add_argument('--all', action='store_true', help='list every path, not the first 12')
    s = sub.add_parser('push', help='upload new and changed used files and rewrite the lock file')
    s.add_argument('--dry-run', action='store_true')
    s.add_argument('--prune', action='store_true', help='drop lock entries whose file is gone from this disk')
    s.add_argument('--only', nargs='+', metavar='PATH', help='push just these used files; no other lock entry changes')
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
    s = sub.add_parser('trim', help='list, or delete, the R2 blobs no lock file names (published pictures only)')
    s.add_argument('--list', metavar='PATH', default=TRIM_LIST,
                   help='write the blobs that may leave to this file (default: ~/.cache/amakawa/r2-trim-list.txt)')
    s.add_argument('--delete', metavar='PATH', help='delete exactly the blobs this list file names, if a fresh listing matches')
    a = ap.parse_args()
    {'status': cmd_status, 'push': cmd_push, 'pull': cmd_pull, 'check': cmd_check, 'forget': cmd_forget,
     'trim': cmd_trim}[a.cmd](a)


if __name__ == '__main__':
    main()
