"""Put an edited face (gen.py) onto a chibi's texture, on the same mesh.

  python3 face.py <attempt>
1. The mask: MASKS (eyes with their brows, and the mouth; hair and Kuro's glasses frame stay out), feathered; the
   edit's colour is shifted to match the picture's skin.
2. face_bl.py bake: the edit projected back onto the model from the same straight-on camera, baked into Meshy's
   texture atlas with its weight (mask, first surface the camera sees, facing the camera).
3. new texture = old * (1 - weight) + projected * weight, so every texel outside the face is the original's.
4. A copy of the rigged file with that texture (PNG) and nothing else changed:
   art/parts/chibi-face-1/meshy/<attempt>-rigged.glb, which chibi_game.py bakes for the game.
Writes the composited head picture and mask next to the edit (edits/<attempt>-on.png, -mask.png).
"""
import io, json, os, struct, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
PARTS = os.path.join(MAIN, 'art/parts')
OUT = os.path.join(PARTS, 'chibi-face-1')
SRC = {'rei': 'chibi-proportions-1/meshy/rei-2-rigged.glb', 'kuro': 'chibi-cast-meshy/meshy/kuro-1-rigged.glb'}
# Where the face may change, in the 1024 px head picture (face_bl.py front; the camera in work/<who>-cam.json):
# ellipses (left, top, right, bottom) around each eye with its brow, and the mouth. Kuro's glasses frame stays out:
# her eyes change only inside the lenses. Rei's hair stays: grey pixels outside her eyes and brows (HAIR_OK).
MASKS = {
    'rei': [('ellipse', (238, 318, 432, 478)), ('ellipse', (548, 322, 722, 474)), ('ellipse', (400, 495, 585, 595))],
    'kuro': [('rect', (312, 596, 474, 680)), ('rect', (566, 596, 728, 680)), ('rect', (305, 500, 465, 552)),
             ('rect', (560, 500, 720, 552)), ('ellipse', (430, 720, 590, 805))],
}
HAIR_OK = {'rei': [(255, 325, 425, 470), (562, 330, 715, 470)]}


def glb_read(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    m = struct.unpack('<I', b[20 + n:24 + n])[0]
    return j, b[28 + n:28 + n + m]


def glb_write(path, j, views):
    """views: the bytes of every bufferView, in order; repacked into one buffer"""
    blob = bytearray()
    for bv, data in zip(j['bufferViews'], views):
        while len(blob) % 4:
            blob.append(0)
        bv['byteOffset'] = len(blob)
        bv['byteLength'] = len(data)
        blob += data
    while len(blob) % 4:
        blob.append(0)
    j['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(blob), 0x004E4942) + bytes(blob))


def main(name):
    who = name.split('-')[0]
    work = os.path.join(OUT, 'work')
    head = np.asarray(Image.open(os.path.join(work, who + '-front-white.png')).convert('RGB')).astype(np.float32)
    edit_im = Image.open(os.path.join(OUT, 'edits', name + '.png')).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    edit = np.asarray(edit_im).astype(np.float32)
    # 1. the mask, and the edit's colour shifted to the picture's over the skin (FLUX adds its own soft shading)
    m = Image.new('L', (1024, 1024), 0)
    dr = ImageDraw.Draw(m)
    for kind, b in MASKS[who]:
        (dr.ellipse if kind == 'ellipse' else dr.rectangle)(b, fill=255)
    m = np.asarray(m.filter(ImageFilter.GaussianBlur(5))).astype(np.float32) / 255
    if who in HAIR_OK:
        sat = head.max(axis=2) - head.min(axis=2)
        hair = (sat < 18) & (head.mean(axis=2) > 140) & (head.mean(axis=2) < 225)
        for x0, y0, x1, y1 in HAIR_OK[who]:
            hair[y0:y1, x0:x1] = False
        hair = Image.fromarray(hair.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
        m = m * (1 - np.asarray(hair).astype(np.float32) / 255)
    skin = (head[..., 0] > 150) & (head[..., 0] - head[..., 2] > 25) & (m > 0.5)
    edit = np.clip(edit + (head[skin].mean(axis=0) - edit[skin].mean(axis=0)), 0, 255)
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(OUT, 'edits', name + '-mask.png'))
    on = head * (1 - m[..., None]) + edit * m[..., None]
    Image.fromarray(on.round().astype(np.uint8)).save(os.path.join(OUT, 'edits', name + '-on.png'))
    # 2. bake
    color, weight = os.path.join(work, name + '-color.png'), os.path.join(work, name + '-weight.png')
    src = os.path.join(PARTS, SRC[who])
    r = subprocess.run(['blender', '-b', '--python', os.path.join(HERE, 'face_bl.py'), '--', 'bake', src,
                        os.path.join(OUT, 'edits', name + '-on.png'), os.path.join(OUT, 'edits', name + '-mask.png'),
                        os.path.join(work, who + '-cam.json'), color, weight], capture_output=True, text=True)
    if r.returncode or not os.path.exists(weight):
        sys.exit(r.stdout[-3000:] + r.stderr[-3000:])
    # 3. mix
    j, blob = glb_read(src)
    views = [blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']] for bv in j['bufferViews']]
    img = j['images'][0]
    old = np.asarray(Image.open(io.BytesIO(views[img['bufferView']])).convert('RGB')).astype(np.float32)
    proj = np.asarray(Image.open(color).convert('RGB')).astype(np.float32)
    w = np.asarray(Image.open(weight).convert('L')).astype(np.float32)[..., None] / 255
    new = (old * (1 - w) + proj * w).round().astype(np.uint8)
    print(name, 'texels changed:', int((w[..., 0] > 0.01).sum()), 'of', w.size)
    buf = io.BytesIO()
    Image.fromarray(new).save(buf, 'PNG', optimize=False, compress_level=6)
    Image.fromarray(new).save(os.path.join(work, name + '-texture.png'))
    # 4. the rigged copy
    views[img['bufferView']] = buf.getvalue()
    img['mimeType'] = 'image/png'
    os.makedirs(os.path.join(OUT, 'meshy'), exist_ok=True)
    glb_write(os.path.join(OUT, 'meshy', name + '-rigged.glb'), j, views)
    print(os.path.join(OUT, 'meshy', name + '-rigged.glb'))


if __name__ == '__main__':
    for a in sys.argv[1:]:
        main(a)
