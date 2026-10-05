"""Round 2 picture steps for reviews/aoi-meshy-1 and emi-meshy-1, in each character's round-1 ChatGPT chat
(openai/gpt-5.4-image-2 on OpenRouter, built by kuro-meshy-orig-2/gen.py's messages()). Jørgen's words, as written:
  Aoi: "her face is a tiny bit too large and her hands are larger than the others. but it is very very close id say"
       -> after her picked a1, b1, c2, Kuro's follow-up "make her head a little smaller relative to her body,
          everything else the same" (attaching c2).
  Emi: "looking good, but for some discoloration, and the lanyard which becomes mangled. we should remove props when
       making the models." -> her step 3 again, as "Simpler head model, no glasses, no lanyard" (props off, the
       new rule in art/PROMPTS.md), after her picked a2, b1.
Each take is the same chat sent again (ChatGPT's regenerate).

Staging (shot-staging skill; the prompts are his, so this is what each picture is checked against): the same shot as
the picture it follows: one character, full body, standing, eye level, plain light background, nothing else in frame;
Aoi: only her head is smaller against her body; Emi: no glasses, no lanyard or badge, the rest as b1.

  python3 art/candidates/aoi-emi-meshy-2/gen.py <aoi|emi> <take-id>
Writes the main checkout's art/parts/<char>-meshy-1/pics/<take-id>.png and .json (next to round 1's takes, which the
chat reads back), and logs the cost in the main checkout's tools/spend.json.
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
HEAD = 'make her head a little smaller relative to her body, everything else the same'
CHAT = {'aoi': (['Simpler head model', HEAD], ['a1', 'b1', 'c2']),
        'emi': (['Simpler head model, no glasses, no lanyard'], ['a2', 'b1'])}

spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kuro-meshy-orig-2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
r2.ROOT = MAIN                     # spend goes to the main checkout's live ledger, as in round 1


def main():
    char, take = sys.argv[1], sys.argv[2]
    later, picked = CHAT[char]
    rel = f'art/parts/{char}-meshy-1/pics'
    r2.OUT = f'{MAIN}/{rel}'
    r2.ATTACH = [f'{MAIN}/game3d/assets/portraits/{char}-neutral.webp', f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
    r2.STEPS = r2.STEPS[:2] + later
    step = len(picked) + 1
    body = {'model': r2.MODEL, 'modalities': ['image', 'text'], 'messages': r2.messages(step, picked),
            'usage': {'include': True}}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', json.dumps(body).encode(),
                                 {'Authorization': f'Bearer {r2.key()}', 'Content-Type': 'application/json'})
    try:
        res = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:2000]); sys.exit(1)
    if 'choices' not in res:
        print('NO CHOICES', json.dumps(res)[:2000]); sys.exit(1)
    msg = res['choices'][0]['message']
    usage = res.get('usage', {})
    cost = float(usage.get('cost') or 0)
    images = msg.get('images') or []
    out = f'{rel}/{take}.png'
    rec = {'round': 2, 'step': step, 'take': take, 'model': r2.MODEL, 'prompt': r2.STEPS[step - 1], 'follows': picked,
           'chat': r2.STEPS[:step], 'attached_step1': [os.path.relpath(p, MAIN) for p in r2.ATTACH],
           'reply_text': msg.get('content'), 'images': len(images), 'usage': usage, 'id': res.get('id')}
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).save(f'{MAIN}/{out}')
    json.dump(rec, open(f'{r2.OUT}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    r2.log_spend(cost, out if images else '', r2.STEPS[step - 1])
    print(char, take, 'images', len(images), 'cost', cost, 'text', (msg.get('content') or '')[:300])


if __name__ == '__main__':
    main()
