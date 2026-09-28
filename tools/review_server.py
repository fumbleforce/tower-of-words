#!/usr/bin/env python3
"""The repo's local server: static files exactly like `python3 -m http.server`, plus one write endpoint.

    python3 tools/review_server.py [port]       (./start runs it; default port 8771, bound to 127.0.0.1)

POST /api/review/<id> with a JSON body saves Jørgen's feedback for one review item to reviews/<id>/feedback.json.
That's the only thing it can write: <id> must be an existing folder in reviews/ holding a review.json, and nothing
else on disk is touched. Each save keeps the earlier sends in `history`, so nothing he wrote is lost.
"""
import json
import os
import re
import sys
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REVIEWS = os.path.join(ROOT, 'reviews')
MAX_BODY = 256 * 1024


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        m = re.fullmatch(r'/api/review/([a-z0-9][a-z0-9-]{0,79})', self.path.split('?')[0])
        if not m:
            return self._json(404, {'error': 'unknown endpoint'})
        rid = m.group(1)
        folder = os.path.join(REVIEWS, rid)
        if not os.path.isfile(os.path.join(folder, 'review.json')):
            return self._json(404, {'error': f'no review item {rid}'})
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0 or n > MAX_BODY:
            return self._json(400, {'error': 'empty or too large'})
        try:
            data = json.loads(self.rfile.read(n).decode('utf-8'))
            assert isinstance(data, dict)
        except Exception:
            return self._json(400, {'error': 'body must be a JSON object'})
        path = os.path.join(folder, 'feedback.json')
        old = None
        if os.path.exists(path):
            try:
                old = json.load(open(path, encoding='utf-8'))
            except Exception:
                old = None
        entry = {
            'sent': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
            'picked': [str(x) for x in data.get('picked', [])][:50],
            'options': {str(k): {'star': bool(v.get('star')), 'reject': bool(v.get('reject')), 'comment': str(v.get('comment', ''))[:5000]}
                        for k, v in (data.get('options') or {}).items() if isinstance(v, dict)},
            'comment': str(data.get('comment', ''))[:10000],
        }
        history = (old or {}).get('history', [])
        if old and old.get('sent'):
            history.append({k: old[k] for k in ('sent', 'picked', 'options', 'comment', 'read') if k in old})
        out = dict(entry, read=False, history=history)
        tmp = path + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        os.replace(tmp, path)
        return self._json(200, {'ok': True, 'sent': entry['sent']})

    def end_headers(self):
        # feedback and review files change while the page is open
        if '/reviews/' in self.path:
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8771))
    httpd = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=ROOT))
    print(f'Serving {ROOT} on http://127.0.0.1:{port}/ (reviews save to reviews/<id>/feedback.json)', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
