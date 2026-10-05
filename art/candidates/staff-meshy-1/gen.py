"""The chibi picture steps for the staff still built in code (Reviews <id>-meshy-1: mori, kenji, guard, kuroda, rei),
by Kuro's, Aoi's and Emi's approved process (art/PROMPTS.md, "3D character workflow"; Jørgen: "can you also kick off
the remaining staff and background characters in the new style"). ChatGPT's image model on OpenRouter
(openai/gpt-5.4-image-2), one chat per person, built as kuro-meshy-orig-2/gen.py's messages() builds it: step 1
attaches the approved portrait and his Mio chibi, each later user turn also attaches the take it follows. His words as
written; "male" in step 2 for the men and "he"/"his" in the angle prompt, the words otherwise unchanged; step 3 names
what that person wears that Meshy would garble (the props rule). Each take is the same chat sent again (ChatGPT's
regenerate).

Staging (shot-staging skill; the prompts are his, so this is what each picture is checked against): one person, full
body, standing, eye level, plain light background, nothing else in frame; for the angle step head and body face the
same way.

  python3 art/candidates/staff-meshy-1/gen.py <id> <take-id> <step: s1|s2|s3|angle|head|chubby> [<picked take> ...]
The picked takes are the chat so far, in order; each one's own .json says which step it answered.
Writes the main checkout's art/parts/<id>-meshy-1/pics/<take-id>.png and .json and logs the cost in the main
checkout's tools/spend.json.
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
WOMEN = {'rei'}
PROPS = {'mori': '', 'kenji': ', no lanyard, no badge', 'guard': ', no glasses, no name plate, no shoulder patch',
         'kuroda': '', 'rei': ', no earrings'}

spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kuro-meshy-orig-2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
r2.ROOT = MAIN                     # spend goes to the main checkout's live ledger, as in the earlier rounds


def prompts(cid):
    she = cid in WOMEN
    angle = r2.STEPS[3] if she else (r2.STEPS[3].replace('she should', 'he should').replace('she is', 'he is')
                                     .replace('her body', 'his body'))
    return {'s1': r2.STEPS[0],
            's2': r2.STEPS[1] if she else r2.STEPS[1].replace('female', 'male'),
            's3': 'Simpler head model' + PROPS[cid],
            'angle': angle,
            # Jørgen on kenji-1 (2026-10-05: "he is too slim, doesnt look like himself"), his words for round 2
            'chubby': 'make him rounder and chubbier like in the portrait, everything else the same',
            'head': 'make her head a little smaller relative to her body, everything else the same' if she else
                    'make his head a little smaller relative to his body, everything else the same'}


def main():
    cid, take, step, picked = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
    P = prompts(cid)
    rel = f'art/parts/{cid}-meshy-1/pics'
    out_dir = f'{MAIN}/{rel}'
    os.makedirs(out_dir, exist_ok=True)
    attach = [f'{MAIN}/game3d/assets/portraits/{cid}-neutral.webp', f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
    chat = [json.load(open(f'{out_dir}/{p}.json'))['prompt'] for p in picked] + [P[step]]
    msgs = []
    for i, text in enumerate(chat):
        content = [{'type': 'text', 'text': text}]
        if i == 0:
            content += [{'type': 'image_url', 'image_url': {'url': r2.data_url(p)}} for p in attach]
        else:
            content.append({'type': 'image_url', 'image_url': {'url': r2.data_url(f'{out_dir}/{picked[i - 1]}.png')}})
        msgs.append({'role': 'user', 'content': content})
        if i < len(chat) - 1:
            url = r2.data_url(f'{out_dir}/{picked[i]}.png')
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
    out = f'{rel}/{take}.png'
    rec = {'step': step, 'take': take, 'model': r2.MODEL, 'prompt': P[step], 'follows': picked, 'chat': chat,
           'attached_step1': [os.path.relpath(p, MAIN) for p in attach], 'reply_text': msg.get('content'),
           'images': len(images), 'usage': usage, 'id': res.get('id')}
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).save(f'{MAIN}/{out}')
    json.dump(rec, open(f'{out_dir}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    r2.log_spend(cost, out if images else '', P[step])
    print(cid, take, step, 'images', len(images), 'cost', cost, 'text', (msg.get('content') or '')[:200])


if __name__ == '__main__':
    main()
