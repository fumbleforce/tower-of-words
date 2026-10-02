"""Face textures for the chibi cast: face-base.svg (the eye style from Jørgen's picture) recoloured and given each
person's own marks, all drawn as vector shapes in the same coordinates (x across the head in mm from the middle,
y = 1090 - height in mm). Imported by cast.py; also runs alone to write the SVGs for a look:

  python3 tools/characters/chibi/face.py <outdir>     writes <outdir>/<id>-face.svg for every face in FACES

A face: skin (must equal the body's skin colour), iris (top, middle, bottom of the gradient), brow, mouth, and
optionally male (no outer lash flick or corner stroke, a heavier brow), lips (a filled mouth colour), stubble, and
glasses (frame colour, lens box her right side x0..x1, y0..y1, corner radius, frame width).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, 'face-base.svg')

FACES = {
    # Mio: pale; light tan eyes; taupe-grey rounded-rectangle glasses from the lash line to mid-cheek (art/PROMPTS.md)
    'mio': dict(skin='#f6e0d3', iris=('#5a4426', '#8f6f3e', '#d9b77c'), brow='#1f3236', mouth='#b07468',
                glasses=dict(color='#5a4f4c', x0=-262, x1=-70, y0=352, y1=508, rx=34, w=10)),
    # Kuro: pale; grey-blue eyes; black frames with clear lenses; dark lipstick
    'kuro': dict(skin='#f5ddd0', iris=('#232a38', '#4b5770', '#93a3bd'), brow='#16161d', mouth='#4b2733',
                 lips='#4b2733', glasses=dict(color='#121216', x0=-264, x1=-70, y0=350, y1=492, rx=20, w=9)),
    # Eric: fair; blue eyes; silver rectangular glasses; stubble; a heavier, straighter brow
    'eric': dict(skin='#f3d3bf', iris=('#1f3a66', '#3f6aa6', '#8fb8e6'), brow='#7c6646', mouth='#a8705e',
                 male=True, stubble='#9c8466', glasses=dict(color='#9aa1aa', x0=-258, x1=-74, y0=362, y1=478, rx=9, w=8)),
}


def glasses_svg(g):
    x0, x1, y0, y1, rx, w, c = g['x0'], g['x1'], g['y0'], g['y1'], g['rx'], g['w'], g['color']
    lens = lambda sx: (f'<rect x="{min(sx * x0, sx * x1)}" y="{y0}" width="{abs(x1 - x0)}" height="{y1 - y0}" rx="{rx}" '
                       f'fill="#ffffff" fill-opacity="0.07" stroke="{c}" stroke-width="{w}"/>')
    bridge = f'<path d="M {x1} {y0 + 30} Q 0 {y0 + 14} {-x1} {y0 + 30}" fill="none" stroke="{c}" stroke-width="{w * 0.8}"/>'
    return '\n  '.join([lens(1), lens(-1), bridge])


def stubble_svg(c):
    return (f'<defs><pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse">'
            f'<circle cx="2" cy="2" r="1.3" fill="{c}"/><circle cx="5.5" cy="5.5" r="1.1" fill="{c}"/></pattern>'
            f'<radialGradient id="jawfade"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>'
            f'<mask id="jaw"><ellipse cx="0" cy="612" rx="140" ry="70" fill="url(#jawfade)"/></mask></defs>'
            f'<g mask="url(#jaw)"><path d="M -150 540 Q -60 585 -30 548 Q 0 540 30 548 Q 60 585 150 540 L 150 700 L -150 700 Z" '
            f'fill="url(#dots)" opacity="0.4"/><path d="M -150 540 Q -60 585 -30 548 Q 0 540 30 548 Q 60 585 150 540 '
            f'L 150 700 L -150 700 Z" fill="{c}" opacity="0.12"/></g>')


def face_svg(f):
    s = open(TEMPLATE).read()
    for old, new in zip(('#2f1f19', '#5a3d31', '#a9826d'), f['iris']):
        s = s.replace(f'stop-color="{old}"', f'stop-color="{new}"')
    s = s.replace('fill="#f2c8ae"', f'fill="{f["skin"]}"')
    css = [f'#brow {{ fill: {f["brow"]}; stroke: {f["brow"]}; }}', f'#mouth {{ stroke: {f["mouth"]}; }}']
    if f.get('male'):
        css += ['#flick, #outer { display: none; }', f'#brow {{ stroke-width: 6; }}']
    s = s.replace('<defs>', '<style>' + ' '.join(css) + '</style>\n  <defs>', 1)
    extra = []
    if f.get('stubble'): extra.append(stubble_svg(f['stubble']))
    if f.get('lips'):
        extra.append(f'<path d="M -19 562 Q -8 554 0 557 Q 8 554 19 562 Q 0 573 -19 562 Z" fill="{f["lips"]}"/>')
    if f.get('glasses'): extra.append(glasses_svg(f['glasses']))
    return s.replace('</svg>', '  ' + '\n  '.join(extra) + '\n</svg>')


def write(fid, path):
    open(path, 'w').write(face_svg(FACES[fid]))
    return path


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for k in FACES: print(write(k, f'{out}/{k}-face.svg'))
