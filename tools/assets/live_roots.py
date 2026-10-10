"""The live folders, from the two registries tools/assets/live.mjs keeps (notes/asset-lifecycle.md). A generator calls
refuse_live(path) before it writes: a new render goes into a generated area and reaches the game only through
`node tools/assets/live.mjs promote`. tools/comfy.py does this for every image and video it saves."""
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REGISTRIES = ('tools/assets/live.json', 'island/private/game/live.json')


def live_roots():
    roots = []
    for rel in REGISTRIES:
        try:
            with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
                roots += json.load(f).get('roots', [])
        except FileNotFoundError:
            pass
    return roots


def refuse_live(path):
    """Raise ValueError when path is inside a live folder of this checkout or of the main one."""
    real = os.path.realpath(os.path.abspath(path))
    for root in live_roots():
        for base in {ROOT, os.path.realpath(ROOT)}:
            live = os.path.join(base, root)
            if real.startswith(live) or os.path.abspath(path).startswith(live):
                raise ValueError(f'{path}: {root} is a live folder. Render into the round folder or art/production/, '
                                 'then promote the pick: node tools/assets/live.mjs promote (notes/asset-lifecycle.md)')
