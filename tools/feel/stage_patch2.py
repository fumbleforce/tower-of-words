"""Round 2 wiring (movement and facing), as a script that applies it to a copy of game3d/js for testing; the same edits
are the requests in notes/production-requests.md (main.js: builder; places/lobby.js, places/office.js: world).
Usage: python3 tools/feel/stage_patch2.py <copy of game3d/js>  (or game3d/js itself; it's safe to run twice)"""
import sys
J = sys.argv[1]
def rep(f, a, b):
    p = f'{J}/{f}'; s = open(p).read()
    if b in s: return   # already applied
    if a not in s: print('MISSING in', f, ':', a[:80]); return
    open(p, 'w').write(s.replace(a, b, 1))
# main.js (builder)
rep('main.js', "import { glide } from './places/lobby.js';\n", "")
rep('main.js', "import { SmoothWalker } from './move.js';", "import { SmoothWalker, walkRig, faceRig, approachSpot, pickPerson } from './move.js';")
rep('main.js', "r.seated = false; r.setState('walk'); const pr = glide(game, r.root, p, speed || 1.2).then(() => r.setState('idle')); if (wait) await pr; return; }",
    "r.seated = false; const pr = walkRig(game, r, p, { speed: speed || 1.0 }); if (wait) await pr; return; }")
rep('main.js', "  r.root.rotation.y = Math.atan2(p[0] - r.root.position.x, p[1] - r.root.position.z);\n};", "  faceRig(game, r, p);\n};")
rep('main.js', "  const sp = item.spot ? item.spot() : null;", "  const sp = approachSpot(game, item) || (item.spot ? item.spot() : null);")
rep('main.js', "  if (game.busy || !game.place) return;\n  const [w, h] = [canvas.clientWidth, canvas.clientHeight];",
    "  if (game.busy || !game.place) return;\n  const who = pickPerson(game, e.clientX, e.clientY, canvas); if (who) { use(who); return; }\n  const [w, h] = [canvas.clientWidth, canvas.clientHeight];")
rep('main.js', "import { SmoothWalker, walkRig, faceRig, approachSpot, pickPerson } from './move.js';", "import { SmoothWalker, walkRig, faceRig, approachSpot, pickPerson, standOut } from './move.js';")
rep('main.js', "  if (r && r.meshy && !isPlayer(who)) { if (r.seated) { r.seated = false; r.setState('idle'); r.root.position.y = 0; r.root.position.z += r.root.position.z < 0 ? 0.45 : -0.45; } return; }",
    "  if (r && r.meshy && !isPlayer(who)) { if (r.seated) await standOut(game, r, r.root.position.z < 0 ? 0.45 : -0.45); return; }")
# places/train.js (world): Eric stands out to his own spot in the aisle
rep('places/train.js', "if ((id === 'eric' || id === 'player')) { const m = game.player; if (!m.seated) return; m.seated = false; m.setState('idle'); m.root.position.y = 0; m.root.position.z += m.root.position.z < 0 ? 0.55 : -0.55; for (const b of bagObjs) { b.visible = true; b.userData.blob.visible = true; } return; }",
    "if ((id === 'eric' || id === 'player')) { const m = game.player; if (!m.seated) return; for (const b of bagObjs) { b.visible = true; b.userData.blob.visible = true; } await standOut(game, m, m.root.position.z < 0 ? 0.55 : -0.55); return; }")
rep('places/train.js', "import { glide, withList } from './lobby.js';", "import { glide, withList } from './lobby.js';\nimport { standOut } from '../move.js';")
# places/lobby.js (world): the one glide, from move.js
p = f'{J}/places/lobby.js'; s = open(p).read()
if 'export function glide(' in s:
    a = s.index('export function glide('); b = s.index('export async function lobbyPlace')
    s = s[:a] + "import { glide } from '../move.js';   // smooth start, turn and stop; never touches the player's facing\nexport { glide };\n\n" + s[b:]
    open(p, 'w').write(s)
# places/office.js (world): Meshy NPCs walk routed, not in a straight line through desks
rep('places/office.js', "if (r.root && !r.hips) return glide(game, r.root, [x, z], speed || 1.0);", "if (r.root && !r.hips) return walkRig(game, r, [x, z], { speed: speed || 1.0 });")
rep('places/office.js', "import { glide } from './lobby.js';", "import { glide } from './lobby.js';\nimport { walkRig } from '../move.js';")
# testmode.js (builder): the movement check
rep('testmode.js', "  ui.auto = true;\n", "  ui.auto = true;\n  import('./move.js').then((m) => m.startMoveCheck(game));\n")
print('patched')
