#!/usr/bin/env python3
"""The repo's local server: static files exactly like `python3 -m http.server`, plus one write endpoint.

    python3 tools/review_server.py [port]       (./start runs it; default port 8771, bound to 127.0.0.1)

POST /api/review/<id> with a JSON body saves Jørgen's feedback for one review item to reviews/<id>/feedback.json
(<id> must be a folder in reviews/ holding a review.json). POST /api/showcase/<id> does the same for a Showcase
entry: showcase/<id>/feedback.json, next to its entry.json (format: showcase/README.md). Each save keeps the earlier
sends in `history`, so nothing he wrote is lost. When the review is decided and has a follow-up issue, the issue gets
a comment (and is reopened if closed) in the background, through tools/work.py.

GET /api/work answers the work tracker's GitHub issues and the stale list (tools/work.py, 60 s cache) for the
bible's Work section.

POST /api/feedback saves feedback sent from the game's feedback window (game3d/js/feedback.js): a new folder
notes/feedback-game/<time>/ with text.md, shot.png (git-ignored) and context.json, plus an entry in the day's
notes/feedback-log/ file. GET /api/feedback answers {"ok": true} so the game knows it can show the button.
Both refuse anything not from this machine.

GET /private turns private mode on for this browser (a cookie) and opens the bible; GET /public turns it off. Private
mode is the same site with the private additions (notes/tools/README.md): GET /api/nav-private.js answers the private
registry for the shared tool menu (tools/nav/nav.js) in private mode, else an empty script, and the scene editor's API
answers public scenes only outside it.

GET .../game3d/build.json (the main checkout's or a worktree's) first runs that game3d's tools/stamp.py --if-stale:
build.json is generated and never committed, so it is written when missing or when HEAD or the module list changed.
"""
import base64
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.parse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bible.showcase_dates import showcase_dates
import work  # noqa: E402  tools/work.py, the work tracker (GitHub issues)
import review_commit  # noqa: E402  commits each saved answer so the public bible matches


def review_changed(rid):
    """New feedback on a decided review with an issue: tell the issue. Runs in a thread; a failure only logs."""
    try:
        work.review_feedback(rid)
    except BaseException as e:  # work.guard exits with SystemExit on refused text
        print(f'work: could not update the issue for review {rid}: {e}', file=sys.stderr, flush=True)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REVIEWS = os.path.join(ROOT, 'reviews')
SHOWCASE = os.path.join(ROOT, 'showcase')
# Private Review items (git-ignored, listed only by the private bible); their answers never go to GitHub
PRIVATE_REVIEWS = os.path.join(ROOT, 'island', 'private', 'rewards', 'reviews')
# The one private registry: the bar entries and tool capabilities private mode adds (tools/nav/nav.js)
PRIVATE_NAV = os.path.join(ROOT, 'island', 'private', 'bible', 'nav.js')
MAX_BODY = 256 * 1024
FEEDBACK = os.path.join(ROOT, 'notes', 'feedback-game')
FEEDBACK_LOG = os.path.join(ROOT, 'notes', 'feedback-log')
MAX_FEEDBACK = 40 * 1024 * 1024  # a full-size PNG of a 4K screen, base64
STAMP_LOCK = threading.Lock()
WORK_LOCK = threading.Lock()  # one gh call at a time; the pages that wait then read work.py's 60 s cache


def stamp_build(url_path):
    """Before serving <dir>/game3d/build.json, stamp it if it's missing or stale. A failure only logs."""
    stamp = os.path.realpath(os.path.join(ROOT, url_path.lstrip('/'), '..', 'tools', 'stamp.py'))
    if not stamp.startswith(os.path.realpath(ROOT) + os.sep) or not os.path.isfile(stamp):
        return
    with STAMP_LOCK:
        try:
            subprocess.run([sys.executable, stamp, '--if-stale'], capture_output=True, timeout=20, check=True)
        except Exception as e:
            print(f'build stamp failed for {url_path}: {e}', file=sys.stderr, flush=True)


def save_game_feedback(data):
    """Write notes/feedback-game/<time>/ and log the text in notes/feedback-log/<day>.md. Returns the folder id."""
    text = str(data.get('text', ''))[:20000].strip()
    ctx = data.get('context') if isinstance(data.get('context'), dict) else {}
    shot = data.get('shot')
    png = None
    if isinstance(shot, str) and shot.startswith('data:image/png;base64,'):
        png = base64.b64decode(shot.split(',', 1)[1], validate=True)
        if not png.startswith(b'\x89PNG'):
            raise ValueError('shot is not a PNG')
    now = time.localtime()
    base = time.strftime('%Y-%m-%d_%H%M%S', now)
    os.makedirs(FEEDBACK, exist_ok=True)
    fid, n = base, 1
    while True:
        try:
            os.mkdir(os.path.join(FEEDBACK, fid))
            break
        except FileExistsError:
            n += 1
            fid = f'{base}-{n}'
    folder = os.path.join(FEEDBACK, fid)
    stamp = time.strftime('%H:%M:%S %z', now)
    ctx = dict(ctx, saved=time.strftime('%Y-%m-%dT%H:%M:%S%z', now), folder=f'notes/feedback-game/{fid}', shot=bool(png))
    with open(os.path.join(folder, 'context.json'), 'w', encoding='utf-8') as f:
        json.dump(ctx, f, ensure_ascii=False, indent=1)
    if png:
        with open(os.path.join(folder, 'shot.png'), 'wb') as f:
            f.write(png)
    where = ' · '.join(str(ctx[k]) for k in ('build', 'place', 'period', 'node') if ctx.get(k))
    with open(os.path.join(folder, 'text.md'), 'w', encoding='utf-8') as f:
        f.write(f"# In-game feedback {time.strftime('%Y-%m-%d', now)} {stamp}\n\n{where}\n\n{text}\n")
    # the day's feedback log, in the same shape as his chat messages (.claude/hooks/feedback_log.py)
    os.makedirs(FEEDBACK_LOG, exist_ok=True)
    path = os.path.join(FEEDBACK_LOG, time.strftime('%Y-%m-%d', now) + '.md')
    fence = '`' * max(3, max((len(m) for m in re.findall(r'`+', text)), default=0) + 1)
    entry = f"## {stamp} · in the game, notes/feedback-game/{fid}/\n\n{fence}\n{text}\n{fence}\n\n"
    if not os.path.exists(path):
        entry = (f"# Feedback log {time.strftime('%Y-%m-%d', now)}\n\n"
                 "Jørgen's messages to Claude Code, word for word (.claude/hooks/feedback_log.py).\n\n") + entry
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        os.write(fd, entry.encode('utf-8'))
    finally:
        os.close(fd)
    return fid


def review_answer(data):
    """A Review answer: picks, star/reject/comment per option, an overall comment."""
    return {
        'picked': [str(x) for x in data.get('picked', [])][:50],
        'options': {str(k): {'star': bool(v.get('star')), 'reject': bool(v.get('reject')), 'comment': str(v.get('comment', ''))[:5000]}
                    for k, v in (data.get('options') or {}).items() if isinstance(v, dict)},
        'comment': str(data.get('comment', ''))[:10000],
    }


def showcase_answer(data):
    """A Showcase answer: a flag and a comment on the whole entry and on each image. No picks."""
    items = data.get('items') if isinstance(data.get('items'), dict) else {}
    return {
        'flag': bool(data.get('flag')),
        'comment': str(data.get('comment', ''))[:10000],
        'items': {str(k)[:120]: {'flag': bool(v.get('flag')), 'comment': str(v.get('comment', ''))[:5000]}
                  for k, v in list(items.items())[:200] if isinstance(v, dict)},
    }


# kind -> (folder, the file that must exist in <folder>/<id>/, normaliser)
ANSWERS = {'review': (REVIEWS, 'review.json', review_answer), 'showcase': (SHOWCASE, 'entry.json', showcase_answer)}


MEDIA_PATH = re.compile(r'[^\s"]+\.(?:png|webp|jpe?g|gif|mp4|webm|mp3|wav)', re.I)


def missing_media(folders):
    """Repo paths the items name (pictures, clips) that are not on disk here, so the bible shows a gap instead of
    asking for each one and logging a 404. Checked once per request, not once per picture."""
    found = set()

    def walk(v):
        if isinstance(v, str):
            if MEDIA_PATH.fullmatch(v) and not v.startswith(('http:', 'https:', '/')):
                found.add(v)
        elif isinstance(v, list):
            for x in v:
                walk(x)
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)
    for base, marker in folders:
        try:
            names = os.listdir(base)
        except OSError:
            continue
        for d in names:
            try:
                with open(os.path.join(base, d, marker), encoding='utf-8') as fh:
                    walk(json.load(fh))
            except (OSError, ValueError):
                continue
    return sorted(p for p in found if not os.path.exists(os.path.join(ROOT, p)))


def answer_folder(kind, rid, allow_private=True):
    """The folder an answer goes to, and whether it is a private Review item; None when there is no such item."""
    base, marker, _ = ANSWERS[kind]
    folder = os.path.join(base, rid)
    if (allow_private and kind == 'review' and not os.path.isfile(os.path.join(folder, marker))
            and os.path.isfile(os.path.join(PRIVATE_REVIEWS, rid, marker))):
        return os.path.join(PRIVATE_REVIEWS, rid), True
    return (folder, False) if os.path.isfile(os.path.join(folder, marker)) else (None, False)


def save_answer(kind, folder, data, sent=None, wait=True):
    """Normalise one answer for its kind, keep the earlier send in `history` and write <folder>/feedback.json
    atomically. The local Send (POST) and tools/review.py pull (answers sent from the public site) both save here.
    Then commits it (tools/review_commit.py; private items are skipped); wait=False commits in a thread, since the
    commit checks take about 30 s. Returns the `sent` stamp."""
    entry = dict(sent=sent or time.strftime('%Y-%m-%dT%H:%M:%S%z'), **ANSWERS[kind][2](data))
    path = os.path.join(folder, 'feedback.json')
    old = None
    if os.path.exists(path):
        try:
            old = json.load(open(path, encoding='utf-8'))
        except Exception:
            old = None
    history = (old or {}).get('history', [])
    if old and old.get('sent'):
        history.append({k: v for k, v in old.items() if k != 'history'})
    out = dict(entry, read=False, history=history)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)
    args = ([path], f'Review: {kind} {os.path.basename(folder)}, answer saved')
    if wait:
        review_commit.commit(*args)
    else:
        threading.Thread(target=review_commit.commit, args=args).start()
    return entry['sent']


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _local(self):
        return self.client_address[0] in ('127.0.0.1', '::1', '::ffff:127.0.0.1')

    def _private_mode(self):
        """Private mode is on: a local request carrying the cookie /private sets, with the private files present."""
        cookie = self.headers.get('Cookie', '')
        return (self._local() and re.search(r'(?:^|;\s*)amakawa_mode=private(?:;|$)', cookie) is not None
                and os.path.isfile(PRIVATE_NAV) and os.environ.get('SUBPLOTS_PUBLIC_ONLY') != '1')

    def _mode_switch(self, on):
        self.send_response(302)
        value = 'private; Max-Age=31536000' if on else '; Max-Age=0'
        self.send_header('Set-Cookie', f'amakawa_mode={value}; Path=/; SameSite=Lax')
        # ?to=/a/local/path goes back to the page that asked (a private page opened outside private mode)
        to = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('to', [''])[0]
        local_path = re.fullmatch(r'/(?!/)[^\s\\]*', to)
        # The image generator shares this cookie on another port and returns to its current page.
        dashboard = False
        try:
            dest = urllib.parse.urlsplit(to)
            dashboard = (dest.scheme == 'http' and dest.hostname in ('127.0.0.1', 'localhost', '::1')
                         and dest.port == 8772 and not dest.username and not dest.password
                         and not re.search(r'[\s\\]', to))
        except ValueError:
            pass
        self.send_header('Location', to if local_path or dashboard else '/bible/')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def _public_scenes_only(self):
        """Outside private mode the scene editor gets public scenes only: its full list becomes the public list, and a
        private scene or the private image history is refused. Answers True when it has replied."""
        url = self.path.split('?', 1)
        if not url[0].startswith('/api/subplots/') or self._private_mode():
            return False
        query = url[1] if len(url) > 1 else ''
        if url[0] == '/api/subplots/catalog' and re.search(r'(?:^|&)scope=all(?:&|$)', query):
            self.path = '/api/subplots/catalog?' + re.sub(r'(?:^|&)scope=all(?=&|$)', '', query).lstrip('&')
            return False
        args = dict(urllib.parse.parse_qsl(query))
        scene_id = args.get('id', '')
        # Studio drafts carry their audience in their id; the adapter also verifies the saved audience.
        public_draft = re.fullmatch(r'studio:public:[a-f0-9]{32}', scene_id)
        if args.get('scope') == 'local' or (scene_id and not scene_id.startswith('public:') and not public_draft):
            self._json(403, {'error': 'Private scenes open in private mode: http://127.0.0.1:8771/private'})
            return True
        return False

    def do_GET(self):
        from subplots.api import handle as subplot_request
        if self._public_scenes_only() or subplot_request(self):
            return
        if self.path.split('?')[0] == '/api/feedback':
            return self._json(200 if self._local() else 403, {'ok': self._local()})
        path = self.path.split('?')[0]
        if path == '/bible/showcase-dates.json':
            return self._json(200, showcase_dates(local=True))
        if path == '/api/work':
            try:
                with WORK_LOCK:
                    all_items = work.items()
                    stale = work.stale(all_items=all_items)
                return self._json(200, {'items': all_items, 'stale': stale, 'repo': work.REPO_URL})
            except Exception as e:
                return self._json(200, {'items': None, 'stale': [], 'repo': work.REPO_URL, 'error': str(e)[:300]})
        if path == '/game3d/build.json' or path.endswith('/game3d/build.json'):
            stamp_build(path)
        if path in ('/private', '/private/', '/public', '/public/'):
            return self._mode_switch(path.startswith('/private') and self._local())
        if path == '/api/nav-private.js':
            return self._nav_private()
        if path == '/api/answers':
            return self._answers()
        if path == '/api/plugins':
            # the local plugin names, so the game asks only for files that exist (no 404 per place)
            folder = os.path.join(ROOT, 'island', 'private', 'plugins')
            if not os.path.isdir(folder):
                return self._json(404, {'error': 'no plugins'})
            return self._json(200, sorted(f[:-3] for f in os.listdir(folder) if f.endswith('.js')))
        return super().do_GET()

    def _answers(self):
        """GET /api/answers: which items have an answer file, per folder, so the bible fetches only those (no 404 per
        item). The private Review folder is listed only in private mode."""
        def with_answer(base):
            try:
                return sorted(d for d in os.listdir(base) if os.path.isfile(os.path.join(base, d, 'feedback.json')))
            except OSError:
                return []
        out = {'reviews': with_answer(REVIEWS), 'showcase': with_answer(SHOWCASE)}
        folders = [(REVIEWS, 'review.json'), (SHOWCASE, 'entry.json')]
        if self._private_mode():
            out[os.path.relpath(PRIVATE_REVIEWS, ROOT)] = with_answer(PRIVATE_REVIEWS)
            folders.append((PRIVATE_REVIEWS, 'review.json'))
        out['missing'] = missing_media(folders)
        return self._json(200, out)

    def _nav_private(self):
        """GET /api/nav-private.js: the private registry for the shared tool menu (tools/nav/nav.js) in private mode, else
        a script that does nothing; 200 either way, so a page never logs a 404."""
        body = b'/* private mode is off: http://127.0.0.1:8771/private */\n'
        if self._private_mode():
            with open(PRIVATE_NAV, 'rb') as fh:
                body = fh.read()
        self.send_response(200)
        self.send_header('Content-Type', 'text/javascript; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _feedback(self):
        if not self._local():
            return self._json(403, {'error': 'local only'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_FEEDBACK:
            return self._json(400, {'error': 'empty or too large'})
        try:
            data = json.loads(self.rfile.read(n).decode('utf-8'))
            assert isinstance(data, dict)
        except Exception:
            return self._json(400, {'error': 'body must be a JSON object'})
        if not str(data.get('text', '')).strip() and not data.get('shot'):
            return self._json(400, {'error': 'nothing to save'})
        try:
            fid = save_game_feedback(data)
        except Exception as e:
            return self._json(400, {'error': f'could not save: {e}'})
        return self._json(200, {'ok': True, 'folder': f'notes/feedback-game/{fid}'})

    def do_POST(self):
        from subplots.api import handle as subplot_request
        if subplot_request(self):
            return
        path = self.path.split('?')[0]
        if path == '/api/feedback':
            return self._feedback()
        if path == '/api/diag':
            return self._diag()
        m = re.fullmatch(r'/api/(review|showcase)/([a-z0-9][a-z0-9-]{0,79})', path)
        if not m:
            return self._json(404, {'error': 'unknown endpoint'})
        kind, rid = m.groups()
        return self._save_answer(kind, rid)

    def _diag(self):
        """POST /api/diag: the game's self-reports (plugin loading, private-mode rows) appended as one line each to
        /tmp/claude-1000/game-diag.log, so a bug on his machine can be read without asking him to open a console."""
        try:
            n = min(int(self.headers.get('Content-Length') or 0), 8000)
            body = self.rfile.read(n).decode('utf-8', 'replace').replace('\n', ' ')
            with open('/tmp/claude-1000/game-diag.log', 'a', encoding='utf-8') as f:
                f.write(time.strftime('%H:%M:%S ') + body + '\n')
        except Exception:
            pass
        return self._json(200, {'ok': True})

    def _save_answer(self, kind, rid):
        """One POST /api/<kind>/<id>: read the JSON body, normalise it for its kind, keep the earlier send in
        `history` and write <folder>/<id>/feedback.json atomically."""
        if not self._local():
            return self._json(403, {'error': 'local only'})
        folder, private = answer_folder(kind, rid)
        if not folder:
            return self._json(404, {'error': f'no {kind} item {rid}'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            return self._json(400, {'error': 'empty or too large'})
        try:
            data = json.loads(self.rfile.read(n).decode('utf-8'))
            assert isinstance(data, dict)
        except Exception:
            return self._json(400, {'error': 'body must be a JSON object'})
        sent = save_answer(kind, folder, data, wait=False)
        if kind == 'review' and not private:
            threading.Thread(target=review_changed, args=(rid,), daemon=True).start()
        return self._json(200, {'ok': True, 'sent': sent})

    def send_head(self):
        # Byte ranges, so audio and video can be seeked (http.server answers every Range request with the whole file,
        # and the browser then can't skip ahead in a song; Jørgen, 2026-10-09).
        self._range = None
        m = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range', '').strip())
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path) or (not m.group(1) and not m.group(2)):
            return super().send_head()
        size = os.path.getsize(path)
        if m.group(1):
            start, end = int(m.group(1)), min(int(m.group(2) or size - 1), size - 1)
        else:
            start, end = max(size - int(m.group(2)), 0), size - 1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        f = open(path, 'rb')
        f.seek(start)
        self._range = end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(self._range))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, '_range', None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(65536, left))
            if not chunk:
                break
            outputfile.write(chunk)
            left -= len(chunk)

    def end_headers(self):
        # Everything here changes while the page is open (reviews, game modules, local plugins), and without this
        # header the browser caches by heuristic and can keep running an old module after a reload.
        if not any(h.lower().startswith(b'cache-control:') for h in getattr(self, '_headers_buffer', [])):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


class Server(ThreadingHTTPServer):
    # socketserver's default listen backlog is 5: a page that fetches every review.json at once (bible/live.js), or
    # several headless browsers at the same time, overflowed it and dropped connections, which the client only
    # retries after 1, 3, 7 s. The bible check timed out on that (#97).
    request_queue_size = 256


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8771))
    httpd = Server(('127.0.0.1', port), partial(Handler, directory=ROOT))
    print(f'Serving {ROOT} on http://127.0.0.1:{port}/ (reviews and showcase entries save to <folder>/<id>/feedback.json)', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
