"""Generated pictures for the five day-1 Photos finds (game3d/js/finds/spots.js), round photos-1.
Jørgen (in-game feedback 2026-10-04_193007): "these collectibles must be generatoed, they look like shit".

Each find keeps its subject, title and place. One style block, one light line and one size (4:3, as the game shows
them) for the whole set, so the five read as one set of snapshots. Staging notes per shot are in STAGING (for
checking; they don't go into the prompts).

Usage (GPU lock held): ~/ai/sd/venv/bin/python art/candidates/photos-1/gen.py <pass>
  pass a: every shot on RDBT and on One Obsession, seeds 11, 12, 13
  later passes: one change per shot, listed in PASSES
Raw PNGs: art/production/photos-1/ (git-ignored). webp copies and prompts.json: this folder.
"""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy  # noqa: E402
from PIL import Image  # noqa: E402

RAW = os.path.join(ROOT, 'art', 'production', 'photos-1')
LOCK_OWNER = '/tmp/claude-1000/gpu.lock/owner'
ME = 'claude-agent:photos-gen'

MODELS = {'rdbt': 'rdbtAnima.safetensors', 'oneobs': 'oneObsessionAnima.safetensors'}
W, H = 1152, 864  # 4:3, the shape of the print and the close look

# quality tags first (GUIDE: Rewards; art/PROMPTS.md Structure), then the rating, then the house style anchors
Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
     'safe, anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, '
     'hand-painted anime background')
# the same light treatment on every shot: soft, a little hazy, muted colours (the world palette is muted slate and teal)
LIGHT = 'Soft light, gentle muted colours, a quiet everyday moment.'
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, '
       'text, watermark, signature, letters, logo, border, frame, '
       '3d, realistic, photorealistic, render, chubby, '
       'western cartoon, comic book, flat vector, thick outlines, poster art, pop art, '
       'people, person, 1girl, 1boy, crowd, character, child, loli')

STAGING = {
    'monorail': """Early train (photo_gate, lies in the security room). Beat: the first train of the morning, seen from the island's sea wall.
Camera: on the island's seafront at eye level, about 2 m above calm water, facing out across the bay. The beam on round
pillars crosses the frame left to right at mid height; a short white monorail of three cars sits on top of it, left of
centre, with both ends in frame and a gap where it sits on the beam. Low sun just above the horizon right of centre,
glitter on the water under it. Behind the camera: the island and its towers; not in the prompt. No mainland city.
Check: train has an end and a cab at both ends, sits on the beam, beam continues off frame, pillars stand in water.""",
    'cherry': """Spring garden (photo_forecourt, lies on the raked gravel court in the forecourt's south garden by the stone lantern).
Camera: standing on the gravel, eye level about 1.6 m, facing a cherry tree in full bloom on the left with its branches
reaching over a stone lantern on the right. Raked pale gravel in front, a few petals on it and in the air, a strip of
lawn and low hedge behind, blue sky through the blossom. Morning light. Check: one lantern, standing on the ground,
tree trunk rooted, gravel raked in lines.""",
    'pigeons': """At the fountain (photo_plaza, lies by the plaza's north-west benches).
Camera: crouched low, about 0.6 m, on the pale stone paving, facing the wide round stone basin of the fountain. Five
grey pigeons peck and walk on the paving in front; the low stone rim and clear water behind them, the fountain's
two-tier centrepiece with water spilling in thin curtains further back, a few trees beyond. Daylight. Check: pigeons
have two legs each, stand on the paving, rim is one continuous curve.""",
    'cat': """Office company (photo_office, lies on the B2 copy room floor). A cat asleep on a keyboard in the basement office.
Camera: standing at the desk looking down at a slight angle, about 1 m from the cat. A ginger tabby cat curled asleep
on a beige computer keyboard on a grey steel desk; the beige CRT monitor behind it, its screen glowing pale blue.
Basement: no windows, cool fluorescent ceiling light, dim grey wall behind. Check: one cat, four legs/tail sensible,
keyboard under it, no window, no daylight.""",
    'fireworks': """Summer night (photo_dorm, lies in the dorm courtyard in front of the drinks machines).
Camera: from the dorm courtyard side at eye level, looking over the dark low roofs of the dorm buildings toward the sea.
Foreground: dark roof line with a few warm lit windows. Middle: the dark sea, calm, reflecting the colours. Sky: three
or four fireworks bursts, gold, pale blue and pink, and their smoke. Night. Check: fireworks in the sky not on the
ground, roofs and windows sensible, sea below the horizon.""",
}

# what the camera sees, in plain sentences (art/PROMPTS.md Prompt template), no story
SCENE = {
    'monorail': ('no humans, scenery, view across a calm bay at sunrise from the sea wall. A white elevated concrete '
                 'monorail beam on round pillars crosses the picture from left to right above the water. A short white '
                 'monorail train of three cars sits on top of the beam, left of centre. The low sun sits just above the '
                 'horizon, with sunlight glittering on the calm sea. Dominant pale peach sky and sea blue, broad white, '
                 'sparse warm orange accents.'),
    'cherry': ('no humans, scenery, a Japanese garden in spring. A cherry tree in full bloom stands on the left, its '
               'branches reaching over a stone lantern on the right. Raked pale gravel in front, with a few fallen petals. '
               'A low clipped hedge and blue sky behind. Morning sunlight. Dominant soft pink and pale grey, broad sky '
               'blue, sparse green accents.'),
    'pigeons': ('no humans, scenery, low view across pale stone paving toward the round stone rim of a wide fountain. '
                'Five grey pigeons peck and walk on the paving in front. Clear water in the basin, and a two-tier stone '
                'centrepiece further back with water spilling from its bowls. Trees behind. Daylight. Dominant pale '
                'stone grey and water blue, broad green, sparse iridescent green and purple accents on the pigeons.'),
    'cat': ('no humans, a ginger tabby cat curled up asleep on a beige computer keyboard on a grey steel office desk, '
            'seen from slightly above. An old beige CRT monitor behind the keyboard, its screen glowing pale blue. A '
            'dim grey wall behind, cool fluorescent ceiling light, no window. Dominant cool grey and beige, broad pale '
            'blue screen light, sparse warm orange of the cat.'),
    'fireworks': ('no humans, scenery, night view over the dark low roofs of a few apartment buildings toward the sea. '
                  'Some windows are lit warm yellow. Fireworks burst in the night sky above the sea in gold, pale blue '
                  'and pink, with thin drifting smoke. The calm dark sea reflects their colours. Dominant deep navy, '
                  'broad dark slate, sparse gold, pale blue and pink accents.'),
}

# one change per shot per pass; each entry: (shot, model, seed, scene text, what changed)
PASSES = {
    'a': [(s, m, seed, SCENE[s], 'first pass') for s in SCENE for m in MODELS for seed in (11, 12, 13)],
}
# pass b, One Obsession only (pass a: softer and closer to one set than RDBT on all five); one swap per shot
B = {
    'monorail': ('A white elevated concrete monorail beam on round pillars crosses the picture from left to right above '
                 'the water. A short white monorail train of three cars sits on top of the beam, left of centre.',
                 'A single narrow white concrete beam on round pillars crosses the picture from left to right above the '
                 'water. A short white monorail train of three cars sits astride the beam, left of centre, with no rails.',
                 'the train sits astride one narrow beam, no rails (pass a drew railway trains on a bridge)'),
    'cherry': ('Raked pale gravel in front,', 'Pale gravel raked into straight parallel lines in front,',
               'gravel raked into straight lines (pass a: plain gravel on 2 of 3)'),
    'cat': ('curled up asleep on a beige computer keyboard', 'curled up asleep lying on top of the keys of a beige '
            'computer keyboard', 'the cat lies on top of the keys (pass a: beside the keyboard on 3 of 6)'),
    'fireworks': ('the dark low roofs of a few apartment buildings', 'the dark flat roofs of a few low concrete '
                  'apartment blocks', 'flat-roofed concrete blocks (pass a: Western houses with chimneys)'),
}
for _s, (_old, _new, _why) in B.items():
    assert _old in SCENE[_s], _s
PASSES['b'] = [(s, 'oneobs', seed, SCENE[s].replace(o, n), why) for s, (o, n, why) in B.items() for seed in (11, 12, 13)]
# Tama (docs/game/cast.md) is a calico who sleeps in B2; the drawing's cat is ginger. One variant to ask which.
PASSES['b'].append(('cat', 'oneobs', 14, SCENE['cat'].replace(B['cat'][0], B['cat'][1]).replace(
    'a ginger tabby cat', 'a calico cat, white with orange and black patches,').replace(
    'sparse warm orange of the cat', 'sparse orange and black patches of the cat'),
    'calico like Tama (cast.md) instead of ginger, with the pass-b cat wording; a question, not a fix'))
# pass c, Early train only: pass a's prompt unchanged, plus the line sketch (sketch.py) into Anima LLLite lineart at 0.8
# until 60% of the steps (art/PROMPTS.md, composition control). Words could not make a monorail in passes a and b.
LINES = os.path.join(RAW, 'monorail-lines.png')
PASSES['c'] = [('monorail', m, seed, SCENE['monorail'], 'pass a prompt plus a line sketch (sketch.py), LLLite lineart 0.8 until 60%',
                ('lineart', LINES, 0.8, 0.6)) for m in ('oneobs', 'rdbt') for seed in (11, 12, 13)]
# pass d: the same sketch held harder, strength 1.0 until 80% (the blockout setting in art/PROMPTS.md); pass c kept the
# beam edge to edge but drew a wide deck with the cars on top and two or four cars
PASSES['d'] = [('monorail', 'oneobs', seed, SCENE['monorail'], 'pass c with the sketch at strength 1.0 until 80%',
                ('lineart', LINES, 1.0, 0.8)) for seed in (11, 12, 13)]


def prompt(scene):
    return f'{Q}, {scene} {LIGHT}'


def still_mine():
    try:
        return ME in open(LOCK_OWNER).read()
    except OSError:
        return False


def main(pas, only=None):
    os.makedirs(RAW, exist_ok=True)
    log_path = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    done = {e['id'] for e in log}
    for shot, mkey, seed, scene, change, *ctl in PASSES[pas]:
        if only and shot not in only:
            continue
        aid = f'{shot}-{pas}-{mkey}-{seed}'
        if aid in done:
            continue
        if not still_mine():
            sys.exit('GPU lock is not ours any more; stopping')
        p = prompt(scene)
        wf = comfy.anima(p, NEG, model=MODELS[mkey], w=W, h=H, steps=30, cfg=5.0, seed=seed)
        for kind, img, strength, end in ctl:  # Anima LLLite composition control, as tools/promptlab.py
            wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': f'anima-lllite-{kind}-1.safetensors'}}
            wf['I'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(img)}}
            wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': wf['7']['inputs']['model'], 'model_patch': ['P', 0],
                                                                   'image': ['I', 0], 'strength': strength, 'start_percent': 0.0,
                                                                   'end_percent': end}}
            wf['7']['inputs']['model'] = ['A', 0]
        t = time.time()
        png = os.path.join(RAW, aid + '.png')
        comfy.run(wf, png)
        Image.open(png).convert('RGB').save(os.path.join(HERE, aid + '.webp'), quality=88)
        log.append({'id': aid, 'shot': shot, 'pass': pas, 'model': MODELS[mkey], 'seed': seed, 'w': W, 'h': H,
                    'steps': 30, 'cfg': 5.0, 'sampler': 'euler_ancestral/normal', 'change': change,
                    'prompt': p, 'negative': NEG, 'control': [[k, os.path.relpath(i, ROOT), st, e] for k, i, st, e in ctl], 'secs': round(time.time() - t, 1)})
        json.dump(log, open(log_path, 'w'), indent=1, ensure_ascii=False)
        print(aid, round(time.time() - t, 1), 's', flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:] or None)
