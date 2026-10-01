"""cast-faces-1: write reviews/cast-faces-1/review.json from prompts.json, the imgqa reports and the installed picks.

Run: python3 make_review.py"""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
R = 'art/candidates/portraits/cast-faces-1/'
from install import PICKS

NAME = {'eric': 'Eric', 'kenji': 'Kenji', 'emi': 'Emi', 'aoi': 'Aoi', 'guard': 'Ishibashi (guard)', 'mori': 'Mr. Mori', 'hamada': 'Mr. Hamada'}
log = json.load(open(os.path.join(HERE, 'prompts.json')))


def qa(who, fname):
    p = os.path.join(HERE, f'imgqa-{who}', 'imgqa.json')
    if not os.path.exists(p):
        return ''
    for im in json.load(open(p))['images']:
        if im['path'].endswith(fname):
            bits = [f"red rim {im['redrim']['value'] * 100:.1f}% ({im['redrim']['status']})",
                    f"drift from the installed neutral ccip {im['drift']['ccip']:.3f} ({im['drift']['status']})"]
            g = im.get('glasses', {})
            if g.get('value') is not None:
                bits.append(f"glasses {g['status']}")
            if im['matte'].get('frame') is not None:
                bits.append(f"matte frame {im['matte']['frame']:.2f}")
            return 'imgqa: ' + ', '.join(bits) + '.'
    return ''


options, order = [], ['eric', 'kenji', 'emi', 'aoi', 'guard', 'mori', 'hamada']
for who in order:
    gid, bid, base, faces = PICKS[who]
    inst = {att: face for face, att in faces.items()}
    options.append(dict(id=f'{who}-neutral', label=f'{NAME[who]} · neutral ({base})', image=R + f'{who}-neutral.webp',
                        note=f'Your pick {base}, cut out and framed for the game. In the game now as {gid}-neutral. ' + qa(who, f'{who}-neutral.webp')))
    for name, e in log.items():
        if e.get('kind') != 'face' or e['who'] != who:
            continue
        face = e['face'].split('-')[0]
        now = f' In the game now as {gid}-{face} (my pick).' if name in inst else ''
        options.append(dict(id=name, label=f'{NAME[who]} · {name}', image=R + f'{who}-{name}.webp',
                            note=f"{face.capitalize()}: face-only repaint of {base}.{now} Seed {e['seed']}, denoise {e['denoise']}, rdbtAnima, "
                                 f"{e['settings']}. {qa(who, f'{who}-{name}.webp')} Prompt: {e['prompt']} | Negative: {e['negative']}"))
for name, e in log.items():
    if e.get('kind') != 'fix':
        continue
    picked = name in ('fix-guard-plate-d75-2', 'fix-guard-patch-d75-2', 'fix-guard-collar-d75-1', 'fix-aoi-patch-d90-2')
    options.append(dict(id=name, label=f"{NAME[e['who']]} · {name}", image=R + 'fix-sheet.webp',
                        note=f"Patch repaint on the {e['who']} base, box {e['box']}.{' Used.' if picked else ''} Seed {e['seed']}, denoise {e['denoise']}, "
                             f"{e['settings']}. Prompt: {e['prompt']} | Negative: {e['negative']}"))

media = [
    dict(image='bible/shots/showcase/cast-faces-1/lineup.webp', caption='The new cast in the game, placed the way the game places them (same face height, chins on one line), '
         'Mio and Kuro kept at the ends.'),
    dict(image='bible/shots/showcase/cast-faces-1/faces-installed.webp', caption='Every face each person has in the game now. Each set is one base; only the face is repainted, '
         'everything else is pixel-identical.'),
    dict(image=R + 'fix-sheet.webp', caption='The small fixes, before and every attempt. Guard: name plate "BVIER", shoulder patch "SOLICY", collar '
         'pin "G2" repainted without letters (used: plate 2, patch 2, collar 1, all denoise 0.75). Aoi: the "IN" chest patch; at 0.75 the letters '
         'stayed on all three seeds, at 0.9 seed 2 gave a pink star (used); seed 1 drew a girl\'s portrait into the patch.'),
]
for who in order:
    if who in ('emi', 'aoi'):
        continue
    media.append(dict(image=R + f'faces-{who}.webp', caption=f'{NAME[who]}: the face of every attempt in order, the base first.'))
    media.append(dict(image=R + f'attempts-{who}.webp', caption=f'{NAME[who]}: every attempt framed for the game on its dark colour.'))

review = dict(
    title='The new cast portraits in the game, with their faces',
    date='2026-09-30',
    by='claude-agent:portrait-install',
    status='open',
    question='These are now in the game: keep each face, or name another attempt (or say what is off)?',
    multi=True,
    _note=('Your picks from style-align-1 and npc-base-1 are installed: Eric eric-ink-2001, Kenji kenji-ink-2001, Emi emi-base-2001, Aoi '
          'aoi-base-2001, the guard guard-ink-2001, Mori mori-new-713, Hamada hamada-new-743. Mio is untouched. Each person keeps the faces the game '
          'had (Eric surprised and tired, Kenji grin and sheepish, the guard stern and amused, Mori smile and flustered, Hamada sleepy and '
          'panicked; Emi and Aoi only neutral). The faces are face-only repaints of the picked base, the way Kenji\'s were made; I picked one '
          'per face and put it in the game so the build is complete, every attempt is below.\n'
          'Things to know: Kenji\'s first pass made his cheeks and nose redder than his base, so pass 2 put blush in the negative (the picks '
          'are from pass 2). The guard\'s neutral already looks stern, so his stern face is only a little harder. The Eric pick had no head '
          'shadow I could find on the background at full size or with the contrast raised; the cut-out has no background left. Aoi\'s base has '
          'a pale cream edge along her left side (image right), hair and jacket, that shows on the dark game background; I left it, say if it '
          'should go. Emi\'s red-rim number (14.9%) is her auburn hair edge, not a rim light. Aoi is now 597x768 like the others.'),
    media=media,
    options=options,
    links=[dict(label='Play it', href='game3d/'), dict(label='Showcase', href='bible/#showcase/cast-faces-1')],
)
media[0]['caption'] = review.pop('_note') + '\n' + media[0]['caption']
os.makedirs(os.path.join(WT, 'reviews/cast-faces-1'), exist_ok=True)
json.dump(review, open(os.path.join(WT, 'reviews/cast-faces-1/review.json'), 'w'), indent=1, ensure_ascii=False)
print(len(options), 'options')
