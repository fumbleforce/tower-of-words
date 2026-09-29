# Asset library

Every usable asset in the repo, with its status, in one list (`assets.json`) and one page (http://127.0.0.1:8771/tools/assets/, linked from the hub).

- `scan.py` writes `assets.json` and makes the image and audio thumbnails (cached in `thumbs/`, remade only when the source file changes). `./start` runs it, so the page is current whenever the server starts. `--check` also checks that every listed file exists.
- `render3d.mjs` renders the 3D thumbnails (Meshy models, animations, code-built chibis, the prop kit, rooms and the props in them) with the game's own code in one headless run. It takes the browser lock, uses software GL (no GPU lock), and only redraws thumbnails that are missing or older than the files the entry lists. Run it after a model, a place or the cast code changes: `node tools/assets/render3d.mjs`.
- `viewer.js` builds a 3D asset from its `view` and shows it on a turntable. The gallery and `render.html` (the thumbnail page) both use it.

## Statuses

| Status | Meaning | Comes from |
|---|---|---|
| approved | Jørgen picked it | a decided review (`reviews/<id>`), FORMAT.md's approved portraits, art/approved/README.md, bible/facts.yaml, a GUIDE quote |
| provisional | in the game but not approved, or approved and put back under review | FORMAT.md's PROVISIONAL list, facts.yaml `review`, anything the game builds or plays that nobody reviewed |
| candidate | waiting for a pick | an open review, facts.yaml `draft`, candidate folders |
| legacy | from an earlier version of the game | anything under legacy/, facts.yaml `legacy`, old takes the game no longer plays |
| rejected | not picked, or turned down | a decided or superseded review without a pick, facts.yaml `rejected`, a GUIDE quote |

Each entry says where its status came from (`status_from`, with the file and line), so a wrong status is fixed at its source, not in scan.py. When a decision changes, update the review, FORMAT.md, art/approved/README.md or facts.yaml as usual and restart (or run `python3 tools/assets/scan.py`).

## Entry

`id` (kind/name), `kind`, `name`, `who` (speaker or bible id), `place` (train, gate, lift, office), `paths`, `status`, `status_from`, `source` (model, seed, recipe or script), `used` (where the game uses it), `review` (review item id), `thumb`, `view` (how to preview it: image, audio, meshy, mio, glb, chibi, kit, room), and optional `text` (voice lines), `svg` (icons), `note`, `tags`.

Adding a new kind of asset: add a block to scan.py that calls `add(...)` with the status from its real source, then run `python3 tools/assets/scan.py --check`. Git-ignored files (art/approved/music, the Meshy originals in art/approved/*/meshy) are left out, since the page must work from a clone.
