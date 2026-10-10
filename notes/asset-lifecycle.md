# Asset lifecycle: generated, live, retired

Jørgen, 2026-10-10 (#419): "I'd like to make it so our processes properly tracks whatever the active assets are, and always generate new untested images into a gitignored area, and we retire assets back into that if they get replaced by newer versions. [...] Stuff that I have generated but is not part of the game should not make it into the bundle."

So every asset is in one of three places, a registry says which files are live, a check proves the game matches the registry, and the release bundle is built from the registry alone. How binaries are stored and synced (R2, the lock file, the commit hook) is in [asset-storage-proposal.md](asset-storage-proposal.md); this note is about which files are live.

## The three places

| | Public | Local-only |
|---|---|---|
| Generated: every new render, attempt, raw file and round | `art/candidates/<round>/` (binaries git-ignored) and `art/production/` (all ignored) | the agents' rewards folder (island/PRIVATE.md, Layout) |
| Live: exactly what the game loads | `game3d/assets/`, `game3d/audio/`, `game3d/fonts/` | the local-only game folder, plus the plugins and audio folders (island/PRIVATE.md) |
| Retired: live files that were replaced or fell out of use | `art/production/retired/<date>/<original path>` | `retired/<date>/<original path>` in the rewards folder |
| Registry | `tools/assets/live.json` (committed) | `live.json` in the local-only game folder (never committed) |

A generator never writes into a live folder. `tools/comfy.py` refuses an output path inside one (tools/assets/live_roots.py reads the roots from both registries). The check below is the backstop for everything else: a file that appears in a live folder without being registered fails `npm run check`.

Build scripts that remake an approved, already-registered asset from its source (the Blender builds of the train, the station and the planting, the voice export) may write it in place: that is a new version of a live file, not a new asset. The voice clips are their own family: the voice-clips skill checks a take before tools/voice/export.py writes it, and the story's voice manifest says which clips are played.

## The registry

Both registries have one format, read and written only by `tools/assets/live.mjs`. Paths are repo-relative.

- `roots`: the live folders. Every file in them must belong to a unit or match `source`. Public roots must also be roots in tools/assets/sync.json, so live files are always uploaded.
- `generated`: the generated area; retired files go to `<generated>retired/<date>/<original path>`.
- `source`: files allowed in a live folder that never ship (a model's .blend beside its .glb, check sheets, notes, the voice manifest).
- `units`: what is live. A key is a file, a folder (ends in `/`: every file under it) or a list (`list`: a JSON array of keys in a file, `each`: the path pattern per key, `refs`: the file that says which keys are played). A unit can say:
  - `dev`: why it never ships (loaded only behind a test or legacy flag, or only by a check or a renderer). It must still exist and be referenced.
  - `flavor: "adult"`: ships only in the adult release (below). Unset means every flavor.
  - `loaded_by: "<file>#<text>"`: for a unit the code reaches through a computed path (a cast id joined to a folder); the check proves that file still contains that text.
  - `note`.
- `coarse`: references in the code too broad to prove a unit is used (`assets/characters/` + an id), each with where the precise answer comes from. They still have to match something.
- `code` (public): the runtime code a release ships, as globs (`include`, `exclude`, and `adult` for modules only the adult flavor ships), and `not_scanned` (vendor code, whose comments name example files).
- `planned` (local-only): pictures a scene asks for that are not rendered yet; the scene shows its card until they are.
- `log`: every promote and retire, newest last, with the round, review id, what replaced what, and a note.

## Promote, retire

```
node tools/assets/live.mjs promote <generated file> <live path> --round <round> [--review <id>] [--replace] [--note "..."]
node tools/assets/live.mjs retire <live path>... [--from <file of paths>] [--by <new live path>] [--note "..."]
node tools/assets/live.mjs register <live path>... --round <round or build> [--review <id>] [--note "..."]
```

- Promote copies the picked file into the live folder, registers it (unless a folder unit already covers the path) and logs its round and review. `--replace` retires the file it replaces first. For a public file, then run `python3 tools/assets/sync.py push` and commit live.json with the lock file.
- Register adds a file or folder a build script made in place (a Blender export of an approved model, a new crowd body installed by its round's script) without copying it, and logs where it came from.
- Retire moves the file (or folder) into the retired area, drops its unit (a voice clip also leaves audio/index.json), drops its lock entries (`sync.py forget`) and logs what replaced it. Run in an agent worktree, it moves the main checkout's copy too, so main never keeps a file the landed registry dropped.

## The check

`node tools/assets/live.mjs check [--local]` fails when (the public half runs in `npm run check` as game3d/test/unit/live-assets.test.mjs):

1. a file in a live folder is in no unit (and is not a `source` file);
2. a registered file is missing on disk;
3. the game asks for a file nothing registered matches (the public references are the string and template literals naming a live folder in game3d/js, game3d/opening, the css and minigames, plus the faces in js/ui/portrait-data.js and data/mc; the local ones are the picture paths in the live plugins and their imports);
4. a unit nothing references, by an exact reference or its `loaded_by`;
5. a voice clip the story's voice manifest doesn't play;
6. (local) a live plugin imports a plugin that is not registered or is marked `dev`.

The check reads the code only to prove it matches the registry; nothing decides what is live from the code.

## The release file list

`node tools/release/files.mjs [--flavor vanilla|adult] [--json] [--excluded]` prints every file a release bundle holds; `--json` gives `[{src, dest, size, part}]` on stdout: `dest` is the URL path the game requests, `src` the file on disk, `part` code, asset or local. It is built from the two registries and game3d/build.json only, prints the size of both flavors, and fails on any missing file, on a shipped module that imports a file the list doesn't hold (a dynamic import of a `code.exclude` file is allowed: a dev page behind a query flag), and on a failing registry check. Everything in the list ships; `--excluded` shows what was left out and why. The local server's `/api/plugins` (tools/review_server.py) is the list of the bundle's `island/private/plugins/<name>.js` names.

- Both flavors: game3d/build.json's modules, the page shell (index.html, css, vendor, the opening page and its film, the minigames), and the public live units without `dev`.
- Adult adds the local-only units without `dev` (plugins, voice clips, pictures, models) and public units marked `flavor: "adult"`.
- Vanilla has no local-only file at all and no `flavor: "adult"` unit, and its dest paths must pass a word scan (adult, private, reward, nsfw, skimpy, discreet, explicit). No public asset serves only the optional content today, so no unit is marked; the private-mode hooks in the game code (js/plugins.js and the settings row) are code, and stripping them is #423.
- Never in either: attempts, raw files, rounds, reviews, docs, tools, tests, QA, shots, dev pages (viewer.html, vrm-test.html, showcase.html), `dev` units (the scene viewer plugins among them) and the player's own folder.

## Local-only content

The local-only half (its folder names, what moved where, the scene pictures still to render, the move script) is described in asset-lifecycle.md in the private docs folder; island/PRIVATE.md, Layout, has the folders.
