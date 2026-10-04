"""Kuro's head-size edit for reviews/kuro-meshy-orig-3: one short follow-up in the same ChatGPT image-model chat as
round 2 (openai/gpt-5.4-image-2 on OpenRouter), after its picked takes a1, b5, c3, d2. Round 2's gen.py builds the
chat (its words, its attachments); this adds one user turn that attaches d2 and says only EDIT. Each take is the same
chat sent again (ChatGPT's regenerate).

Staging (shot-staging skill): the same shot as d2, one character, full body, standing, eye level, plain light
background, nothing else in frame; only her head is smaller against her body.

  python3 art/candidates/kuro-meshy-orig-3/gen.py <take-id>
Writes the main checkout's art/parts/kuro-meshy-orig-3/pics/<take-id>.png and .json, and logs the cost in the main
checkout's tools/spend.json.
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
OUT = f'{MAIN}/art/parts/kuro-meshy-orig-3/pics'
EDIT = 'make her head a little smaller relative to her body, everything else the same'
PICKED = ['a1', 'b5', 'c3', 'd2']

spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kuro-meshy-orig-2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
r2.STEPS = r2.STEPS + [EDIT]
r2.ROOT = MAIN                     # spend goes to the main checkout's live ledger, as in round 2


def main():
    take = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    body = {'model': r2.MODEL, 'modalities': ['image', 'text'], 'messages': r2.messages(5, PICKED),
            'usage': {'include': True}}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', json.dumps(body).encode(),
                                 {'Authorization': f'Bearer {r2.key()}', 'Content-Type': 'application/json'})
    try:
        res = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:2000]); sys.exit(1)
    msg = res['choices'][0]['message']
    usage = res.get('usage', {})
    cost = float(usage.get('cost') or 0)
    images = msg.get('images') or []
    out = f'art/parts/kuro-meshy-orig-3/pics/{take}.png'
    rec = {'take': take, 'model': r2.MODEL, 'prompt': EDIT, 'follows': PICKED,
           'chat': r2.STEPS, 'attached_step1': [os.path.relpath(p, MAIN) for p in r2.ATTACH],
           'attached_last': 'art/parts/kuro-meshy-orig-2/pics/d2.png', 'reply_text': msg.get('content'),
           'images': len(images), 'usage': usage, 'id': res.get('id')}
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).save(f'{MAIN}/{out}')
    json.dump(rec, open(f'{OUT}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    r2.log_spend(cost, out if images else '', EDIT)
    print(take, 'images', len(images), 'cost', cost, 'prompt tokens', usage.get('prompt_tokens'),
          'text', (msg.get('content') or '')[:300])


if __name__ == '__main__':
    main()
