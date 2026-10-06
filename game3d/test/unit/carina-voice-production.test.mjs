import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// Run the production guard and word classifier without loading Whisper or CUDA.
test('Carina takes use the standard female drift guard and every Japanese word receives native checks', () => {
  const result = execFileSync('python3', ['-c', `
import ast, json
scope = {'FEMALE': {'mio', 'carina', 'aoi'}}
for path, name in [('tools/island_audio/check.py', 'pitch_ok'), ('tools/voice/check_takes.py', 'word')]:
    tree = ast.parse(open(path).read())
    node = next(n for n in tree.body if (isinstance(n, ast.FunctionDef) and n.name == name) or (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in n.targets)))
    exec(compile(ast.Module(body=[node], type_ignores=[]), path, 'exec'), scope)
p = scope['pitch_ok']; w = scope['word']
assert not p('carina', 184, 0.05)
assert p('carina', 185, 0.25)
assert not p('carina', 184.9, 0.25)
assert not p('carina', 210, 0.251)
assert p('carina', 185.8, 0.069)
assert not p('mio', 189.9, 0.10)
assert not p('mio', 210, 0.101)
assert p('mio', 190, 0.10)
assert p('mio', 200, 0.08)
assert p('eric', 150, 0.8)
assert all(w(k) for k in ['carina-matte', 'carina-tomatte', 'carina-ohayo', 'word-matte', 'eric-matte', 'ln-example-carina~1'])
assert not w('ln-example-carina')
print('passed')
`], { encoding: 'utf8' });
  assert.equal(result.trim(), 'passed');
});

test('Carina uses the exact approved reference and owns both word and line keys', () => {
  const mc = JSON.parse(fs.readFileSync('game3d/data/mc/carina.json', 'utf8'));
  assert.equal(mc.voice.ref, 'tools/voice-refs/carina-voice-a.wav');
  assert.equal(mc.voice.lines, 'carina');
  assert.equal(mc.voice.words, 'carina');
  assert.deepEqual(mc.placeholders, []);
});
