"""Kuro's chibi picture steps for reviews/kuro-meshy-orig-2, through ChatGPT's image model on OpenRouter
(openai/gpt-5.4-image-2: GPT-5.4 with GPT Image 2), as one multi-turn chat the way ChatGPT holds it.

Jørgen's words are sent as written (art/PROMPTS.md, "3D character workflow"); nothing is added. Step 1 attaches
Kuro's approved portrait, then his Mio chibi picture, as he attached Eric's portrait with the Mio chibi. Each take
of a step is the same chat sent again (ChatGPT's regenerate); the picked take becomes the assistant turn the next
step follows, so the model sees its own earlier picture.

Staging (shot-staging skill; the prompts are his, so this is what each picture is checked against): one character,
full body, standing, eye level, plain light background, nothing else in frame; for the angle step her head and body
face the same way.

  python3 art/candidates/kuro-meshy-orig-2/gen.py <step> <take-id> [<picked take of step 1> ...]
Writes the main checkout's art/parts/kuro-meshy-orig-2/pics/<take-id>.png and .json, and logs the cost in tools/spend.json.
"""
import base64, datetime, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

MAIN = '/home/jorgen/repo/japanese'
OUT = f'{MAIN}/art/parts/kuro-meshy-orig-2/pics'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
MODEL = 'openai/gpt-5.4-image-2'
ATTACH = [f'{MAIN}/game3d/assets/portraits/kuro-neutral.webp', f'{MAIN}/tools/characters/ref/mio-chibi-34.png']
STEPS = [
    'make a 3d chibi anime character in the style of the attached image',
    'Simplify female character a LOT to match the detail level of the other chibi, with open eyes',
    'Simpler head model, no glasses',
    'she should be looking to the left instead, same orientation as her body. Keep all features thick and sturdy, '
    'no fine strands or thin spikes. No text, no props, no extra subjects, no photorealism. she is looking the same '
    'orintation as her body. Flat matte texture of model',
]


def key():
    for line in open(f'{MAIN}/.env'):
        if line.startswith('OPENROUTER_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"\'')


def data_url(path):
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); im = bg
    buf = io.BytesIO(); im.convert('RGB').save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def messages(step, picked):
    # OpenRouter takes pictures on assistant turns (ChatAssistantImages) but doesn't pass them on to OpenAI (b1 and b2
    # came back with the same prompt token count as step 1), so each step's user turn also attaches the take it follows.
    msgs = []
    for i in range(step):
        content = [{'type': 'text', 'text': STEPS[i]}]
        if i == 0:
            content += [{'type': 'image_url', 'image_url': {'url': data_url(p)}} for p in ATTACH]
        else:
            content.append({'type': 'image_url', 'image_url': {'url': data_url(f'{OUT}/{picked[i - 1]}.png')}})
        msgs.append({'role': 'user', 'content': content})
        if i < step - 1:
            url = data_url(f'{OUT}/{picked[i]}.png')
            msgs.append({'role': 'assistant', 'content': '', 'images': [{'type': 'image_url', 'image_url': {'url': url}}]})
    return msgs


def log_spend(cost, out, prompt):
    path = f'{ROOT}/tools/spend.json'
    d = json.load(open(path))
    d['calls'].append({'t': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
                       'model': MODEL, 'est': round(cost, 4), 'out': out, 'prompt': prompt[:120]})
    d['total'] = round(d['total'] + cost, 4)
    with open(path, 'w') as f:
        json.dump(d, f, indent=1, ensure_ascii=False); f.write('\n')


def main():
    step, take, picked = int(sys.argv[1]), sys.argv[2], sys.argv[3:]
    assert len(picked) == step - 1, 'name the picked take of every earlier step'
    body = {'model': MODEL, 'modalities': ['image', 'text'], 'messages': messages(step, picked), 'usage': {'include': True}}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', json.dumps(body).encode(),
                                 {'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json'})
    try:
        res = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:2000]); sys.exit(1)
    msg = res['choices'][0]['message']
    usage = res.get('usage', {})
    cost = float(usage.get('cost') or 0)
    images = msg.get('images') or []
    rec = {'step': step, 'take': take, 'model': MODEL, 'prompt': STEPS[step - 1], 'follows': picked,
           'attached': [os.path.relpath(p, MAIN) for p in ATTACH], 'reply_text': msg.get('content'),
           'images': len(images), 'usage': usage, 'id': res.get('id')}
    out = f'art/parts/kuro-meshy-orig-2/pics/{take}.png'
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).save(f'{MAIN}/{out}')
    json.dump(rec, open(f'{OUT}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    log_spend(cost, out if images else '', STEPS[step - 1])
    print(take, 'images', len(images), 'cost', cost, 'text', (msg.get('content') or '')[:300])


if __name__ == '__main__':
    main()
