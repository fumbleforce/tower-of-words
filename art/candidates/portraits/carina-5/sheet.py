"""carina-5 contact sheet: Mio, Kuro and the liked round-4 tile first, then the 12 options, then the extra seeds of 1 and 4.
Finals are the root-pass images (roots.py) padded to 40 px headroom where needed (same helper as carina-4)."""
import sys, json, os, importlib.util
spec = importlib.util.spec_from_file_location('s4', '../carina-4/sheet.py'); s4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s4)
from PIL import Image
R = json.load(open('results.json'))
tiles = []
for p, n, sub in (('../../../approved/mio/mio-after.webp', 'anchor: Mio', 'style reference'), ('../../../approved/kuro/kuro-after.webp', 'anchor: Kuro', 'style reference'),
                  ('../carina-4/carina4-08-bob-behind-ear-s3-final.webp', 'liked: r4 8 s3', 'round 4, the last tile')):
    tiles.append(s4.tile(p, n, sub, True))
finals = []
for n in [str(i) for i in range(1, 13)]:
    r = R[n]; dst = r['src'] + '-final.webp'; h, add = s4.pad('rooted/' + r['src'] + '.webp', dst); r['final'] = dst
    tiles.append(s4.tile(dst, f"{n}. {r['name']}", f"STYLE {r['style']} | {r['mark']}"[:46], r['mark'].startswith('PASS') and r['style'] == 'PASS'))
for key, lab, mark in R['extras']:
    dst = key + '-final.webp'; s4.pad('rooted/' + key + '-r.webp', dst)
    tiles.append(s4.tile(dst, lab, f"STYLE PASS | {mark}"[:46], mark.startswith('PASS')))
W, H = s4.W, s4.H + 86; cols = 6; rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (cols * W, rows * H), (22, 26, 30))
for i, t in enumerate(tiles): s.paste(t, ((i % cols) * W, (i // cols) * H))
s.save('sheet.png'); s.save('sheet.webp', quality=88); json.dump(R, open('results.json', 'w'), indent=1); print(s.size)
