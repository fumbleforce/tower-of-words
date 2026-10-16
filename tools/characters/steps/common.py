"""What every step shares: the paths of one build, the record (the recipe), Blender under the GPU lock, and the
texture inside a GLB. Run through tools/characters/build.py, never on its own."""
import hashlib, io, json, os, shutil, struct, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]          # outputs and the Meshy caches live in the main checkout
for p in ('tools', 'tools/characters'):                 # gpu_priority, meshy (the API client)
    sys.path.insert(0, os.path.join(ROOT, p))


class Ctx:
    """One build: the recipe, its folders and the files the steps hand on.

    files: 'shape', 'uv', 'texture', 'rigged' (the model the clips belong to), 'clips' {walk, run, sit}, 'skin' (the
    texture picture the game uses), set by the step that made each. Folders, under the main checkout's
    art/candidates/<round>/<id>/: src (the source picture), meshy (Meshy's own files and task records), build (ours;
    build/game/ is laid out as game3d/assets/characters/)."""

    def __init__(self, recipe_path, spend=False, only=None):
        self.recipe_path = recipe_path
        self.recipe = json.load(open(recipe_path))
        self.id = self.recipe['id']
        self.round = self.recipe['round']
        base = os.path.join(MAIN, 'art/candidates', self.round, self.id)
        self.dirs = {k: os.path.join(base, k) for k in ('src', 'meshy', 'build')}
        self.dirs['game'] = os.path.join(self.dirs['build'], 'game')
        for d in self.dirs.values():
            os.makedirs(d, exist_ok=True)
        self.files = {'clips': {}}
        self.spend = spend
        self.only = only
        self.flags = []

    def path(self, kind, name):
        return os.path.join(self.dirs[kind], name)

    def save_recipe(self):
        tmp = self.recipe_path + '.tmp'
        with open(tmp, 'w') as f:
            f.write(dumps(self.recipe) + '\n')
        os.replace(tmp, self.recipe_path)

    def flag(self, text):
        """Something a person must see on the model's Review (the sheets step puts it there)."""
        print('FLAG', text, flush=True)
        self.flags.append(text)
        json.dump(self.flags, open(self.path('build', 'flags.json'), 'w'), indent=1)


def dumps(v, ind=0):
    """JSON as the recipes are written by hand: one line for anything short, nested blocks indented by one."""
    one = json.dumps(v, ensure_ascii=False)
    if not isinstance(v, (dict, list)) or len(one) + ind < 110:
        return one
    pad = ' ' * (ind + 1)
    if isinstance(v, dict):
        body = [f'{pad}{json.dumps(k, ensure_ascii=False)}: {dumps(x, ind + 1)}' for k, x in v.items()]
        return '{\n' + ',\n'.join(body) + '\n' + ' ' * ind + '}'
    return '[\n' + ',\n'.join(pad + dumps(x, ind + 1) for x in v) + '\n' + ' ' * ind + ']'


def rel(p):
    return os.path.relpath(os.path.realpath(p), MAIN)


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def run(cmd, **kw):
    print('$', ' '.join(str(c) for c in cmd), flush=True)
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if r.returncode:
        sys.exit(f'failed ({r.returncode}): {cmd[0]}\n{r.stdout[-3000:]}\n{r.stderr[-3000:]}')
    return r.stdout


def blender(script, args, name='character-build'):
    """Blender in the background, holding the GPU lock (notes/tools/gpu.md). Returns its output."""
    import gpu_priority
    with gpu_priority.hold(name, 'render'):
        return run(['blender', '-b', '--python-exit-code', '1', '-P', script, '--', *args])


def glb_texture(path):
    """The first picture embedded in a GLB, as a PIL image (RGB)."""
    from PIL import Image
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    blob = b[28 + n:]
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    return Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')


def copy_in(src, dst):
    """A cached file into the build (a legacy round's Meshy output): copied once, never over a newer one."""
    if os.path.exists(dst):
        return False
    shutil.copy2(src, dst)
    return True
