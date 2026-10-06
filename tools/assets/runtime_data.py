"""Read runtime declarations and parsed coordinates without scanning asset directories."""
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
CONST = {'lobby': {'BZ': -0.55, 'Z': 4.5, 'X': 6.3}, 'office': {'CN': 0.2, 'CS': 2.4, 'Z0': -6.4}, 'train': {'LZ': 1.2, 'LX': 4.0, 'DOOR_X': 3.25}}
# Library labels for every place the game registers (game3d/js/places/definitions.js PLACE_FILES), plus the lift,
# which rides between places. load_runtime_data() refuses a registered place that has no label here.
PLACES = {'train': 'Train', 'gate': 'Station security room', 'forecourt': 'Forecourt', 'plaza': 'Fountain plaza', 'canteen': 'Canteen', 'lift': 'Lift', 'office': 'B2 office', 'dorm_court': 'Dorm courtyard', 'dorms': "Eric's dorm room", 'shotengai': 'Shop street', 'izakaya': 'Izakaya', 'karaoke': 'Karaoke box', 'karaoke_booth': 'Karaoke booth', 'east_lane': 'East lane', 'east_coast': 'East coast', 'dorm_commons': 'Dorm common room', 'sports': 'Gym and pool', 'pool': 'Pool deck', 'gym': 'Gym', 'office_quarter': 'Office street', 'harbour': 'Harbour', 'works': 'Old works'}


def num(expr, consts):
    expr = expr.strip()
    if not re.fullmatch(r'[\sA-Z0-9_.+\-*/()]+', expr):
        return None
    try:
        return float(eval(expr, {'__builtins__': {}}, consts))
    except Exception:
        return None


def prop_entry(prop):
    room, place, file = prop['room'], prop['place'], prop['file']
    tid, label, kind = prop['id'], prop['label'], prop['kind']
    entry = dict(id_=f'prop/{place}/{tid}', kind='prop', name=label, paths=[file], status='provisional',
                 status_from='A named thing in the game (built in code)', source=f'{os.path.basename(file)} things.{tid}',
                 place=place, used=[f"{PLACES[place]}: tap target '{label}'"],
                 view={'type': 'room', 'room': room}, tags=['in game', kind])
    if prop['moving']:
        return entry
    consts = CONST.get(room, {})
    args = prop['anchor']['args']
    anchor = [num(a, consts) for a in args] if len(args) == 3 else [None]
    spot = None
    if prop['at']:
        values = [num(a, consts) for a in prop['at']]
        if len(values) >= 2 and None not in values[:2]:
            spot = values[:2]
    if None not in anchor and not (room == 'train' and abs(anchor[2]) > 1.5):
        entry['view'].update(anchor=anchor, spot=spot, small='small' in kind)
    entry['status_from'] += '; props are judged with their room'
    entry['source'] += '; geometry in ' + ('scenes/' + room + '.js' if room != 'train' else 'train/car.js')
    if prop['noMarker']:
        entry['used'][0] += ' (no marker)'
    return entry


def load_runtime_data():
    result = subprocess.run(['node', str(ROOT / 'tools/assets/runtime-data.mjs')], cwd=ROOT,
                            check=True, capture_output=True, text=True, timeout=30)
    data = json.loads(result.stdout)
    unnamed = sorted(set(data['places']) - set(PLACES))
    if unnamed:
        raise RuntimeError(f"place(s) {', '.join(unnamed)} are registered in game3d/js/places/definitions.js "
                         'but have no label in tools/assets/runtime_data.py PLACES')
    return {'portraits': data['portraits'], 'props': [prop_entry(prop) for prop in data['props']], 'source': data['source']}


def register_runtime_assets(runtime, add_prop, add_portrait):
    """The production registration path, also exercised with collecting callbacks by CPU checks."""
    for who, faces in runtime['portraits'].items():
        for face in faces:
            add_portrait(who, face)
    for entry in runtime['props']:
        add_prop(**entry)
