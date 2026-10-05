"""Concept pictures for the head office lobby rebuild (#259, review lobby-plan-1). ChatGPT's image model on OpenRouter
(openai/gpt-5.4-image-2), so the local GPU stays free. Each call attaches one screenshot of the current game (the
reception at 1366x860) as the style reference: the pictures are concepts of the look, not the game.

Staging notes (shot-staging skill):
  high: the game's own camera, high in the south looking north and down about 45 degrees, front glass and the floors
        above left out; the whole room in frame, entrance bottom left, desk ahead on the entrance line, lifts on the
        back wall right of the desk, seating islands bottom right; cool daylight from the left (west) glass.
  eye:  standing eye height just inside the doors, looking straight north along the walk to the desk; the feature
        wall fills the middle, the lift bank at the right edge, the atrium's height visible over the desk.

  python3 art/candidates/lobby-plan-1/gen.py <take-id> <high|eye> <style-ref.png>
Writes art/candidates/lobby-plan-1/<take-id>.webp and .json here; logs the cost in the main checkout's
tools/spend.json (the live ledger).
"""
import base64, datetime, io, json, os, sys, urllib.error, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
MODEL = 'openai/gpt-5.4-image-2'

STYLE = ('Concept picture for a 3D video game location, in the same flat-shaded low-poly 3D style as the attached '
         'screenshot from the game: simple geometric shapes, flat matte colours, soft even light, crisp edges, no '
         'textures, no painterly brushwork, no outlines. ')
ROOM = ('The room is the ground-floor reception of a large corporate head office: a double-height marble and glass '
        'atrium, about twice as tall and twice as wide as the small lobby in the screenshot. A wide pale marble floor '
        'with a faint square grid, and dark grey granite walkway bands: one straight from the glass entrance doors to '
        'the reception desk, one branching right to the lifts. A long light oak reception desk with a pale stone '
        'front, standing in front of a tall pale stone feature wall with large brushed steel letters AMAKAWA and a '
        'smaller sign 受付 RECEPTION. One receptionist stands behind the middle of the desk, facing the entrance. '
        'On the back wall to the right of the desk, a row of four brushed steel lift doors set in the stone wall, a '
        'small floor display over each. Two seating islands in the right half: round stone planters with small trees, '
        'low curved slate-blue benches around them. Tall potted plants beside the lifts. Cool daylight through tall '
        'glass walls, soft shadows. A few small chibi office workers like the ones in the screenshot. Palette: '
        'cream-white marble, cool grey granite, slate blue, light oak, green plants, brushed steel. No other text.')
SHOTS = {
    'high': 'Camera high in front of the room, looking down at about 45 degrees into it, like the attached game view; '
            'the front glass wall and the floors above are left out so the whole floor is visible, entrance doors at '
            'the bottom left, the desk straight ahead of them, the lifts on the back wall to the right. ',
    'eye': 'Camera at standing eye height just inside the entrance doors, looking straight ahead along the granite '
           'walkway to the reception desk; the feature wall rises high above the desk, the lift doors at the right '
           'edge of the frame, the tall glass wall at the left. ',
}


def key():
    for line in open(f'{MAIN}/.env'):
        if line.startswith('OPENROUTER_API_KEY='):
            return line.split('=', 1)[1].strip().strip('"\'')


def data_url(path):
    buf = io.BytesIO()
    Image.open(path).convert('RGB').save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def log_spend(cost, out, prompt):
    path = f'{MAIN}/tools/spend.json'
    d = json.load(open(path))
    d['calls'].append({'t': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds')
                       .replace('+00:00', 'Z'), 'model': MODEL, 'est': round(cost, 4), 'out': out,
                       'prompt': prompt[:120]})
    d['total'] = round(d['total'] + cost, 4)
    with open(path, 'w') as f:
        json.dump(d, f, indent=1, ensure_ascii=False)
        f.write('\n')


def main():
    take, shot, ref = sys.argv[1], sys.argv[2], sys.argv[3]
    prompt = STYLE + SHOTS[shot] + ROOM
    content = [{'type': 'text', 'text': prompt}, {'type': 'image_url', 'image_url': {'url': data_url(ref)}}]
    body = {'model': MODEL, 'modalities': ['image', 'text'], 'messages': [{'role': 'user', 'content': content}],
            'usage': {'include': True}}
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
    rel = os.path.relpath(f'{HERE}/{take}.webp', os.path.join(HERE, '../../..'))
    if images:
        raw = base64.b64decode(images[0]['image_url']['url'].split(',', 1)[1])
        Image.open(io.BytesIO(raw)).convert('RGB').save(f'{HERE}/{take}.webp', quality=90)
    json.dump({'take': take, 'shot': shot, 'model': MODEL, 'prompt': prompt, 'style_ref': 'current game, reception '
               '1366x860 (place-shots)', 'images': len(images), 'usage': usage, 'reply_text': msg.get('content')},
              open(f'{HERE}/{take}.json', 'w'), indent=1, ensure_ascii=False)
    log_spend(cost, rel if images else '', prompt)
    print(take, shot, 'images', len(images), 'cost', cost)


if __name__ == '__main__':
    main()
