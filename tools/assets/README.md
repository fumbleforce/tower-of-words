# Asset library

Every usable asset in the repo, with its status, in one list (`assets.json`) and one page (http://127.0.0.1:8771/tools/assets/, linked from the hub).

- `scan.py` writes `assets.json` and makes the image and audio thumbnails (cached in `thumbs/`, remade only when the source file changes). `./start` runs it, so the page is current whenever the server starts. `--check` also checks that every listed file exists.
- `render3d.mjs` renders the 3D thumbnails (Meshy models, animations, code-built chibis, the prop kit, rooms and the props in them) with the game's own code in one headless run. It takes the browser lock, uses software GL (no GPU lock), and only redraws thumbnails that are missing or older than the files the entry lists. Run it after a model, a place or the cast code changes: `node tools/assets/render3d.mjs`.
- `sync.py` syncs the used assets with Cloudflare R2 (`status`, `push`, `pull`, `check`), `sync.json` says which files are used, and the commit hook (tools/check/hooks, installed by `sh tools/assets/install-hook.sh`) keeps binaries out of git and refuses a used asset that isn't pushed. On a new machine: `npm ci`, the R2 lines in .env, then `python3 tools/assets/sync.py pull`. The layout and the plan are in notes/asset-storage-proposal.md.
- `viewer.js` builds a 3D asset from its `view` and shows it on a turntable. The gallery and `render.html` (the thumbnail page) both use it.
- World pieces (kind `piece`): `kit.json` names the kit files, the families, the variants to show and the duplicates the audit found (notes/architecture/world-kit.md). `kit-source.mjs` finds every export in those files and traces "used in" through the imports; `kit-view.js` builds a variant for `viewer.js`. A new export in a kit file shows up on its own; give it variants in `kit.json` if its arguments can't be guessed. `looks` in `kit.json` marks each outdoor piece street style or old faceted and names the street version a faceted piece has so far, so the page can list what the street style still lacks; a variant with `"street": "full"` or `"phone"` is built and dressed the way the forecourt does it. scan.py also writes `kit-library.json` (git-ignored), which the bible's Asset library reads (http://127.0.0.1:8771/bible/#assets). render3d.mjs draws one thumbnail per variant and redraws a variant when its file or its arguments change. `node tools/bible/assets-shots.mjs` screenshots the page at desktop and phone size.

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

Adding a new kind of asset: add a block to scan.py that calls `add(...)` with the status from its real source, then run `python3 tools/assets/scan.py --check`. Git-ignored files are listed like any other (every binary is git-ignored); only paths with a `private/` folder are left out. On another machine the used ones come back with `python3 tools/assets/sync.py pull`, and the rest (candidates, rejected, legacy) exist only on the machine that made them.
