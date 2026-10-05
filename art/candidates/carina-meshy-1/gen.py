"""Carina's picture steps for reviews/carina-meshy-1, by the approved 3D character workflow (art/PROMPTS.md, "3D
character workflow"): ChatGPT's image model on OpenRouter (openai/gpt-5.4-image-2), one chat, built as
kuro-meshy-orig-2/gen.py's messages() builds it. Step 1 attaches her picture and his Mio chibi; each later user turn
also attaches the take it follows. His words as written. Each take is the same chat sent again (ChatGPT's regenerate).

Two sources, in the order made:
  r6 (takes a1..d1): round 6 tile 3, before her face was approved (Jørgen: "3. hair 2, roots + stripes pretty good",
     and of round 6's eyes "she looks unhinged"). Step 3 named the chain lanyard and badge (the props rule) and a calm
     expression; a follow-up brought back the dark roots step 3 had dropped.
  r9 (takes n*, the default): his own approved render, art/candidates/portraits/carina-9-jorgen (Jørgen: "yes this is
     carina"). Step 3 names only what Meshy would garble: her ear ring and brow piercings.

Staging (shot-staging skill; the prompts are his, so this is what each picture is checked against): one woman, full
body, standing, eye level, plain light background, nothing else in frame; for the angle step head and body face the
same way.

  SRC=r6|r9 python3 art/candidates/carina-meshy-1/gen.py <take-id> <step: s1|s2|s3|angle|roots> [<picked take> ...]
Writes the main checkout's art/parts/carina-meshy-1/pics/<take-id>.png and .json and logs the cost in the main
checkout's tools/spend.json.
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kuro-meshy-orig-2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
r2.ROOT = MAIN
SRC = os.environ.get('SRC', 'r9')
P = {'s1': r2.STEPS[0], 's2': r2.STEPS[1], 'angle': r2.STEPS[3],
     's3': {'r6': 'Simpler head model, calm relaxed expression, no lanyard, no badge',
            'r9': 'Simpler head model, no piercings'}[SRC],
     # r6: step 3 dropped the hair he picked on round 6 ("roots + stripes pretty good"); one follow-up in the shape
     # of Kenji's ("... like in the portrait, everything else the same")
     'roots': 'give her hair the dark roots and a few dark stripes like in the portrait, everything else the same'}
PIC = {'r6': 'art/candidates/portraits/carina-6/carina6-03-final.webp',
       'r9': 'art/candidates/portraits/carina-9-jorgen/jorgen-r261005-203349-2fd-1.webp'}[SRC]
ATTACH = [f'{MAIN}/{PIC}', f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
REL = 'art/parts/carina-meshy-1/pics'


def main():
    take, step, picked = sys.argv[1], sys.argv[2], sys.argv[3:]
    out_dir = f'{MAIN}/{REL}'
    os.makedirs(out_dir, exist_ok=True)
    chat = [json.load(open(f'{out_dir}/{p}.json'))['prompt'] for p in picked] + [P[step]]
    msgs = []
    for i, text in enumerate(chat):
        content = [{'type': 'text', 'text': text}]
        if i == 0:
            content += [{'type': 'image_url', 'image_url': {'url': r2.data_url(p)}} for p in ATTACH]
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
    out = f'{REL}/{take}.png'
    rec = {'source': SRC, 'step': step, 'take': take, 'model': r2.MODEL, 'prompt': P[step], 'follows': picked, 'chat': chat,
           'attached_step1': [os.path.relpath(p, MAIN) for p in ATTACH], 'reply_text': msg.get('content'),
           'images': len(images), 'usage': usage, 'id': res.get('id')}
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).save(f'{MAIN}/{out}')
    json.dump(rec, open(f'{out_dir}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    r2.log_spend(cost, out if images else '', P[step])
    print(take, step, 'images', len(images), 'cost', cost, 'text', (msg.get('content') or '')[:200])


if __name__ == '__main__':
    main()
