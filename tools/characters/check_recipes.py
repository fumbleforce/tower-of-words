"""Every 3D body the game loads has a recipe (art/MESHY.md). Each folder under game3d/assets/characters/, and
game3d/assets/eric/ (Eric's body, the one cast folder outside it), has exactly one tools/characters/recipes/<id>.json
whose "folder" is that folder and whose "id" is the file's name.

A recipe names its Review: "review" is an id under reviews/, or null with a note that starts "approved before
reviews". A Review removed later (the chibi look) names the commit that removed it in "review_removed".
Every null is explained: a top-level or meshy null has a reason under "unknown" (keyed by the field path), and a null
setting inside a step needs that step's own "unknown" text. A reason with no null behind it fails too. Meshy task ids
must be well formed.

  python3 tools/characters/check_recipes.py        (run by npm run check)
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECIPES = os.path.join(ROOT, 'tools/characters/recipes')
CHARACTERS = 'game3d/assets/characters'
EXTRA_FOLDERS = ['game3d/assets/eric']
TASK = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
APPROVED_BEFORE = 'approved before reviews'


def folders():
    base = os.path.join(ROOT, CHARACTERS)
    names = sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)))
    return [f'{CHARACTERS}/{d}' for d in names] + EXTRA_FOLDERS


def tasks_in(value):
    """Every string under a key named 'task' or 'meshy' (ids), at any depth."""
    if isinstance(value, dict):
        for k, v in value.items():
            if k in ('task', 'shape', 'texture', 'rig', 'anim-sit') and isinstance(v, str):
                yield v
            else:
                yield from tasks_in(v)
    elif isinstance(value, list):
        for v in value:
            yield from tasks_in(v)


def check_recipe(rid, d, problems):
    """Returns the number of unknown fields in this recipe (top level, meshy and steps)."""
    unknown = d.get('unknown', {})
    if not isinstance(unknown, dict):
        problems.append(f'{rid}: "unknown" must be an object keyed by field path')
        unknown = {}
    nulls = set()
    for key in ('round', 'source'):
        if d.get(key) is None:
            nulls.add(key)
    for key, value in (d.get('meshy') or {}).items():
        if value is None:
            nulls.add('meshy.' + key)
    for key in nulls:
        if not isinstance(unknown.get(key), str) or not unknown.get(key).strip():
            problems.append(f'{rid}: null "{key}" has no reason under "unknown"')
    for key in unknown:
        if key not in nulls:
            problems.append(f'{rid}: "unknown" gives a reason for "{key}", which is not null')
    step_nulls = 0
    for i, st in enumerate(d.get('steps') or []):
        if not isinstance(st, dict) or not isinstance(st.get('step'), str):
            problems.append(f'{rid}: steps[{i}] has no step name')
            continue
        here = [k for k, v in st.items() if k != 'step' and v is None]
        step_nulls += len(here)
        if here and not (isinstance(st.get('unknown'), str) and st['unknown'].strip()):
            problems.append(f'{rid}: steps[{i}] ({st["step"]}) has null {here} with no "unknown" text')
    review = d.get('review')
    if review is None:
        if not str(d.get('note', '')).startswith(APPROVED_BEFORE):
            problems.append(f'{rid}: review is null but the note does not start "{APPROVED_BEFORE}"')
    elif isinstance(review, str):
        if not d.get('review_removed') and not os.path.isfile(os.path.join(ROOT, 'reviews', review, 'review.json')):
            problems.append(f'{rid}: review "{review}" is not in reviews/ and no review_removed commit is given')
    else:
        problems.append(f'{rid}: review must be an id or null')
    for task in tasks_in(d):
        if not TASK.match(task):
            problems.append(f'{rid}: "{task}" is not a Meshy task id')
    return len(nulls) + step_nulls


def main():
    problems = []
    recipes = {}
    for path in sorted(glob.glob(os.path.join(RECIPES, '*.json'))):
        rid = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, encoding='utf-8') as f:
                recipes[rid] = json.load(f)
        except ValueError as e:
            problems.append(f'{rid}: not valid JSON ({e})')
    by_folder = {}
    unknown_fields = 0
    for rid, d in recipes.items():
        if d.get('id') != rid:
            problems.append(f'{rid}: "id" is {d.get("id")!r}, but the file is {rid}.json')
        folder = d.get('folder')
        if not isinstance(folder, str) or not os.path.isdir(os.path.join(ROOT, folder)):
            problems.append(f'{rid}: "folder" {folder!r} is not a folder in the repo')
            continue
        by_folder.setdefault(folder, []).append(rid)
        unknown_fields += check_recipe(rid, d, problems)
    wanted = folders()
    for folder in wanted:
        owners = by_folder.get(folder, [])
        if not owners:
            problems.append(f'{folder}: no recipe in tools/characters/recipes/ (add <id>.json with "folder": "{folder}")')
        elif len(owners) > 1:
            problems.append(f'{folder}: more than one recipe ({", ".join(sorted(owners))})')
    for folder, owners in by_folder.items():
        if folder not in wanted:
            problems.append(f'{", ".join(owners)}: folder {folder} is not a loaded body (remove the recipe or add the folder here)')
    if problems:
        for p in problems:
            print('  ' + p)
        print(f'character recipes: {len(problems)} problem(s) across {len(wanted)} bodies')
        return 1
    print(f'character recipes: {len(wanted)} bodies, {len(recipes)} recipes, {unknown_fields} unknown fields')
    return 0


if __name__ == '__main__':
    sys.exit(main())
