"""Mio on a VRoid base (work item #171, track D): recolour a permissive VRM into her look.

Base: VRM1_Constraint_Twist_Sample.vrm, (c) 2022 pixiv Inc., made in VRoid Studio, from
https://github.com/vrm-c/vrm-specification/tree/master/samples/VRM1_Constraint_Twist_Sample
Licence: VRM Public License 1.0 with these meta permissions: avatarPermission everyone, commercialUsage corporation,
modification allowModificationRedistribution, allowRedistribution true, creditNotation unnecessary.

Only textures, the hair's UVs and MToon colour factors change; no vertex moves. What changes (docs/game/cast.md, Mio):
- hair: dark green bordering on black; the two front side locks fade to her lighter green toward the tips, and the
  under-layer at the back of the head (HairBack) is the lighter green, so it shows underneath
- eyes: brown irises turned gold-brown
- top: the white oversized tee becomes her dark green hoodie colour; arm skin is painted the same colour to the
  wrist, so it reads as long sleeves
- shorts and leg skin: dark teal (leggings)
- sneakers: black uppers become white
The glasses are added at load time (game3d/js/vrm/mio.js), not here.

usage: ~/ai/cv-venv/bin/python tools/characters/vrm_mio.py BASE.vrm OUT.vrm [--sheet DIR]
"""
import argparse, colorsys, hashlib, io, json, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HAIR = '#13292f'
HAIR_UNDER = '#20a081'
HOODIE = '#14302f'   # a touch lighter than the portrait's #09232a so the folds read under MToon
LEGGINGS = '#1f4b52'
SHORTS = '#1a3f46'
SHOE = '#ecebe8'

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


class GLB:
    def __init__(self, path):
        b = open(path, 'rb').read()
        n = struct.unpack('<I', b[12:16])[0]
        self.j = json.loads(b[20:20 + n])
        bl = struct.unpack('<I', b[20 + n:24 + n])[0]
        self.bin = bytearray(b[28 + n:28 + n + bl])

    def acc(self, i):
        a = self.j['accessors'][i]
        bv = self.j['bufferViews'][a['bufferView']]
        n, c = a['count'], NC[a['type']]
        dt = np.dtype(CT[a['componentType']])
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', 0) or dt.itemsize * c
        raw = np.frombuffer(bytes(self.bin[off:off + stride * n]).ljust(stride * n, b'\0'), np.uint8).reshape(n, stride)
        arr = np.frombuffer(raw[:, :dt.itemsize * c].tobytes(), dt).reshape(n, c).copy()
        return arr if c > 1 else arr[:, 0]

    def write_acc(self, i, arr):
        a = self.j['accessors'][i]
        bv = self.j['bufferViews'][a['bufferView']]
        dt = np.dtype(CT[a['componentType']])
        assert not bv.get('byteStride') or bv['byteStride'] == dt.itemsize * NC[a['type']]
        data = np.ascontiguousarray(arr.astype(dt)).tobytes()
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        self.bin[off:off + len(data)] = data
        if 'min' in a:
            a['min'] = arr.min(0).tolist()
            a['max'] = arr.max(0).tolist()

    def image(self, i):
        bv = self.j['bufferViews'][self.j['images'][i]['bufferView']]
        s = bv.get('byteOffset', 0)
        return Image.open(io.BytesIO(bytes(self.bin[s:s + bv['byteLength']])))

    def set_image(self, i, im):
        buf = io.BytesIO()
        im.save(buf, 'PNG', optimize=True)
        bv = self.j['bufferViews'][self.j['images'][i]['bufferView']]
        bv['_new'] = buf.getvalue()

    def save(self, path):
        # rebuild the buffer view by view, so replaced images take their new size and nothing unused stays
        nb = bytearray()
        for v in self.j['bufferViews']:
            data = v.pop('_new', None)
            if data is None:
                s = v.get('byteOffset', 0)
                data = bytes(self.bin[s:s + v['byteLength']])
            while len(nb) % 8:
                nb.append(0)
            v['byteOffset'] = len(nb)
            v['byteLength'] = len(data)
            nb += data
        while len(nb) % 4:
            nb.append(0)
        self.j['buffers'][0]['byteLength'] = len(nb)
        js = json.dumps(self.j, separators=(',', ':'), ensure_ascii=False).encode()
        while len(js) % 4:
            js += b' '
        total = 12 + 8 + len(js) + 8 + len(nb)
        out = struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js
        out += struct.pack('<II', len(nb), 0x004E4942) + bytes(nb)
        open(path, 'wb').write(out)


def tint(im, colour, keep=1.0):
    """Recolour by luminance: the texture's light and shade stay, the hue becomes `colour` (sRGB hex)."""
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    L = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    ref = np.percentile(L, 90)
    k = np.clip(L / max(ref, 1e-3), 0.35, 1.25) ** keep
    return Image.fromarray((np.clip(rgb(colour)[None, None] * k[..., None], 0, 1) * 255).astype(np.uint8))


def amber_eyes(im):
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    hsv = np.vectorize(colorsys.rgb_to_hsv, otypes=[np.float32] * 3)(a[..., 0], a[..., 1], a[..., 2])
    h, s, v = hsv
    brown = (s > 0.25) & (v > 0.08)
    h = np.where(brown, 0.105, h)                     # about 38 degrees: amber
    s = np.where(brown, np.clip(s * 1.1, 0, 0.92), s)
    v = np.where(brown, np.clip(v * 1.35 + 0.05, 0, 1), v)
    out = np.stack(np.vectorize(colorsys.hsv_to_rgb, otypes=[np.float32] * 3)(h, s, v), -1)
    return Image.fromarray((out * 255).astype(np.uint8))


def white_shoes(im):
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    L = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dark = np.clip((0.45 - L) / 0.25, 0, 1)[..., None]   # the black uppers
    light = rgb(SHOE)[None, None] * (0.82 + 0.4 * L[..., None])
    return Image.fromarray((np.clip(a * (1 - dark) + light * dark, 0, 1) * 255).astype(np.uint8))


def body_regions(g, prim, skin, size):
    """Masks over the body texture: the triangles skinned mostly to the arms (sleeves) and legs (leggings)."""
    j = g.j
    names = [j['nodes'][k]['name'] for k in skin['joints']]
    a = prim['attributes']
    uv = g.acc(a['TEXCOORD_0'])
    J = g.acc(a['JOINTS_0'])
    W = g.acc(a['WEIGHTS_0'])
    idx = g.acc(prim['indices']).reshape(-1, 3)
    dom = np.array([names[J[i, W[i].argmax()]] for i in range(len(J))])
    arm = np.array([any(t in n for t in ('UpperArm', 'LowerArm', 'Elbow')) for n in dom])
    leg = np.array([any(t in n for t in ('UpperLeg', 'LowerLeg', 'Foot', 'Toe')) for n in dom])
    trunk = np.array([n in ('J_Bip_C_Hips', 'J_Bip_C_Spine', 'J_Bip_C_Chest') for n in dom])
    masks = {k: Image.new('L', (size, size), 0) for k in ('arm', 'leg', 'trunk')}
    draws = {k: ImageDraw.Draw(m) for k, m in masks.items()}
    for t in idx:
        key = 'arm' if arm[t].sum() >= 2 else 'leg' if leg[t].sum() >= 2 else 'trunk' if trunk[t].sum() >= 2 else None
        if key:
            draws[key].polygon([(float(uv[i, 0]) * size, float(uv[i, 1]) * size) for i in t], fill=255)
    return {k: m.filter(ImageFilter.MaxFilter(5)) for k, m in masks.items()}


def paint(im, mask, colour):
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    L = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    k = np.clip(L / np.percentile(L, 90), 0.6, 1.1)[..., None]
    m = (np.asarray(mask, np.float32) / 255)[..., None]
    return Image.fromarray((np.clip(a * (1 - m) + rgb(colour)[None, None] * k * m, 0, 1) * 255).astype(np.uint8))


def hair(g, mat_index, img_index, skin):
    """Squeeze the strand texture into the top half (dark) and add a green copy below it. The two front side locks
    use the green half, so they go from dark at the root to her lighter green at the tips."""
    j = g.j
    src = g.image(img_index).convert('RGB')
    w, h = src.size
    dark = tint(src, HAIR, 0.8).resize((w, h // 2), Image.LANCZOS)
    green = tint(src, HAIR_UNDER, 0.6).resize((w, h // 2), Image.LANCZOS)
    ramp = np.clip((np.linspace(0, 1, h // 2) - 0.45) / 0.35, 0, 1)[:, None, None]
    gd = np.asarray(dark, np.float32) * (1 - ramp) + np.asarray(green, np.float32) * ramp
    out = Image.new('RGB', (w, h))
    out.paste(dark, (0, 0))
    out.paste(Image.fromarray(gd.astype(np.uint8)), (0, h // 2))
    g.set_image(img_index, out)
    names = [j['nodes'][k]['name'] for k in skin['joints']]
    for me in j['meshes']:
        for p in me['primitives']:
            if p['material'] != mat_index:
                continue
            a = p['attributes']
            uv = g.acc(a['TEXCOORD_0'])
            J = g.acc(a['JOINTS_0'])
            W = g.acc(a['WEIGHTS_0'])
            dom = [names[J[i, W[i].argmax()]] for i in range(len(J))]
            side = np.array([n.endswith(('_11', '_12')) and 'Hair' in n for n in dom])
            uv[:, 1] = np.clip(uv[:, 1], 0.002, 0.998) * 0.5 + np.where(side, 0.5, 0.0)
            # each primitive owns its UV accessor here; a shared one would need copying first
            g.write_acc(a['TEXCOORD_0'], uv)
    return int(np.sum(side))


def mtoon(m, colour, shade=0.55):
    c = lin(rgb(colour))
    e = m['extensions']['VRMC_materials_mtoon']
    e['shadeColorFactor'] = [shade, shade, min(1.0, shade * 1.08)]
    m['pbrMetallicRoughness']['baseColorFactor'] = [1, 1, 1, 1]
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('base')
    ap.add_argument('out')
    ap.add_argument('--sheet')
    o = ap.parse_args()
    source = Path(o.base)
    expected = "12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2"
    if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
        ap.error("This recipe supports only the documented pixiv sample SHA-256")
    if source.resolve() == Path(o.out).resolve():
        ap.error("Choose a separate output to preserve the source")
    Path(o.out).parent.mkdir(parents=True, exist_ok=True)
    if o.sheet:
        Path(o.sheet).mkdir(parents=True, exist_ok=True)
    g = GLB(o.base)
    j = g.j
    mats = {m['name']: i for i, m in enumerate(j['materials'])}
    tex_of = lambda name: j['textures'][j['materials'][mats[name]]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    body_node = next(n for n in j['nodes'] if n.get('name') == 'Body')
    hair_node = next(n for n in j['nodes'] if n.get('name') == 'Hair')
    body_prim = next(p for p in j['meshes'][body_node['mesh']]['primitives'] if p['material'] == mats['Body_00_SKIN'])

    body = g.image(tex_of('Body_00_SKIN')).convert('RGB')
    R = body_regions(g, body_prim, j['skins'][body_node['skin']], body.size[0])
    body = paint(body, R['arm'], HOODIE)
    body = paint(body, R['trunk'], HOODIE)
    body = paint(body, R['leg'], LEGGINGS)
    g.set_image(tex_of('Body_00_SKIN'), body)
    g.set_image(tex_of('Tops_01_CLOTH'), tint(g.image(tex_of('Tops_01_CLOTH')), HOODIE, 1.4))
    g.set_image(tex_of('Bottoms_01_CLOTH'), tint(g.image(tex_of('Bottoms_01_CLOTH')).point(lambda v: min(255, v * 3 + 40)), SHORTS, 1.0))
    g.set_image(tex_of('Shoes_01_CLOTH'), white_shoes(g.image(tex_of('Shoes_01_CLOTH'))))
    g.set_image(tex_of('HairBack_00_HAIR'), tint(g.image(tex_of('HairBack_00_HAIR')), HAIR_UNDER, 0.7))
    g.set_image(tex_of('EyeIris_00_EYE'), amber_eyes(g.image(tex_of('EyeIris_00_EYE'))))
    n_side = hair(g, mats['Hair_00_HAIR'], tex_of('Hair_00_HAIR'), j['skins'][hair_node['skin']])
    # the hair normal map keeps its old layout; drop it (and the spec map) so the squeezed UVs don't misread it
    for name in ('Hair_00_HAIR',):
        m = j['materials'][mats[name]]
        m.pop('normalTexture', None)
    for name in ('Tops_01_CLOTH', 'Bottoms_01_CLOTH', 'Body_00_SKIN'):
        e = j['materials'][mats[name]]['extensions']['VRMC_materials_mtoon']
        e['shadeColorFactor'] = [0.62, 0.66, 0.7]
    j['materials'][mats['Body_00_SKIN']]['extensions']['VRMC_materials_mtoon']['shadeColorFactor'] = [0.93, 0.62, 0.70]
    for name in ('Hair_00_HAIR', 'HairBack_00_HAIR'):
        j['materials'][mats[name]]['extensions']['VRMC_materials_mtoon']['shadeColorFactor'] = [0.6, 0.66, 0.68]
    # size for the phone: no texture over 1024, the thumbnail 256
    for i, im in enumerate(j['images']):
        cap = 256 if im.get('name') == 'Thumbnail' else 1024
        bv = j['bufferViews'][im['bufferView']]
        pic = g.image(i) if '_new' not in bv else Image.open(io.BytesIO(bv['_new']))
        if max(pic.size) > cap:
            pic.thumbnail((cap, cap), Image.LANCZOS)
            g.set_image(i, pic)
    meta = j['extensions']['VRMC_vrm']['meta']
    meta['name'] = 'Mio (VRM test, from VRM1_Constraint_Twist_Sample)'
    meta['authors'] = ['pixiv Inc. (base)', 'Amakawa (recolour)']
    meta['copyrightInformation'] = '(c) 2022 pixiv Inc.; recoloured for Amakawa'
    g.save(o.out)
    print('wrote', o.out, 'side-lock verts', n_side)
    if o.sheet:
        for name in ('Body_00_SKIN', 'Tops_01_CLOTH', 'Hair_00_HAIR', 'EyeIris_00_EYE', 'Shoes_01_CLOTH'):
            g2 = GLB(o.out)
            im = g2.image(tex_of(name)).convert('RGB')
            im.thumbnail((512, 512))
            im.save(f'{o.sheet}/vrm-mio-{name}.jpg')


if __name__ == '__main__':
    main()
