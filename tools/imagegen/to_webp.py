"""The webp copy of a picture: the one encoder for every saved copy (agentlog.add's, and compose.mjs --wait's round copy).

RGB at quality 92. The picture it reads is never changed, so a master PNG stays as the render left it.
Command line, as compose.mjs runs it: python3 tools/imagegen/to_webp.py < picture.png > picture.webp
"""
import io
import sys

from PIL import Image

QUALITY = 92


def to_webp(data):
    """The webp bytes of a picture given as the bytes of a file Pillow can read."""
    with Image.open(io.BytesIO(data)) as im:
        out = io.BytesIO()
        im.convert('RGB').save(out, 'WEBP', quality=QUALITY)
        return out.getvalue()


def save_webp(src, dst):
    """Write the webp copy of the picture file src to dst."""
    with open(src, 'rb') as f:
        data = to_webp(f.read())
    with open(dst, 'wb') as f:
        f.write(data)


if __name__ == '__main__':
    sys.stdout.buffer.write(to_webp(sys.stdin.buffer.read()))
