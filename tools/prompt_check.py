"""Check shot prompts against what each shot shows, before rendering (Jørgen, 2026-10-09: "You must ONLY describe what
is directly shown in the desired shot").

    python3 tools/prompt_check.py staging.json prompts.json

staging.json: {"<shot>": {"people": ["mio", "eric"], "faces": ["mio"]}, ...}: the cast ids in frame, and whose face
is in frame. prompts.json: {"<shot>": "<positive prompt>", ...} or a list of {"shot": ..., "positive": ...}.
Fails (exit 1) when a prompt names or describes someone who isn't in frame, or describes the face, hair, eyes or
glasses of someone whose face isn't in frame. Looks are read from art/cast-looks.json (tools/cast_looks.py)."""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cast_looks  # noqa: E402

FACE_WORDS = ('face', 'eyes', 'eyebrows', 'glasses', 'bangs', 'lips', 'smile', 'blush', 'looking at viewer', 'expression')


def phrases(text):
    """The distinctive chunks of a look field, split on commas and 'with'/'and', for matching in a prompt."""
    return [p.strip().lower() for p in re.split(r',|\bwith\b|\band\b|\bin a\b|\bshowing\b', text or '') if len(p.strip()) > 6]


def check(staging, prompts):
    problems = []
    cast = cast_looks.load()
    for shot, text in prompts.items():
        frame = staging.get(shot)
        if frame is None:
            problems.append(f'{shot}: no staging entry (write its In frame list first)')
            continue
        low = text.lower()
        people, faces = set(frame.get('people', [])), set(frame.get('faces', []))
        for cid, c in cast.items():
            head = phrases(c.get('hair')) + phrases(c.get('eyes')) + phrases(c.get('glasses'))
            named = re.search(rf'\b{re.escape(c["name"].lower())}\b', low)
            if cid not in people:
                if named:
                    problems.append(f'{shot}: names {c["name"]}, who is not in frame')
                continue
            if cid not in faces:
                hits = [p for p in head if p in low]
                if hits:
                    problems.append(f'{shot}: {c["name"]}\'s face is out of frame, but the prompt describes it: {hits[:3]}')
        if not faces and any(re.search(rf'\b{w}\b', low) for w in FACE_WORDS):
            problems.append(f'{shot}: no face in frame, but face words are in the prompt')
    return problems


def main():
    staging = json.load(open(sys.argv[1]))
    raw = json.load(open(sys.argv[2]))
    prompts = raw if isinstance(raw, dict) else {p['shot']: p['positive'] for p in raw}
    problems = check(staging, prompts)
    for p in problems:
        print('FAIL', p)
    print(f'{len(prompts)} prompts checked, {len(problems)} problems')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
