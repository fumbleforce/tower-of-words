#!/usr/bin/env python3
"""Require crawler directives in every tracked HTML page, including staged additions."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys


class RobotsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.head_closed = False
        self.text_element = None
        self.template_depth = 0
        self.protected = False

    def handle_starttag(self, tag, attrs):
        if self.head_closed:
            return
        if tag == 'template':
            self.template_depth += 1
        if self.template_depth:
            return
        if tag == 'head':
            self.in_head = True
        elif tag not in {'html', 'base', 'basefont', 'bgsound', 'link', 'meta',
                         'title', 'style', 'script', 'noscript', 'noframes'}:
            self.in_head = False
            self.head_closed = True
        elif tag in {'title', 'style', 'script', 'noscript', 'noframes'}:
            self.text_element = tag
        elif tag == 'meta' and self.in_head:
            attrs = dict(attrs)
            if (attrs.get('name') or '').lower() == 'robots':
                directives = {v.strip().lower() for v in (attrs.get('content') or '').split(',')}
                self.protected |= {'noindex', 'nofollow'} <= directives

    def handle_endtag(self, tag):
        if tag == 'template':
            self.template_depth = max(0, self.template_depth - 1)
        elif tag == 'head' and not self.template_depth:
            self.in_head = False
            self.head_closed = True
        if tag == self.text_element:
            self.text_element = None

    def handle_data(self, data):
        if data.strip() and not self.text_element and not self.template_depth:
            self.in_head = False
            self.head_closed = True


def main():
    root = Path(__file__).resolve().parents[2]
    paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
    pages = [p for p in paths if p.lower().endswith(('.html', '.htm'))]
    failures = []
    for name in pages:
        parser = RobotsParser()
        try:
            parser.feed((root / name).read_text(encoding='utf-8'))
        except (OSError, UnicodeError) as error:
            failures.append(f'{name}: {error}')
            continue
        if not parser.protected:
            failures.append(f'{name}: missing robots noindex, nofollow in head')
    if not pages:
        failures.append('No tracked HTML pages found')
    for failure in failures:
        print(f'FAIL {failure}', file=sys.stderr)
    print(f'Robots: {len(pages)} tracked HTML pages, {len(failures)} failures')
    return bool(failures)


if __name__ == '__main__':
    sys.exit(main())
