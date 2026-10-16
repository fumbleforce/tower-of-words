"""package: the game's files, in build/game/<id>/ laid out as game3d/assets/characters/<id>/ (as the rounds' install.sh
made them): walk.glb, run.glb and sit.glb with the embedded texture taken out (game3d/tools/slim_glb.py), base.webp
(the texture as Meshy painted it, from Meshy's rigged file, or the recolour step's), and its 1024 and 512 copies for
phones (tools/characters/skin_sizes.py). No settings."""
import os, sys
from PIL import Image
from common import ROOT, glb_texture

sys.path.insert(0, os.path.join(ROOT, 'game3d/tools'))
from slim_glb import slim  # noqa: E402
from skin_sizes import shrink  # noqa: E402


def run(ctx, o):
    d = os.path.join(ctx.dirs['game'], ctx.id)
    os.makedirs(d, exist_ok=True)
    for clip, src in ctx.files['clips'].items():
        slim(src, os.path.join(d, f'{clip}.glb'))
    base = os.path.join(d, 'base.webp')
    im = Image.open(ctx.files['skin']).convert('RGB') if ctx.files.get('skin') else glb_texture(ctx.files['skin_from'])
    im.save(base, quality=90, method=6)
    print(base, os.path.getsize(base))
    shrink(base)
    ctx.files['game'] = d
