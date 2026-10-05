"""The chibi picture steps for the crowd pilot (Review crowd-pilot-1, #232): archetype A, an office man, and B, an
office woman (notes/people-plan.md). Jørgen's process as written (art/PROMPTS.md, "3D character workflow"), one chat
per person in ChatGPT's image model on OpenRouter (openai/gpt-5.4-image-2), built as staff-meshy-1/gen.py builds it.

These people have no portrait, so step 1 attaches only his Mio chibi (tools/characters/ref/mio-chibi-34.png) and adds
one sentence naming who to draw (the plan's archetype line, which he approved: "1: 7"). The other steps are his
words: "male"/"female" in step 2, "he"/"his" in the angle prompt for the man; step 3 names nothing to remove unless a
take has something Meshy would garble.

Staging (shot-staging skill; checked against every take): one adult, full body, standing, eye level, plain light
background, nothing else in frame, empty hands, no bag; in the angle step head and body face the same way.

  python3 art/candidates/crowd-pilot-1/gen.py <a|b> <take-id> <step: s1|s2|s3|angle|head> [<picked take> ...]
Writes the main checkout's art/parts/crowd-pilot-1/pics/<take-id>.png and .json; logs the cost in the main checkout's
tools/spend.json (the live ledger, as the earlier rounds).
"""
import base64, importlib.util, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kuro-meshy-orig-2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
r2.ROOT = MAIN

WHO = {
    'a': ('male', 'The character: an office man in his thirties with short dark brown hair, a plain mid-grey suit, '
                  'white shirt and dark tie, black shoes, average build, empty hands.'),
    'b': ('female', 'The character: an office woman in her thirties with dark brown hair in a low bun, a navy blazer '
                    'and knee-length navy skirt, white blouse, dark flat shoes, empty hands.'),
}


def prompts(cid):
    sex, who = WHO[cid]
    he = sex == 'male'
    angle = r2.STEPS[3]
    if he:
        angle = angle.replace('she should', 'he should').replace('she is', 'he is').replace('her body', 'his body')
    return {'s1': r2.STEPS[0] + '. ' + who,
            's2': r2.STEPS[1].replace('female', sex),
            's3': 'Simpler head model',
            'angle': angle,
            'head': f'make {"his" if he else "her"} head a little smaller relative to {"his" if he else "her"} body, '
                    'everything else the same'}


def main():
    cid, take, step, picked = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
    P = prompts(cid)
    rel = 'art/parts/crowd-pilot-1/pics'
    out_dir = f'{MAIN}/{rel}'
    os.makedirs(out_dir, exist_ok=True)
    attach = [f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
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
