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
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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

    def do_GET(self):
        if self.path.split('?')[0] == '/api/feedback':
            return self._json(200 if self._local() else 403, {'ok': self._local()})
        path = self.path.split('?')[0]
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
        return super().do_GET()

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
        path = self.path.split('?')[0]
        if path == '/api/feedback':
            return self._feedback()
        m = re.fullmatch(r'/api/(review|showcase)/([a-z0-9][a-z0-9-]{0,79})', path)
        if not m:
            return self._json(404, {'error': 'unknown endpoint'})
        kind, rid = m.groups()
        return self._save_answer(kind, rid)

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

    def end_headers(self):
        # feedback and review files change while the page is open
        if '/reviews/' in self.path or '/showcase/' in self.path:
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
