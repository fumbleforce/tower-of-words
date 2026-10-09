#!/usr/bin/env python3
"""Write smaller copies of the 2048 character skins next to the originals, for phones (#373).

game3d/assets/characters/<id>/base.webp -> base-1024.webp and base-512.webp (same for eric/, mio/base-clean.webp and
the other 2048 skins). game3d/js/perf/skin-tex.js picks one by tier. Run it after a skin changes, then
`python3 tools/assets/sync.py push`. Only files at least 2048 wide are shrunk; the copies are skipped when newer.
"""
import glob, os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
A = os.path.join(ROOT, 'game3d', 'assets')
SIZES = (1024, 512)

def sources():
    for f in sorted(glob.glob(A + '/characters/*/base*.webp') + glob.glob(A + '/eric/base.webp') + glob.glob(A + '/mio/base-clean.webp')):
        stem = os.path.basename(f)[:-5]
        if stem.endswith(('-1024', '-512', '-lo')):
            continue
        yield f

def main():
    for f in sources():
        im = Image.open(f)
        if im.width < 2048:
            continue
        for s in SIZES:
            out = f[:-5] + f'-{s}.webp'
            if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f):
                continue
            if os.path.exists(out):
                os.chmod(out, 0o644)
            im.convert('RGBA' if im.mode == 'RGBA' else 'RGB').resize((s, s), Image.LANCZOS).save(out, 'WEBP', quality=88, method=6)
            print(os.path.relpath(out, ROOT), os.path.getsize(out) // 1024, 'KB')

main()
