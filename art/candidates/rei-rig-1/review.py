"""Adds Rei's new rig (rei-1-rig2) to reviews/rei-meshy-1 and Kenji round 3 (kenji-3) to reviews/kenji-meshy-1, after
the sheets (rei-rig-1/sheets.sh, kenji-meshy-3/sheets.sh). Run once; it skips a review that already has the option.
  python3 art/candidates/rei-rig-1/review.py
"""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
VIEW = 'tools/characters/parts/viewer.html?cfg=/reviews/{r}/viewer.json&a={a}&m=walk&c=none'


def add(rid, option, media, question, link):
    p = f'{ROOT}/reviews/{rid}/review.json'
    r = json.load(open(p))
    if any(o['id'] == option['id'] for o in r['options']):
        print(rid, 'already has', option['id']); return
    r['question'] = question
    r['status'] = 'open'
    r['date'] = '2026-10-05'
    r['media'] += media
    r['options'].append(option)
    r['links'].insert(0, link)
    json.dump(r, open(p, 'w'), indent=1, ensure_ascii=False)
    print('updated', rid)


R = 'art/parts/rei-meshy-1'
add('rei-meshy-1', {
    'id': 'rei-1-rig2', 'label': 'rei-1-rig2 (new rig)',
    'image': f'{R}/viewer/close-rig2/walk-80.png',
    'images': [f'{R}/viewer/close-rig2/idle-0.png', f'{R}/viewer/close-rig2/walk-0.png', f'{R}/viewer/close-rig2/walk-157.png',
               f'{R}/game/train-rei.png'],
    'note': 'rei-1 as Meshy made it (the same vertices, UVs and texture, unchanged) on a rig of ours: the game\'s Meshy '
            'skeleton placed inside her body, with Emi\'s bone orientations, so Meshy\'s walk, run and sit play on her as '
            'on Emi; the ponytail weighted to her head and neck. In the game since this round, 1.12 tall. No Meshy credits, '
            'no pictures.'},
    [
        {'image': f'{R}/sheets/rig2-joints.webp',
         'caption': 'Rig round 2, from here on renders of the real model. Your note on rei-1: "model good, rig terrible". '
                    'Left: Meshy\'s skeleton on rei-1; its spine, neck and her left arm\'s bones sit inside the ponytail '
                    '(the red piece, behind her and to her left, image right), 12 cm behind her back and 7 cm to her left. '
                    'Right: the new skeleton, the same 24 bones and names the other Meshy people have, each joint placed '
                    'from her own mesh (the middle of each trouser leg, of the jacket between the arms, of each sleeve), '
                    'left and right mirrored. Her model is not touched (no new Meshy generation, 0 credits).'},
        {'image': f'{R}/sheets/rig2-weights.webp',
         'caption': 'Which bone moves each part, by its strongest bone. Left: Meshy\'s weights. Right: the new ones. Head '
                    'and hair tie on the head; the ponytail on the head at the top, blending to the neck lower down, so it '
                    'turns with her head and hangs from her neck; arms, spine and legs each on their own side\'s bones.'},
        {'image': f'{R}/sheets/rig2-before-after.webp',
         'caption': 'The live viewer, before and after: rei-1 (Meshy\'s rig) bends sideways and turns her head; '
                    'rei-1-rig2 stands and walks straight. The idle and walk here are the game\'s.'},
        {'image': f'{R}/sheets/rig2-viewer.webp',
         'caption': 'rei-1-rig2 in the live viewer: rest, idle and walk from the front, three-quarter (the left side of '
                    'the image turned to us), side and back.'},
        {'image': f'{R}/sheets/rig2-ingame.webp',
         'caption': 'In the game (day 1, test mode, 2560x1440): seated on the train with Meshy\'s Chair_Sit_Idle_F, as '
                    'she is before the story seats Mio in her place. The story keeps her hidden for the rest of day 1, so '
                    'this still shows her for the picture only. Run, sit, idle and walk were also checked frame by frame: '
                    'her head, chest and hips turn exactly as Emi\'s do (at most 4.5, 17 and 7 degrees in the walk).'},
    ],
    'The first two sheets are ChatGPT pictures; every sheet after them is a render of the real rigged model, which you can '
    'turn in the live viewer (links below; rei-1-rig2 is the new rig). Your note on rei-1: "model good, rig terrible". '
    'rei-1-rig2 is the same model on a new rig of ours, and she is in the game now. Is her rig right?',
    {'label': 'Live 3D: rei-1-rig2, the new rig, alone (turn, zoom, idle, walk; switch to rei-1 to compare)',
     'href': VIEW.format(r='rei-meshy-1', a='rei-1-rig2')})

K = 'art/parts/kenji-meshy-1'
add('kenji-meshy-1', {
    'id': 'kenji-3', 'label': 'kenji-3 (round 3)',
    'image': f'{K}/renders/tex3/r45.png',
    'images': [f'{K}/renders/tex3/front.png', f'{K}/renders/tex3/face.png', f'{K}/renders/tex3/back.png', f'{K}/pics/f3.png'],
    'note': 'Round 3, from picture f3 (his round-2 chat, then "same character, even soft flat lighting, his hair a solid '
            'dark colour, everything else the same"): the same Meshy steps, then his skin weights mended (Meshy had put '
            'his whole torso and his tie on his thigh bones). Head share 0.41. In the game since this round, 1.12 tall. '
            '23 Meshy credits; three pictures $0.89.'},
    [
        {'image': f'{K}/sheets/r3-steps.webp',
         'caption': 'Round 3. ChatGPT pictures. Your verdict on kenji-2: "his model is a bit broken, his hair is getting '
                    'skin color due to aggressive lighting in reference". In his round-2 chat (a1, b1, c1, d1, e2), '
                    'attaching e2, one follow-up: "same character, even soft flat lighting, his hair a solid dark colour, '
                    'everything else the same". Three takes, every one shown: all three lost the pale hair tips; f3 kept '
                    'e2\'s round belly and spiky hair best (f1 came out a little slimmer, f2 smoother hair), so f3 went to '
                    'Meshy. 3 takes, $0.89.'},
        {'image': f'{K}/sheets/r3-shape-previews.webp',
         'caption': 'Round 3. Renders of the real model from here on. The same Meshy steps: image-to-3D from f3, smart '
                    'topology, 1,050 polygons, A-pose, no texture, 5 credits. Meshy\'s previews; first roll, kept. Three '
                    'pieces this time (body with both arms whole, hair, tie); round 2 had seven (both forearms cut off at '
                    'the elbow, a loose shirt pocket plate, two loose patches for the pale hair tips).'},
        {'image': f'{K}/sheets/r3-uv.webp',
         'caption': 'Round 3. The face-first UV unwrap (the whole face one piece, red), then Meshy retexture styled from '
                    'f3, keep the UVs, no PBR, 10 credits.'},
        {'image': f'{K}/sheets/r3-tex.webp',
         'caption': 'Round 3. The textured model, same cameras as before. His hair is one dark colour all round.'},
        {'image': f'{K}/sheets/r3-before-after.webp',
         'caption': 'Round 2 and round 3, front and back: the skin-coloured patches on the back of his hair are gone.'},
        {'image': f'{K}/sheets/r3-weights.webp',
         'caption': 'What else was broken: Meshy\'s auto-rig weights, shown as each part\'s strongest bone. On kenji-2 and '
                    'again on kenji-3, Meshy put his whole torso and belly on the two thigh bones (almost nothing on the '
                    'spine), his knees barely bent, his tie went 53% to the thighs and 30% to the head, and on kenji-2 '
                    'the loose pocket plate followed his left thigh and arm. Mended on kenji-3 (right): the skeleton Meshy '
                    'placed is kept, the weights are Blender\'s bone-heat weights, the belly above the hips goes with the '
                    'pelvis, the hair with the head, and the tie takes the weights of the shirt behind it.'},
        {'image': f'{K}/sheets/r3-walk.webp',
         'caption': 'The walk in the live viewer: kenji-2; kenji-3 with Meshy\'s weights (his shirt hem and tie pulled '
                    'about by his legs); kenji-3 mended (hem straight, tie in place). Both kenji-3 versions are in the '
                    'viewer to compare.'},
        {'image': f'{K}/sheets/r3-viewer.webp',
         'caption': 'kenji-3 in the live viewer: rest, idle from four sides, walk.'},
        {'image': f'{K}/sheets/r3-faces.webp',
         'caption': 'Round 3. From below the chin in the texture\'s own colours: no dark marks; the texture is in the game '
                    'as Meshy painted it.'},
        {'image': f'{K}/sheets/r3-compare.webp',
         'caption': 'Round 3 beside the in-game Eric and Mio and Kuro. Head share 0.41 of his height (round 2 0.43; Eric '
                    '0.46, Kuro 0.41). His hands counted from the hand bones come to 0.158 of his height, which again '
                    'takes in his bare forearms; on the renders they match his arms, so they are left as Meshy made them.'},
        {'image': f'{K}/sheets/r3-ingame.webp',
         'caption': 'Round 3 in the game (day 1, test mode, 1366x860): at his desk in B2 (Meshy sit, reweighted the same '
                    'way). Meshy credits for round 3: 23 (shape 5, texture 10, rig 5, sit 3); balance 300.'},
    ],
    'The ChatGPT sheets are pictures (step0, steps, r2-steps, r3-steps); every other sheet is a render of the real rigged '
    'model, which you can turn in the live viewer (links below). Round 3 (kenji-3, the last option and the r3 sheets) '
    'answers your note on kenji-2: the reference picture now has even light and his hair one dark colour, and Meshy\'s '
    'broken skin weights are mended. He is in the game now. Is Kenji right now?',
    {'label': 'Live 3D: kenji-3 alone (turn, zoom, idle, walk; "kenji-3 (Meshy weights)" and kenji-2 to compare)',
     'href': VIEW.format(r='kenji-meshy-1', a='kenji-3')})
