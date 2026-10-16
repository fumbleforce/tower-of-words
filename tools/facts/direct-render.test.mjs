// direct-render.mjs: what counts as a still-picture call, and which counts fail the check (#603).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stillCalls, checkRender } from './direct-render.mjs';

function verdict(counts, base) {
  const bad = [], notes = [];
  checkRender(counts, base, (where, msg) => bad.push([where, msg]), (msg) => notes.push(msg));
  return { bad, notes };
}

test('still calls on code lines: comfy.run and the still builders', () => {
  assert.equal(stillCalls('wf = comfy.anima(p, n)\ncomfy.run(wf, out)\n', 'a.py'), 2);
  assert.equal(stillCalls('wf = comfy.sdxl_refine(img, p, n, ck)\ncomfy.run(wf, out)\n', 'a.py'), 2);
});

test('video, audio and raw submissions are not still calls', () => {
  const text = 'comfy.run_video(wf, out, 24)\nwf = comfy.wan22_i2v(img, p)\ncomfy._post("/prompt", {})\n';
  assert.equal(stillCalls(text, 'video.py'), 0);
});

test('comments and Python docstrings do not count', () => {
  assert.equal(stillCalls('# comfy.run(wf, out)\n', 'a.py'), 0);
  assert.equal(stillCalls('"""Renders with comfy.run(wf, out)\nand comfy.anima(p, n)."""\nx = 1\n', 'a.py'), 0);
  assert.equal(stillCalls('// comfy.run(wf, out)\n', 'a.mjs'), 0);
});

test('an alias of the module, or a name imported from it, counts; other .run() calls do not', () => {
  assert.equal(stillCalls('import comfy as c\nc.run(wf, out)\n', 'a.py'), 1);
  assert.equal(stillCalls('from comfy import run as go, anima\ngo(wf, out)\nwf = anima(p, n)\n', 'a.py'), 2);
  assert.equal(stillCalls('subprocess.run(["x"])\nother.run(wf)\n', 'a.py'), 0);
});

test('a parenthesized or backslash-continued import of a still function counts its calls', () => {
  assert.equal(stillCalls('from comfy import (\n    run,\n    anima,\n)\nwf = anima(p, n)\nrun(wf, out)\n', 'a.py'), 2);
  assert.equal(stillCalls('from comfy import (  # the stills\n    anima as make, run)\nmake(p, n)\nrun(wf, out)\n', 'a.py'), 2);
  assert.equal(stillCalls('from comfy import run, \\\n    anima\nrun(wf, out)\nanima(p, n)\n', 'a.py'), 2);
  assert.equal(stillCalls('from comfy import (\n    run_video,\n)\nrun_video(wf, out)\n', 'a.py'), 0);
});

test('a triple-quoted string is string contents: a call beside one counts, a call inside one does not', () => {
  assert.equal(stillCalls('comfy.run(wf, """out""")\n', 'a.py'), 1);
  assert.equal(stillCalls("comfy.run(wf, '''out''')\n", 'a.py'), 1);
  assert.equal(stillCalls('s = """\ncomfy.run(wf, out)\n"""\ncomfy.run(wf, out)\n', 'a.py'), 1);
  assert.equal(stillCalls('"""Doc.\n"""; comfy.run(wf, out)\n', 'a.py'), 1);
  assert.equal(stillCalls('s = "comfy.run(wf, out)"\n', 'a.py'), 0);
});

test('an f-string expression is code; a hash inside a string is not a comment', () => {
  assert.equal(stillCalls('img = f"{comfy.run(wf, out)}"\n', 'a.py'), 1);
  assert.equal(stillCalls('x = "a # b"; comfy.run(wf, out)\n', 'a.py'), 1);
  assert.equal(stillCalls('x = 1  # comfy.run(wf, out)\n', 'a.py'), 0);
});

test('a file not in the baseline fails, with the one-sentence instruction', () => {
  const { bad } = verdict({ 'tools/new.py': 2 }, { files: {}, exempt: {} });
  assert.equal(bad.length, 1);
  assert.equal(bad[0][0], 'tools/new.py');
  assert.ok(bad[0][1].includes('render through node tools/subplots/compose.mjs <round>/recipes/<shot>.json instead'));
});

test('a listed file with more calls than recorded fails; fewer calls, or a gone file, is a note', () => {
  const base = { files: { 'a.py': 2, 'b.py': 1, 'gone.py': 1 }, exempt: {} };
  assert.equal(verdict({ 'a.py': 3, 'b.py': 1 }, base).bad.length, 1);
  const fewer = verdict({ 'a.py': 1, 'b.py': 1 }, base);
  assert.equal(fewer.bad.length, 0);
  assert.equal(fewer.notes.length, 2);
  assert.ok(fewer.notes.some((n) => /gone\.py .*prune/.test(n)));
});

test('an exempt file keeps its own count', () => {
  const base = { files: {}, exempt: { 'tools/rmbg_local.py': { kind: 'rembg', calls: 1 } } };
  assert.equal(verdict({ 'tools/rmbg_local.py': 1 }, base).bad.length, 0);
  assert.equal(verdict({ 'tools/rmbg_local.py': 2 }, base).bad.length, 1);
});

test('the recorded baseline is well formed', () => {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'direct-render-baseline.json');
  const base = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.match(base.about, /nothing new goes here/);
  for (const [f, n] of Object.entries(base.files)) assert.ok(Number.isInteger(n) && n > 0, f);
  for (const [f, e] of Object.entries(base.exempt)) assert.ok(e.kind && Number.isInteger(e.calls) && !(f in base.files), f);
});
