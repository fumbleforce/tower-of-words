"""The exact wiring the feel agent asked for (notes/production-requests.md), as a script that applies it to a copy of
game3d/js for testing: main.js and runner.js (builder), ui.js (shell), avatar.js gait (characters). Not run on the repo.
Usage: python3 tools/feel/stage_patch.py <copy of game3d/js>"""
import sys, re
J = sys.argv[1]
def rep(f, a, b, n=1):
    p = f'{J}/{f}'; s = open(p).read()
    if a not in s: print('MISSING in', f, ':', a[:70]); return
    s = s.replace(a, b, n); open(p, 'w').write(s)

# ---- main.js (builder) ----
rep('main.js', "import * as trips from './trips.js';", "import * as trips from './trips.js';\nimport { SmoothWalker } from './move.js';\nimport * as ambience from './ambience.js';\nimport { setPlace as sfxPlace } from './sfx.js';\nimport { learned } from './feel.js';")
rep('main.js', "game.walker = new Walker(game.player.root, place.nav, { speed: 1.45 });", "game.walker = new SmoothWalker(game.player.root, place.nav, { speed: 1.3 });\n  sfxPlace(name);")
rep('main.js', "  if (p) { standUp(); game.walker.goTo(p.x, p.z); showTapRing(p); }", "  if (p) standUp();\n  game.walker.tapRay(raycaster, game.place);")
rep('main.js', "  if (!mio.seated && !mio.scripted) mio.setState(moving ? 'walk' : 'idle');\n  mio.update(dt, 1.25);",
    "  if (!mio.seated && !mio.scripted) { mio.setState(moving ? 'walk' : 'idle'); mio.setGait?.(game.walker.gait.v); } else mio.setGait?.(null);\n  mio.update(dt, 1.25);")
rep('main.js', "  stepAmbient(game);", "  stepAmbient(game);\n  ambience.update(game, dt);")
rep('main.js', "game.sim = sim;", "game.sim = sim;\ngame.learned = (kind) => learned(game, kind);")
# ---- runner.js (builder): the learned beat ----
rep('runner.js', "      sfx('word'); ui.refreshWords();", "      if (this.game.learned) this.game.learned(WORDS[id].cmd ? 'command' : 'word'); else sfx('word');\n      ui.refreshWords();")
# ---- ui.js (shell): effects from sfx.js, ambience ducks with the music ----
rep('ui.js', "import { lineHTML,", "import { sfx as playSfx, stopSfx as cutSfx } from './sfx.js';\nimport { duck as duckAmb } from './ambience.js';\nimport { lineHTML,")
rep('ui.js', "export function stopSfx(kind, ms = 40) {", "export function stopSfx(kind, ms = 40) { return cutSfx(kind, ms); }\nfunction stopSfxOld(kind, ms = 40) {")
rep('ui.js', "export function sfx(kind) {", "export function sfx(kind, o) { return playSfx(kind, o); }\nfunction sfxOld(kind) {")
rep('ui.js', "function duckMusic(on) {\n", "function duckMusic(on) {\n  duckAmb(on);\n")
# ---- avatar.js (characters): gait blend for Eric ----
rep('avatar.js', "  function setState(name) {\n    if (name === curName || !actions[name]) return;",
"""  // gait (feel agent): ground speed in the rig's own units / s. Walk and run play together on one shared phase,
  // weighted by speed, and the phase advances with the distance covered, so the feet keep up with the body.
  // Measured on the clips: walk covers 0.44 units / s at time scale 1, run 1.1; their left-foot phases differ by 0.03.
  const WALK_V = 0.44, RUN_V = 1.1, RUN_OFF = 0.03, WD = actions.walk.getClip().duration, RD = actions.run.getClip().duration;
  let gaitV = null, phase = 0, runW = 0;
  function setGait(v) { gaitV = v; }
  function stepGait(dt) {
    const w = THREE.MathUtils.smoothstep(gaitV, 0.55, 1.0);
    runW += (w - runW) * Math.min(1, dt * 6);
    const cyc = (1 - runW) * WALK_V * WD + runW * RUN_V * RD;
    phase = (phase + (dt * gaitV) / cyc) % 1;
    const W = actions.walk, R = actions.run;
    if (!R.isRunning() || R.getEffectiveWeight() === 0 && runW > 0.01) { R.reset(); R.play(); }
    W.timeScale = 0; R.timeScale = 0; W.time = phase * WD; R.time = ((phase + RUN_OFF) % 1) * RD;
    W.weight = 1 - runW; R.weight = runW;
  }
  function setState(name) {
    if (name === curName || !actions[name]) return;
    if (curName === 'walk' && actions.run.isRunning()) { actions.run.fadeOut(0.2); }""")
rep('avatar.js', "  function update(dt, speed = 1) {\n    actions.walk.timeScale = speed;",
"  function update(dt, speed = 1) {\n    if (gaitV !== null && curName === 'walk') stepGait(dt); else { actions.walk.timeScale = speed; actions.walk.weight = 1; }")
rep('avatar.js', "    setState, get state() { return curName; },", "    setState, setGait, get state() { return curName; },")
print('patched')
