"""Round 2 picture step for the office man A (Review crowd-pilot-2, #232). Round 1 (crowd-pilot-1) gave him eyes that
Meshy built as loose shells floating in front of his face, and the texture smeared over them (Jørgen: "the man is
terrifying, the eyes are completely broken"). One follow-up in his round-1 chat (a-a1, a-b1, a-c1, a-d1, built as
crowd-pilot-1/gen.py builds it), attaching a-d1, that changes one thing: the eyes painted flat on the face.

Staging (shot-staging skill): the same shot as a-d1, one man, full body, standing, turned to his right (image left)
with head and body the same way, eye level, plain light background, nothing else in frame, empty hands; only his
eyes change, drawn flat on the face.

  python3 art/candidates/crowd-pilot-2/gen.py <take-id> [<picked take> ...]   (default chat: a-a1 a-b1 a-c1 a-d1)
Writes the main checkout's art/parts/crowd-pilot-2/pics/<take-id>.png and .json; logs the cost in the main checkout's
tools/spend.json (the live ledger).
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
spec = importlib.util.spec_from_file_location('r1', os.path.join(HERE, '../crowd-pilot-1/gen.py'))
r1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r1)
r2 = r1.r2
EYES = ('same character, his eyes simple and painted flat on the face, no separate or raised eye shapes, '
        'everything else the same')
DIRS = [f'{MAIN}/art/parts/crowd-pilot-2/pics', f'{MAIN}/art/parts/crowd-pilot-1/pics']


def find(take, ext):
    for d in DIRS:
        if os.path.exists(f'{d}/{take}.{ext}'):
            return f'{d}/{take}.{ext}'
    sys.exit(f'no take {take}')


def main():
    take, picked = sys.argv[1], sys.argv[2:] or ['a-a1', 'a-b1', 'a-c1', 'a-d1']
    out_dir = DIRS[0]
    os.makedirs(out_dir, exist_ok=True)
    attach = [f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
    chat = [json.load(open(find(p, 'json')))['prompt'] for p in picked] + [EYES]
    msgs = []
    for i, text in enumerate(chat):
        content = [{'type': 'text', 'text': text}]
        if i == 0:
            content += [{'type': 'image_url', 'image_url': {'url': r2.data_url(p)}} for p in attach]
        else:
            content.append({'type': 'image_url', 'image_url': {'url': r2.data_url(find(picked[i - 1], 'png'))}})
        msgs.append({'role': 'user', 'content': content})
        if i < len(chat) - 1:
            url = r2.data_url(find(picked[i], 'png'))
            msgs.append({'role': 'assistant', 'content': '', 'images': [{'type': 'image_url', 'image_url': {'url': url}}]})
    body = {'model': r2.MODEL, 'modalities': ['image', 'text'], 'messages': msgs, 'usage': {'include': True}}
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
    rel = os.path.relpath(f'{out_dir}/{take}.png', MAIN)
    rec = {'step': 'eyes', 'take': take, 'model': r2.MODEL, 'prompt': EYES, 'follows': picked, 'chat': chat,
           'attached_step1': [os.path.relpath(p, MAIN) for p in attach], 'reply_text': msg.get('content'),
           'images': len(images), 'usage': usage, 'id': res.get('id')}
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).save(f'{MAIN}/{rel}')
    json.dump(rec, open(f'{out_dir}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    r2.log_spend(cost, rel if images else '', EYES)
    print(take, 'images', len(images), 'cost', cost, 'text', (msg.get('content') or '')[:200])


if __name__ == '__main__':
    main()
