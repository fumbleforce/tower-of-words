"""Subset the opening's fonts (Zen Kaku Gothic New, Barlow Condensed; OFL, from github.com/google/fonts, kept in ~/ai/opening/fonts)
to the glyphs used in proto2/opening plus all kana. Run after changing on-screen text: ~/ai/opening/venv/bin/python tools/opening/fonts.py"""
import os, subprocess, tempfile
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = os.path.join(ROOT, 'proto2', 'opening')
SRC = os.path.expanduser('~/ai/opening/fonts')
KANA = ''.join(chr(c) for c in range(0x3041, 0x3097)) + ''.join(chr(c) for c in range(0x30A1, 0x30FB)) + 'ー、。「」！？・…'
text = open(os.path.join(D, 'op.js')).read() + open(os.path.join(D, 'index.html')).read()
chars = ''.join(sorted(set(c for c in text if ord(c) > 127) | set(KANA)))
tf = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False)
tf.write(chars); tf.close()
os.makedirs(os.path.join(D, 'fonts'), exist_ok=True)
for src, dst in [('ZenKakuGothicNew-Black', 'zen-black'), ('ZenKakuGothicNew-Bold', 'zen-bold'),
                 ('BarlowCondensed-SemiBold', 'barlow-semi'), ('BarlowCondensed-ExtraBold', 'barlow-x')]:
    subprocess.run([os.path.expanduser('~/ai/opening/venv/bin/pyftsubset'), os.path.join(SRC, src + '.ttf'), f'--text-file={tf.name}',
                    '--unicodes=U+0020-007E,U+00A0-00FF,U+2013,U+2014', '--flavor=woff2', f'--output-file={os.path.join(D, "fonts", dst + ".woff2")}'], check=True)
    print(dst, os.path.getsize(os.path.join(D, 'fonts', dst + '.woff2')))
