"""Writes reviews/crowd-pilot-2/review.json (Review crowd-pilot-2, #232) and lists every file the live viewer loads
from art/parts/ in its "viewer_files", so tools/bible/pages.py puts them on the public site with the item.
  python3 art/candidates/crowd-pilot-2/review.py
"""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
S = 'art/parts/crowd-pilot-2/sheets/'
V = 'art/parts/crowd-pilot-2/viewer/'

QUESTION = (
    "Round 1 failed because its viewer never moved the people, so the game's gait (which times the walk to how far "
    "they go) held the walk's first frame with a leg up and then stood them back up, and because the man's eyes were "
    "loose shells that the texture smeared; this round both walk and run where they actually move (in the game and in "
    "a new viewer), both are on Meshy's own rig and clips with mended skin weights, and the man is a new shape with "
    "flat painted eyes. Are these two right to go ahead with the other five archetypes?")

media = [
    (S + 'diag-viewer.webp',
     "History, round 1 (not options). Why the walk only lifted a leg: round 1's viewer set 'walk' and never moved "
     "anyone. The game's gait (game3d/js/movement/gait.js) plays the walk clip by the distance the body covers and "
     "stands anyone who hasn't moved for 0.7 s, so the viewer held the clip's first frame (one leg up) and then put "
     "them back in idle. Captured from round 1's own viewer, walk pressed at 0: 0.1, 0.4, 0.8 and 1.6 s. It was the "
     "viewer, not the retarget or the bone orientations: the clips themselves were fine."),
    (S + 'diag-ingame-r1.webp',
     "History: the same round 1 files walked in the actual game (forecourt, the game's own walkRig): they step "
     "normally. The game's gait check measured feet in time with the ground (median ratio 1.00 for both, no "
     "on-the-spot or sliding episodes)."),
    (S + 'diag-weights.webp',
     "Why 'our rig' looked exaggerated, as far as measuring shows: walk and run on rig (a) and rig (b) were the same "
     "Meshy clip and measured the same (thigh swing -24 to +38 degrees, knee 78, foot lift within 0.03 leg lengths of "
     "each other, the same as Kenji, Hamada and Emi in the game). The difference was the idle: on rig (a) the hips "
     "moved 2.7 to 2.8 times as far and the left elbow bent to 54 degrees (40 for B) against 19 to 20 on rig (b), "
     "because rig (a) took the bone orientations of its donor (Hamada, Emi), and in the viewer the people stood in "
     "idle most of the time. Round 2 drops rig (a). On Meshy's rig the weights were broken another way: Meshy put "
     "B's shins and A's lower jacket on the thigh bones (left). Mended as on Kenji round 3 (right): Meshy's skeleton "
     "and clips kept, Blender bone-heat weights, belly above the hips on the pelvis, hair and bun on the head, each "
     "shoe moving as one with its foot."),
    (S + 'eyes-history.webp',
     "ChatGPT pictures. Why A's eyes broke: Meshy built his eyes and brows as four loose shells floating in front of "
     "the face (15 pieces in round 1's shape), and the texture smeared over them. Round 2: one follow-up in his "
     "round-1 chat (a-a1, a-b1, a-c1, a-d1), attaching a-d1: \"same character, his eyes simple and painted flat on "
     "the face, no separate or raised eye shapes, everything else the same\". Two takes, both shown: a-e1 (eyes with a "
     "little detail, sent to Meshy) and a-e2 (narrow slits, not used). $0.53."),
    (S + 'shape-a.webp',
     "Real 3D model from here on. Meshy image-to-3D from a-e1, smart topology, 1,050 polygons, A-pose, no texture, "
     "5 credits; first roll. 8 pieces (body, legs, hair, head, two hands, two shoes): no eye or brow shells."),
    (S + 'tex-a.webp',
     "A textured: the face-first UV layout (kuro-meshy-orig-3/uv_bl.py), then Meshy retexture styled from a-e1, our "
     "UVs kept, no PBR, 10 credits. Front, three-quarter (his left side, image right, turned to us), side, back, face. "
     "CPU render, not the game's light."),
    (S + 'faces.webp',
     "Faces close, live viewer. A: flat painted eyes and brows, clean. B: unchanged from round 1 (the same shape and "
     "texture; only her rig is new)."),
    (S + 'viewer-idle.webp', "Live viewer, idle (the approved relaxed-3 idle baked on each rig), four sides."),
    (S + 'viewer-walk-side.webp',
     "Live viewer, walk on the treadmill: they walk forward at their own pace while the grid slides back under them, "
     "so the planted foot should stay on its grid line. 0.1 s apart, from the side."),
    (S + 'viewer-walk-legs.webp', "Walk, legs close from the side, every 0.2 s: A, then B."),
    (S + 'viewer-run-side.webp', "Run on the treadmill, 0.1 s apart."),
    (S + 'viewer-run-legs.webp',
     "Run, legs close. B's legs are as Meshy painted them except a few hundred texels of thin dark streak behind "
     "the knee, repainted in her skin colour (they showed once the knee bent)."),
    (S + 'viewer-sit.webp', "Sit (Meshy's Chair_Sit_Idle_F), on the viewer's see-through block."),
    (S + 'cast.webp',
     "Beside Hamada, Kenji and Emi, all built by the game's loader in the same viewer: idle, walk, run, and all five "
     "walking round the loop. A 1.09 tall (as Hamada), B 1.06."),
    (S + 'ingame-walk.webp',
     "In the actual game (plaza at lunch, its crowd about, 1366x860, test capture mode): the game's own walkRig walks "
     "each across the view, 0.1 s of game time apart; Kenji and Mio walk the same route. The game's gait check "
     "watched everyone throughout: A and B in step (median ratio 0.98 each, no on-the-spot or sliding episode); Kenji "
     "had one 1.2 s 'feet too fast' episode while setting off. The dark shape across B's frames at 21.7 to 21.9 s is "
     "one of the island's birds flying past the camera."),
    (S + 'ingame-run.webp', "In the game, running (walkRig with run on), same route, 0.1 s apart."),
    (S + 'ingame-wide.webp', "In the game, the whole view mid-walk."),
]

options = [
    {'id': 'crowd-a-2', 'label': 'crowd-a-2: office man',
     'image': V + 'face-a.png', 'images': [V + 'pair-walk-legs-a-2.png', S + 'tex-a.webp'],
     'note': ("New shape from a-e1 (painted eyes), face-first UVs, Meshy texture, Meshy auto-rig at 1.1 m with its walk, "
              "run and Chair_Sit_Idle_F, skin weights mended. 23 credits (shape 5, texture 10, rig 5, sit 3); pictures "
              "$0.53. Checks: walk, run and idle in the game, in step, no episodes; face clean in close-ups; walk and "
              "run measure as the cast (planted-foot slip 0.16 walk, 0.35 run; Kenji 0.20, 0.33; Hamada 0.17, 0.52). "
              "A cold critic (a fresh Claude session given only the sheets) gave 6.5 of 10, under the 8 pass mark: "
              "eyes 'clean but crude', black slots simpler than the cast's; head large and hair a flat dark mass; legs "
              "slim next to Kenji and Emi; run 'leggy, high back-kick'. The run is the same Meshy clip as the cast's and "
              "measures the same (thigh -22 to +38 degrees, Kenji -23 to +38).")},
    {'id': 'crowd-b-2', 'label': 'crowd-b-2: office woman',
     'image': V + 'face-b.png', 'images': [V + 'pair-walk-legs-b-2.png', 'art/parts/crowd-pilot-1/sheets/tex-b.webp'],
     'note': ("Round 1's shape and texture kept (her face was clean). Only the rig is new: Meshy's own auto-rig, walk, "
              "run and sit from round 1, weights mended (her shins had been on the thigh bones), and thin dark streaks "
              "behind her knees repainted in skin. No new credits. Checks: in step in the game, no episodes; walk and "
              "run measure as the cast (slip 0.17 walk, 0.21 run; Emi 0.16, 0.21). Cold critic: 6 of 10.")},
]

links = [
    {'label': 'Live 3D: A and B, and beside the cast (turn, pan, zoom; idle, walk, run, sit; walking on a treadmill or round a loop)',
     'href': 'reviews/crowd-pilot-2/viewer.html'},
    {'label': "Round 1 (crowd-pilot-1), history", 'href': 'bible/#review/crowd-pilot-1'},
]

cfg = json.load(open(f'{ROOT}/reviews/crowd-pilot-2/viewer.json'))
files = []
for rig in cfg['rigs'].values():
    if rig['dir'].startswith('art/parts/'):
        files += [rig['dir'] + f for f in ('walk.glb', 'run.glb', 'sit.glb', 'base.webp')] + [rig['idle']]
rv = {'title': 'Crowd pilot round 2: office man (A) and office woman (B) on Meshy\'s rig',
      'date': '2026-10-06', 'by': 'Claude (crowd-pilot agent, #232)', 'status': 'open', 'question': QUESTION,
      'multi': True, 'media': [{'image': i, 'caption': c} for i, c in media], 'options': options, 'links': links,
      'viewer_files': sorted(set(files))}
json.dump(rv, open(f'{ROOT}/reviews/crowd-pilot-2/review.json', 'w'), indent=1, ensure_ascii=False)
missing = [p for p in [m[0] for m in media] + [o['image'] for o in options] + sum([o['images'] for o in options], []) + files
           if not os.path.exists(f'/home/jorgen/repo/japanese/{p}')]
print('written;', 'missing: ' + ', '.join(missing) if missing else 'all files here')
