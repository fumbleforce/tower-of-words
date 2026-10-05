"""Appends round 2 to reviews/aoi-meshy-1 and reviews/emi-meshy-1 (the caller's brief: one item per character, a
"round 2" section after round 1). Run once from the worktree root: python3 art/candidates/aoi-emi-meshy-2/review.py
"""
import json

R2 = 'Round 2. '
AOI = {
 'title': 'Aoi rounds 1 and 2: a 3D chibi made the way Kuro round 3 was',
 'question': 'Round 2 (aoi-2, last option) has a smaller head and smaller hands, and is in the game; is she right now?',
 'media': [
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-steps.webp', 'caption': R2 + 'Your verdict on aoi-1: "her face is a tiny bit too large and her hands are larger than the others. but it is very very close id say". One change for the head: in her round-1 chat (a1, b1, c2), Kuro\'s follow-up as written, "make her head a little smaller relative to her body, everything else the same", attaching c2. Three takes, every one shown. Head share of height (top of the hair to the chin, over top to soles): c2 0.42, e1 0.41, e2 0.41, e3 0.38. e3 shrank her the most but also lengthened her legs; e1 and e2 keep the rest as c2 had it, with her hands in her pockets as before. e2 went to Meshy (its stance is closest to c2). 3 takes, $0.75.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-shape-previews.webp', 'caption': R2 + 'The same Meshy steps as round 1. Image-to-3D from e2: smart topology (meshy-t2), 1,050 polygons, A-pose, no texture, 5 credits. Meshy\'s own previews; first roll, kept (1,109 triangles).'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-uv.webp', 'caption': R2 + 'Our UV layout with the front of her face as one piece at 3 times the detail (the face-first unwrap). This time the biggest front-facing piece in the window was a hair shell, so the face is picked as the second biggest (77 polygons, red; the script now takes piece=1). Then Meshy retexture on that mesh, styled from e2, keep the UVs, lighting removed, no PBR, 10 credits. Right: the texture Meshy painted; her face is one piece.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-tex.webp', 'caption': R2 + 'The textured model: front, her left three-quarter (her left side, image right, turned to us), her left side, back, her right three-quarter, face. Same camera and light as round 1. Her hands now have skin colour (round 1\'s were white-grey).'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-before-after.webp', 'caption': R2 + 'Before and after: round 1 (aoi-1) and round 2 (aoi-2), full figure and face, same camera.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-measure.webp', 'caption': R2 + 'Head share of height on the models, measured as in round 1 (straight-on, flat colour, rest pose): Kuro round 3 0.41, Aoi round 1 0.43, Aoi round 2 0.40.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-chin.webp', 'caption': R2 + 'From below the chin in the texture\'s own colours, looking for dark marks like Kuro\'s: none.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-hands.webp', 'caption': R2 + 'Hands. On the new model her hands are still big: measured as skin area on the straight-on pictures, their length is 0.065 of her height, as long as Eric\'s and Mio\'s (0.066) and much longer than Kuro\'s (0.041) and Emi\'s (0.038). So, as you allowed, the game scales her two hand bones to 0.75 when she loads (0.050 of her height, between Kuro and Mio); everything else stays as Meshy made her. Left: as Meshy made her; right: at 0.75; then her right hand (image left) close up.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-hands-cast.webp', 'caption': R2 + 'Her hands at 0.75 beside Mio, Kuro and Emi round 2, each figure at the same height.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-compare.webp', 'caption': R2 + 'Aoi round 2 beside the in-game Eric and Mio and Kuro round 3, front and her right three-quarter.'},
  {'image': 'art/parts/aoi-meshy-1/sheets/r2-viewer.webp', 'caption': R2 + 'Meshy auto-rig at 1.1 m, 5 credits, and Meshy\'s Chair_Sit_Idle_F for sitting in her train seat, 3 credits. Stills from the live viewer (rest, idle, walk, walk from the side); the viewer shows her hands as Meshy made them. Meshy credits for round 2: 23 (shape 5, texture 10, rig 5, sit 3). She is in the game now (Showcase aoi-emi-in-game-1).'},
 ],
 'option': {'id': 'aoi-2', 'label': 'aoi-2 (round 2)', 'image': 'art/parts/aoi-meshy-1/renders/tex2/r45.png',
            'images': ['art/parts/aoi-meshy-1/renders/tex2/front.png', 'art/parts/aoi-meshy-1/renders/tex2/face.png',
                       'art/parts/aoi-meshy-1/renders/tex2/back.png', 'art/parts/aoi-meshy-1/pics/e2.png'],
            'note': 'Round 2, from picture e2 (chat a1, b1, c2, then "make her head a little smaller relative to her body, everything else the same"): smart topology, 1,050 polygons, our UV layout with the face in one piece, Meshy retexture styled from e2, auto-rig at 1.1 m, Meshy sit. Head share 0.40 (round 1 0.43, Kuro 0.41). In the game her hand bones are at 0.75. 23 Meshy credits; three pictures $0.75. In the game since this round.'},
}
EMI = {
 'title': 'Emi rounds 1 and 2: a 3D chibi made the way Kuro round 3 was',
 'question': 'Round 2 (emi-2, last option) has no lanyard and her jaw edges repainted, and is in the game; is she right now?',
 'media': [
  {'image': 'art/parts/emi-meshy-1/sheets/r2-steps.webp', 'caption': R2 + 'Your verdict on emi-1: "looking good, but for some discoloration, and the lanyard which becomes mangled. we should remove props when making the models." One change for the lanyard: her step 3 again in her round-1 chat (a2, b1), as "Simpler head model, no glasses, no lanyard" (props come off in the picture steps, now in art/PROMPTS.md). Three takes, every one shown; none has the lanyard or badge. c2 has a hand on her hip (Meshy would fuse it to her side); c3 and c4 stand with arms down like c1. Head share: c1 0.47, c2 0.50, c3 0.44, c4 0.49. c3 went to Meshy: it keeps the rest closest to c1 and its head is the smallest. 3 takes, $0.74.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-shape-previews.webp', 'caption': R2 + 'The same Meshy steps as round 1. Image-to-3D from c3: smart topology (meshy-t2), 1,050 polygons, A-pose, no texture, 5 credits. Meshy\'s own previews; first roll, kept (1,126 triangles). No lanyard.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-uv.webp', 'caption': R2 + 'Our UV layout with the front of her face as one piece at 3 times the detail. The biggest front-facing piece was the lock of hair over her right side (image left), so the face is the second biggest (18 polygons, red). Then Meshy retexture, styled from c3, keep the UVs, lighting removed, no PBR, 10 credits. Right: Meshy\'s texture; her face is one piece.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-tex.webp', 'caption': R2 + 'The textured model as Meshy painted it: front, her left three-quarter (image right side turned to us), her left side, back, her right three-quarter, face.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-before-after.webp', 'caption': R2 + 'Before and after: round 1 (emi-1, with the lanyard) and round 2 (emi-2, without), full figure and face. Her head came out a little smaller too (0.48 to 0.43 of her height), since c3\'s is.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-measure.webp', 'caption': R2 + 'Head share of height on the models: Kuro round 3 0.41, Emi round 1 0.48, Emi round 2 0.43.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-jaw.webp', 'caption': R2 + 'The discolouration. The round-1 grey-blue dashes under her cheeks are gone with the new texture; the new one has dark slivers along the edges of her jaw (front, and under her left jaw, image right). Fixed the way Kuro\'s cheek was (kuro-meshy-orig-3/cheek_fix.py, here with her chin\'s height band): only the dark texels on the skin triangles facing down under her jaw are filled from the skin round them; her mouth\'s four chin triangles are left out, so the edge of her mouth stays. Before and after, from below, texture colours only. Not touched: the patch of hair colour under her right jaw (image left) with a small skin-coloured nub in it, which sits on hair; say if you want that changed too.'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-jaw-marked.webp', 'caption': R2 + 'Where the repainted texels are, marked green on the model (11 triangles, 3,897 texels of the 2048 px texture).'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-compare.webp', 'caption': R2 + 'Emi round 2 beside the in-game Eric and Mio and Kuro round 3, front and her right three-quarter (Meshy\'s texture).'},
  {'image': 'art/parts/emi-meshy-1/sheets/r2-viewer.webp', 'caption': R2 + 'Meshy auto-rig at 1.1 m, 5 credits, and Meshy\'s Chair_Sit_Idle_F for her desk chair, 3 credits. Stills from the live viewer (rest, idle, walk, walk from the side), with Meshy\'s texture. Meshy credits for round 2: 23 (shape 5, texture 10, rig 5, sit 3). She is in the game now, with the repainted texture (Showcase aoi-emi-in-game-1).'},
 ],
 'option': {'id': 'emi-2', 'label': 'emi-2 (round 2)', 'image': 'art/parts/emi-meshy-1/renders/tex2/r45.png',
            'images': ['art/parts/emi-meshy-1/renders/tex2/front.png', 'art/parts/emi-meshy-1/renders/tex2/face.png',
                       'art/parts/emi-meshy-1/renders/tex2/back.png', 'art/parts/emi-meshy-1/pics/c3.png'],
            'note': 'Round 2, from picture c3 (chat a2, b1, then "Simpler head model, no glasses, no lanyard"): smart topology, 1,050 polygons, our UV layout with the face in one piece, Meshy retexture styled from c3, auto-rig at 1.1 m, Meshy sit. No lanyard; head share 0.43 (round 1 0.48). In the game the dark texels along her jaw are repainted in skin. 23 Meshy credits; three pictures $0.74. In the game since this round.'},
}
LINK = {'aoi': {'label': 'Live 3D, round 2: aoi-2 beside the in-game Eric and Mio and Kuro round 3 (turn, zoom, idle, walk)',
                'href': 'tools/characters/parts/viewer.html?cfg=/reviews/aoi-meshy-1/viewer.json&a=aoi-2&m=idle&c=Eric%2C%20Mio%20and%20Kuro'},
        'emi': {'label': 'Live 3D, round 2: emi-2 beside the in-game Eric and Mio and Kuro round 3 (turn, zoom, idle, walk)',
                'href': 'tools/characters/parts/viewer.html?cfg=/reviews/emi-meshy-1/viewer.json&a=emi-2&m=idle&c=Eric%2C%20Mio%20and%20Kuro'}}
SHOW = {'label': 'In the game: Showcase aoi-emi-in-game-1', 'href': 'bible/#showcase/aoi-emi-in-game-1'}

for c, r in (('aoi', AOI), ('emi', EMI)):
    p = f'reviews/{c}-meshy-1/review.json'
    d = json.load(open(p))
    assert not any(o['id'] == r['option']['id'] for o in d['options']), 'round 2 is already in ' + p
    d['title'], d['question'], d['status'] = r['title'], r['question'], 'open'
    for m in d['media']:
        if not m['caption'].startswith('Round 1. '):
            m['caption'] = 'Round 1. ' + m['caption']
    d['media'] += r['media']
    d['options'].append(r['option'])
    d['links'] = [LINK[c], SHOW] + d['links']
    with open(p, 'w') as f:
        f.write('{\n')
        items = list(d.items())
        for i, (k, v) in enumerate(items):
            end = ',' if i < len(items) - 1 else ''
            if isinstance(v, list):
                f.write(f' {json.dumps(k)}: [\n')
                f.write(',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in v))
                f.write(f'\n ]{end}\n')
            else:
                f.write(f' {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}{end}\n')
        f.write('}\n')
    print('appended round 2 to', p)
