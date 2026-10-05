"""carina-7 sheet: round-6 tile 3 (the base) first, Mio and Kuro, then the 9 variants, then a second seed of 4 and 5."""
import json, importlib.util
spec = importlib.util.spec_from_file_location('s4', '../carina-4/sheet.py'); s4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(s4)
from PIL import Image
M = json.load(open('marks.json'))
tiles = [s4.tile('../carina-6/carina6-03-final.webp', 'BASE: r6 tile 3', 'hair 2, seed 10496 (stare)', False),
         s4.tile('../../../approved/mio/mio-after.webp', 'anchor: Mio', 'style reference', True), s4.tile('../../../approved/kuro/kuro-after.webp', 'anchor: Kuro', 'style reference', True)]
for key, title, sub, ok in M:
    dst = key + '-final.webp'; s4.pad(key + '.webp', dst); tiles.append(s4.tile(dst, title, sub, ok))
W, H = s4.W, s4.H + 86; cols = 6; rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (cols * W, rows * H), (22, 26, 30))
for i, t in enumerate(tiles): s.paste(t, ((i % cols) * W, (i // cols) * H))
s.save('sheet.png'); s.save('sheet.webp', quality=88); print(s.size)
