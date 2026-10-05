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
 'kenji': dict(
  name='Kenji', he='he', his='his', pic='d1', attempt='kenji-1',
  steps='ChatGPT pictures. Every take, in order, with your words as written: 1 "make a 3d chibi anime character in the '
        'style of the attached image" (a1, a2; a1 is closer to his soft, pudgy build, so it went on), 2 "Simplify male '
        'character a LOT to match the detail level of the other chibi, with open eyes" (b1), 3 "Simpler head model, no '
        'lanyard, no badge" (c1: lanyard and badge gone; he also came out slimmer than his portrait), then your angle '
        'prompt with "he" and "his" (d1). Head share in d1: 0.37 of his height (Eric 0.46, Kuro 0.41, Aoi 0.40, Emi '
        '0.43), so no head-size follow-up. 5 takes, $1.23.',
  shape='Meshy\'s previews; first roll, kept. His hair spikes lean to one side, as in d1.',
  uv='40 polygons, red; the biggest front-facing piece',
  faces='From below the chin in the texture\'s own colours, looking for dark marks like Kuro\'s: none. There are thin '
        'pale lines along the edge of his jaw (lighter than the skin, not dark). The texture is in the game as Meshy '
        'painted it.',
  measure='Head share on the models (straight-on, flat colour, rest pose, each figure at the same height): Eric 0.46, '
          'Kuro 0.41, Aoi 0.40, Emi 0.43, Kenji 0.46. As with Mori, the model\'s head came out bigger than the '
          'picture\'s (0.37); it matches Eric\'s. Hands, counted from the rig\'s hand bones: 0.102 of his height, about '
          'Eric\'s (0.107) and Mio\'s (0.105); Aoi\'s were 0.108 before the game scaled them to 0.75. His are left as '
          'Meshy made them, since they match Eric\'s; say if they should be scaled like Aoi\'s.',
  game='Meshy auto-rig at 1.1 m, 5 credits, and Meshy\'s Chair_Sit_Idle_F for his desk, 3 credits.',
  credits='Meshy credits for Kenji: 23 (shape 5, texture 10, rig 5, sit 3); balance 320 after him.',
  ingame='In the game (day 1, 1366x860, test mode): B2 from above, and Kenji at his desk (Meshy sit) talking to Eric.',
  note='The rigged model from d1 (chat a1, b1, c1, d1): smart topology, 1,050 polygons, our UV layout with the face in '
       'one piece, Meshy retexture styled from d1, auto-rig at 1.1 m, Meshy sit. Head share 0.46. Slimmer than his '
       'portrait. In the game at 1.12 tall in place of his code-built body. 23 Meshy credits; five pictures $1.23.',
  q='Is Kenji right?'),
 'guard': dict(
  name='Mr. Ishibashi (the guard)', he='he', his='his', pic='d1', attempt='guard-1',
  steps='ChatGPT pictures. Every take, in order, with your words as written: 1 "make a 3d chibi anime character in the '
        'style of the attached image" (a1, a2; a1 has his hands out and stands at an angle, so it went on), 2 "Simplify '
        'male character a LOT to match the detail level of the other chibi, with open eyes" (b1), 3 "Simpler head model, '
        'no glasses, no name plate, no shoulder patch" (c1: glasses, name plate, badge and patch gone; the thin '
        'moustache became a thick one), then your angle prompt with "he" and "his" (d1). Head share in d1: 0.41 (Eric '
        '0.46, Kuro 0.41, Aoi 0.40, Emi 0.43), so no head-size follow-up. 5 takes, $1.24.',
  shape='Meshy\'s previews; first roll, kept.',
  uv='68 polygons, red; his eyes are modelled as separate sunken pieces, so they are added to the face\'s piece '
     '(the script\'s new also= option) and painted with it',
  faces='From below the chin in the texture\'s own colours: no black marks on the skin (cheek_fix.py finds no dark '
        'texels on the skin under his jaw). There are grey-blue streaks along the underside of his moustache and a pale '
        'blue patch under his chin, both only visible from below; the game\'s camera looks down on him, so the texture '
        'is in the game as Meshy painted it. Say if they should be repainted.',
  measure='Head share on the models (straight-on, flat colour, rest pose, each figure at the same height): Eric 0.46, '
          'Kuro 0.41, Aoi 0.40, Emi 0.43, the guard 0.46 (0.41 in the picture). Hands, counted from the rig\'s hand '
          'bones: 0.139 of his height, against Eric 0.107, Mio 0.105, Kenji 0.102, Mori 0.093. So, as for Aoi, the game '
          'scales his two hand bones to 0.75 when he loads (0.104, Eric\'s size); the live viewer shows them as Meshy '
          'made them.',
  game='Meshy auto-rig at 1.1 m, 5 credits, and Meshy\'s Chair_Sit_Idle_F for his chair at the gate desk, 3 credits.',
  credits='Meshy credits for the guard: 23 (shape 5, texture 10, rig 5, sit 3); balance 297 after him.',
  ingame='In the game (day 1, 1366x860, test mode): the gate from above, and the guard seated at his desk as Eric '
         'comes up to it, and at "nine o\'clock" (the clock emote over him).',
  note='The rigged model from d1 (chat a1, b1, c1, d1): smart topology, 1,050 polygons, our UV layout with the face and '
       'eyes in one piece, Meshy retexture styled from d1, auto-rig at 1.1 m, Meshy sit. Head share 0.46. In the game at '
       '1.09 tall in place of his code-built body, hand bones at 0.75. 23 Meshy credits; five pictures $1.24.',
  q='Is the guard right?'),
 'kuroda': dict(
  name='Mr. Hamada', he='he', his='his', pic='e1', attempt='kuroda-1',
  steps='ChatGPT pictures. Every take, in order, with your words as written: 1 "make a 3d chibi anime character in the '
        'style of the attached image" (a1, a2; a1 keeps more of his thin, tired face, so it went on), 2 "Simplify male '
        'character a LOT to match the detail level of the other chibi, with open eyes" (b1), 3 "Simpler head model" '
        '(c1; he wears nothing that needed removing; here he lost the tired look and the grey at his temples and '
        'looks younger), then your angle prompt with "he" and "his" (d1). d1\'s head was 0.46 of his height, above '
        'Kuro (0.41), Aoi (0.40) and Emi (0.43), and the staff before him came out bigger on the model than in their '
        'pictures, so Kuro\'s follow-up with "his": "make his head a little smaller relative to his body, everything '
        'else the same" (e1, 0.36; it also turned him further). 6 takes, $1.50.',
  shape='Meshy\'s previews; first roll, kept.',
  uv='116 polygons, red; the biggest front-facing piece',
  faces='From below the chin in the texture\'s own colours: no black streaks under the jaw; there is a small grey '
        'mark at the point of his chin, like a drawn chin line.',
  extra=[('chin-fix-try.webp', 'The chin mark: cheek_fix.py with a band round his chin found the downward skin '
          'triangles, but the mark is not on them, and it repainted other texels (white, right). So that fix is not '
          'used: the game has the texture as Meshy painted it, with the mark. Say if it should go.')],
  measure='Head share on the models (straight-on, flat colour, rest pose, each figure at the same height): Eric 0.46, '
          'Kuro 0.41, Aoi 0.40, Emi 0.43, Hamada 0.40 after the follow-up. Hands, counted from the rig\'s hand bones: '
          '0.092 of his height (Eric 0.107, Mio 0.105, Mori 0.093), left as Meshy made them.',
  game='Meshy auto-rig at 1.1 m, 5 credits, and Meshy\'s Chair_Sit_Idle_F for his train seat, 3 credits.',
  credits='Meshy credits for Hamada: 23 (shape 5, texture 10, rig 5, sit 3); balance 274 after him.',
  ingame='In the game (day 1, 1366x860, test mode). On the train he takes the sleeping salaryman\'s seat: asleep, his '
         'head dropped forward and to the side and nodding every ~7 s (drawn on his head and upper back bones over the '
         'sit clip), and sitting up when he wakes. Then at the gate.',
  note='The rigged model from e1 (chat a1, b1, c1, d1, then the head follow-up): smart topology, 1,050 polygons, our UV '
       'layout with the face in one piece, Meshy retexture styled from e1, auto-rig at 1.1 m, Meshy sit. Head share '
       '0.40. In the game at 1.09 tall in place of his code-built body wherever he appears. '
       '23 Meshy credits; six pictures $1.50.',
  q='Is Hamada right?'),
 'rei': dict(
  name='Rei', he='she', his='her', pic='d1', attempt='rei-1', installed=False,
  steps='ChatGPT pictures. Every take, in order, with your words as written: 1 "make a 3d chibi anime character in the '
        'style of the attached image" (a1 with black trousers, a2 in the light grey trouser suit of her portrait, so '
        'a2 went on), 2 "Simplify female character a LOT to match the detail level of the other chibi, with open eyes" '
        '(b1), 3 "Simpler head model, no earrings" (c1: the gold hoops gone), then your angle prompt (d1). Head share in '
        'd1: 0.39 of her height counting the ponytail (Eric 0.46, Kuro 0.41, Aoi 0.40, Emi 0.43), so no head-size '
        'follow-up. Her long ponytail hangs down her left side (image right) to her knees in every take. 5 takes, $1.24.',
  shape='Meshy\'s previews; first roll, kept. The ponytail is one big slab beside her left arm (image right).',
  uv='24 polygons, red; the biggest front-facing pieces were her fringe, so the face is piece=1',
  faces='From below the chin in the texture\'s own colours.',
  extra=[('rig-fault.webp', 'The problem: Meshy\'s auto-rig put her skeleton in the wrong place. Her spine sits '
          'behind her body and her shoulders are twisted about 50 degrees (her left shoulder 0.2 m behind her right), '
          'so in the idle and walk her head and upper body bend and turn away. A second auto-rig on the same model (5 '
          'credits) placed the bones the same way. Most likely the ponytail slab: it hangs beside her left arm and '
          'the rig reads it as part of her body.')],
  measure='Head share on the model (straight-on, flat colour, rest pose): see the last figure. Not checked further '
          'because of the rig.',
  game='Meshy auto-rig at 1.1 m, twice (5 credits each), and Meshy\'s Chair_Sit_Idle_F, 3 credits.',
  credits='Meshy credits for Rei: 28 (shape 5, texture 10, rig 5, second rig 5, sit 3); balance 251 after her.',
  ingame='',
  note='The model from d1 (chat a2, b1, c1, d1): smart topology, 1,050 polygons, our UV layout with the face in one '
       'piece, Meshy retexture styled from d1, auto-rig at 1.1 m. Her rig is twisted, so she is NOT in the game; '
       'the code-built Rei stays (she is hidden all day anyway). 28 Meshy credits; five pictures $1.24.',
  q='Her rig came out twisted, so she is not in the game. Shall I redo her with one more take of the angle step, '
    'asking nothing new but picking a take where the ponytail hangs behind her back, then the same Meshy steps (about '
    '23 credits)?'),
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
        *({'image': f'{S}/{f}', 'caption': c} for f, c in p.get('extra', [])),
        {'image': f'{S}/measure.webp', 'caption': p['measure']},
        {'image': f'{S}/compare.webp', 'caption': f'{p["name"]} beside the in-game Eric and Mio and Kuro (the same render '
         'script and camera), front and three-quarter.'},
        {'image': f'{S}/viewer.webp', 'caption': p['game'] + ' Stills from the live viewer (rest, idle, walk, walk from the '
         'side); the idle and walk are the game\'s. ' + p['credits']},
    ]
    if p['ingame'] and os.path.exists(f'/home/jorgen/repo/japanese/{S}/ingame.webp'):
        media.append({'image': f'{S}/ingame.webp', 'caption': p['ingame']})
    r = {'title': f'{p["name"]}: a 3D model made the way Kuro, Aoi and Emi were', 'date': '2026-10-05',
         'by': 'Claude (staff-meshy agent)', 'status': 'open',
         'question': FIRST + (f'{p["he"].capitalize()} is in the game now. ' if p.get('installed', True) else '') + p['q'],
         'multi': False, 'media': media,
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
