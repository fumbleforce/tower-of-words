"""reviews/<id>-meshy-1/review.json for the staff's Meshy models, from the notes below (one entry per person, written
after looking at every sheet).
  python3 art/candidates/staff-meshy-1/review.py <id>
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
FIRST = ('The first two sheets are ChatGPT pictures; every sheet after them is a render of the real rigged model, which '
         'you can turn in the live viewer next to Eric, Mio, Kuro, Aoi and Emi (link below). ')
STEP1 = ('ChatGPT pictures. Your words: "can you also kick off the remaining staff and background characters in the new '
         'style". One chat in ChatGPT\'s image model (openai/gpt-5.4-image-2 on OpenRouter), as for Kuro, Aoi and Emi. '
         'Step 1 attached these two: the approved portrait and your Mio chibi.')
P = {
 'mori': dict(
  name='Mr. Mori', he='he', his='his', pic='d1', attempt='mori-1',
  steps='ChatGPT pictures. Every take, in order, with your words as written: 1 "make a 3d chibi anime character in the '
        'style of the attached image" (a1, a2; a2 has his hands in his pockets, so a1 went on), 2 "Simplify male character '
        'a LOT to match the detail level of the other chibi, with open eyes" (b1; he looks younger here, the wrinkles '
        'went), 3 "Simpler head model" (c1; he wears nothing that needed removing), then your angle prompt with "he" and '
        '"his" (d1). Head share in d1: 0.39 of his height (top of the hair to the chin, over top to soles; Eric 0.46, '
        'Kuro 0.41, Aoi 0.40, Emi 0.43), so no head-size follow-up. 5 takes, $1.23.',
  shape='Meshy\'s previews; first roll, kept.',
  uv='66 polygons, red; the biggest front-facing piece was a hair shell, so the face is piece=1',
  faces='From below the chin in the texture\'s own colours, looking for dark marks like Kuro\'s: none, so the texture '
        'is in the game as Meshy painted it.',
  measure='Head share on the models (straight-on, flat colour, rest pose, each figure at the same height): Eric 0.46, '
          'Kuro 0.41, Aoi 0.40, Emi 0.43, Mori 0.47. His head came out bigger on the model than in the picture (0.39); '
          'it is about Eric\'s share, above Kuro, Aoi and Emi. Not changed: say if you want the head-size follow-up '
          '("make his head a little smaller relative to his body, everything else the same") and a second Meshy pass '
          '(about 20 credits). Hands: 0.054 of his height (Eric and Mio 0.066, Aoi in game 0.050, Kuro 0.041, Emi '
          '0.038), so his hand bones are left as Meshy made them.',
  game='Meshy auto-rig at 1.1 m, 5 credits, and Meshy\'s Chair_Sit_Idle_F for his desk and the lunch table, 3 credits.',
  credits='Meshy credits for Mori: 23 (shape 5, texture 10, rig 5, sit 3); balance 343 after him.',
  ingame='In the game (day 1, 1366x860, test mode): greeting Eric at the B2 door, and in B2 by the copier. The camera '
         'looks down on him from behind here, so his face is easier to judge in the live viewer.',
  note='The rigged model from d1 (chat a1, b1, c1, d1): smart topology, 1,050 polygons, our UV layout with the face in '
       'one piece, Meshy retexture styled from d1, auto-rig at 1.1 m, Meshy sit. Head share 0.47. In the game at 1.09 '
       'tall in place of his code-built body. 23 Meshy credits; five pictures $1.23.',
  q='Is Mori right?'),
}


def main():
    cid = sys.argv[1]
    p = P[cid]
    A = f'art/parts/{cid}-meshy-1'
    S = f'{A}/sheets'
    a = p['attempt']
    view = (f'tools/characters/parts/viewer.html?cfg=/reviews/{cid}-meshy-1/viewer.json&a={a}&m=idle'
            '&c=Eric%2C%20Mio%2C%20Kuro%2C%20Aoi%20and%20Emi')
    media = [
        {'image': f'{S}/step0-inputs.webp', 'caption': STEP1},
        {'image': f'{S}/steps.webp', 'caption': p['steps']},
        {'image': f'{S}/shape-previews.webp', 'caption': f'Renders of the real model from here on. Meshy image-to-3D from '
         f'{p["pic"]} with Kuro\'s settings: smart topology (meshy-t2), 1,050 polygons, A-pose, no texture, 5 credits. '
         + p['shape']},
        {'image': f'{S}/uv.webp', 'caption': f'The face-first UV unwrap before the texture pass (Aoi\'s uv_bl.py): the front '
         f'of the face as one piece at 3 times the detail of the rest ({p["uv"]}). Then Meshy retexture on that mesh, '
         f'styled from {p["pic"]}, keep the UVs, lighting removed, no PBR, 10 credits. Right: the texture Meshy painted.'},
        {'image': f'{S}/tex.webp', 'caption': 'The textured model: front, three-quarter (the left side of the image turned to '
         'us), side, back, the other three-quarter, face. Same camera and light as Kuro\'s, Aoi\'s and Emi\'s rounds.'},
        {'image': f'{S}/faces.webp', 'caption': p['faces']},
        {'image': f'{S}/measure.webp', 'caption': p['measure']},
        {'image': f'{S}/compare.webp', 'caption': f'{p["name"]} beside the in-game Eric and Mio and Kuro (the same render '
         'script and camera), front and three-quarter.'},
        {'image': f'{S}/viewer.webp', 'caption': p['game'] + ' Stills from the live viewer (rest, idle, walk, walk from the '
         'side); the idle and walk are the game\'s. ' + p['credits']},
    ]
    if os.path.exists(f'/home/jorgen/repo/japanese/{S}/ingame.webp'):
        media.append({'image': f'{S}/ingame.webp', 'caption': p['ingame']})
    r = {'title': f'{p["name"]}: a 3D model made the way Kuro, Aoi and Emi were', 'date': '2026-10-05',
         'by': 'Claude (staff-meshy agent)', 'status': 'open',
         'question': FIRST + f'{p["he"].capitalize()} is in the game now. ' + p['q'], 'multi': False, 'media': media,
         'options': [{'id': a, 'label': a, 'image': f'{A}/renders/tex/r45.png',
                      'images': [f'{A}/renders/tex/front.png', f'{A}/renders/tex/face.png', f'{A}/renders/tex/back.png',
                                 f'{A}/pics/{p["pic"]}.png'], 'note': p['note']}],
         'links': [{'label': f'Live 3D: {p["name"]} beside the in-game Eric, Mio, Kuro, Aoi and Emi (turn, zoom, idle, walk)',
                    'href': view},
                   {'label': 'Aoi round 2, the same process (aoi-meshy-1)', 'href': 'bible/#review/aoi-meshy-1'},
                   {'label': 'Kuro round 3, the approved process (kuro-meshy-orig-3)', 'href': 'bible/#review/kuro-meshy-orig-3'}]}
    d = f'{ROOT}/reviews/{cid}-meshy-1'
    os.makedirs(d, exist_ok=True)
    json.dump(r, open(f'{d}/review.json', 'w'), indent=1, ensure_ascii=False)
    print('wrote', f'{d}/review.json', len(media), 'media')


if __name__ == '__main__':
    main()
