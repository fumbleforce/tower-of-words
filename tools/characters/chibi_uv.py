"""Fresh UVs for a decimated chibi (chibi_game.py): xatlas charts over the triangles from chibi_bake_tex.py.
Usage: uv run --python 3.12 --with xatlas --with numpy tools/characters/chibi_uv.py <mesh.json> <uv.json> <px>
Writes {"corners": [[[u, v] x3] per triangle], "charts": n}.
"""
import json, sys
import numpy as np
import xatlas

src, dst, px = sys.argv[1], sys.argv[2], int(sys.argv[3])
m = json.load(open(src))
pos = np.array(m['positions'], dtype=np.float32)
faces = np.array(m['faces'], dtype=np.uint32)
atlas = xatlas.Atlas()
atlas.add_mesh(pos, faces)
pack = xatlas.PackOptions()
pack.resolution = px
pack.padding = 4
pack.bilinear = True
chart = xatlas.ChartOptions()
atlas.generate(chart_options=chart, pack_options=pack)
_, idx, uvs = atlas[0]
corners = [[[float(uvs[i][0]), float(uvs[i][1])] for i in tri] for tri in idx]
json.dump({'corners': corners, 'charts': atlas.chart_count}, open(dst, 'w'))
print('charts', atlas.chart_count, 'triangles', len(corners))
