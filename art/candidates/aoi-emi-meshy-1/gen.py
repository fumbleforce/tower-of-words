"""Aoi's and Emi's chibi picture steps for reviews/aoi-meshy-1 and reviews/emi-meshy-1: Kuro's approved process
(art/PROMPTS.md, "3D character workflow"; Jørgen on kuro-meshy-orig-3: "Now lets use this approach for aoi and emi
as well"). ChatGPT's image model on OpenRouter (openai/gpt-5.4-image-2), one multi-turn chat per character, built by
round 2's messages() (kuro-meshy-orig-2/gen.py): step 1 attaches her approved portrait and his Mio chibi, each later
step attaches the take it follows. His words as written; step 3 names only what that character needs removed
(Emi: "no glasses", as with Kuro; Aoi: nothing). Step 5, only if the head is too big against Eric and Mio, is Kuro's
one follow-up. Each take is the same chat sent again (ChatGPT's regenerate).

Staging (shot-staging skill; the prompts are his, so this is what each picture is checked against): one character,
full body, standing, eye level, plain light background, nothing else in frame; for the angle step her head and body
face the same way.

  python3 art/candidates/aoi-emi-meshy-1/gen.py <aoi|emi> <take-id> [<picked take of each earlier step> ...]
Writes the main checkout's art/parts/<char>-meshy-1/pics/<take-id>.png and .json, and logs the cost in the main
checkout's tools/spend.json.
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
STEP3 = {'aoi': 'Simpler head model', 'emi': 'Simpler head model, no glasses'}
HEAD = 'make her head a little smaller relative to her body, everything else the same'

spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kuro-meshy-orig-2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
r2.ROOT = MAIN                     # spend goes to the main checkout's live ledger, as in Kuro's rounds


def main():
    char, take, picked = sys.argv[1], sys.argv[2], sys.argv[3:]
    rel = f'art/parts/{char}-meshy-1/pics'
    r2.OUT = f'{MAIN}/{rel}'
    os.makedirs(r2.OUT, exist_ok=True)
    r2.ATTACH = [f'{MAIN}/game3d/assets/portraits/{char}-neutral.webp', f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
    r2.STEPS = [r2.STEPS[0], r2.STEPS[1], STEP3[char], r2.STEPS[3], HEAD]
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
    rec = {'step': step, 'take': take, 'model': r2.MODEL, 'prompt': r2.STEPS[step - 1], 'follows': picked,
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
