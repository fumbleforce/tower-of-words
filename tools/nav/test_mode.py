"""Mode redirects stay on the local tools, including the separate image dashboard."""
import sys
import unittest
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from review_server import Handler


class ModeRedirect(unittest.TestCase):
    def response(self, target, on=True):
        handler = object.__new__(Handler)
        handler.path = '/private?to=' + quote(target, safe='')
        headers = {}
        handler.send_response = lambda code: self.assertEqual(code, 302)
        handler.send_header = headers.__setitem__
        handler.end_headers = lambda: None
        handler._mode_switch(on)
        return headers

    def test_page_scene_and_query_survive(self):
        target = '/tools/subplots/web/?view=images#public:story:fixture'
        self.assertEqual(self.response(target)['Location'], target)

    def test_dashboard_returns_to_its_port(self):
        for host in ['127.0.0.1', 'localhost', '[::1]']:
            target = f'http://{host}:8772/?tab=history#fixture'
            self.assertEqual(self.response(target)['Location'], target)

    def test_external_and_malformed_destinations_are_refused(self):
        for target in ['//example.com', 'https://example.com/', 'http://localhost:8000/',
                       'http://user@localhost:8772/', 'http://localhost:8772\\@example.com',
                       '/\\example.com', '/\r\nLocation: other', 'http://[broken']:
            with self.subTest(target=target):
                self.assertEqual(self.response(target)['Location'], '/bible/')

    def test_both_modes_set_the_cookie(self):
        self.assertIn('amakawa_mode=private', self.response('/')['Set-Cookie'])
        self.assertIn('Max-Age=0', self.response('/', False)['Set-Cookie'])
        self.assertEqual(self.response('/')['Cache-Control'], 'no-store')


if __name__ == '__main__':
    unittest.main()
