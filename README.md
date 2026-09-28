# Amakawa

A 3D RPG about a Western IT engineer at a giant Japanese company, where Japanese words become commands that work on the world. Read GUIDE.md before working here; TODO.md has what's outstanding.

## Active

- `game3d/`: the game (three.js). Open `game3d/index.html` from a local server (`python3 -m http.server 8771 --bind 127.0.0.1` in the repo root, then http://127.0.0.1:8771/game3d/).
- `bible/`: the world bible, http://127.0.0.1:8771/bible/. Hand-written facts in `bible/facts.yaml`; `python3 tools/bible/build.py` rebuilds the page data.
- `art/approved/`: approved art only, one folder per bible id (see its README). If a file isn't in the bible, it isn't approved.
- `art/`: prompt guides (`PROMPTS.md`, `STYLE.md`), Jørgen's reference images (`art/refs/`) and work in progress.
- `tools/`: image, voice and build tools. `tools/imagegen/run.sh` starts the image gen dashboard, `tools/island_audio/` is the voice pipeline, `tools/voice-refs/` has the voice clone clips.
- `notes/`: design docs (story, maps, research).
- `GUIDE.md`, `TODO.md`.

## Legacy

`legacy/` holds everything that is no longer active: the first prototypes (`proto/`, `proto2/` review pages), the MVP (`mvp/`), side experiments (`side/`), the old visual novel (`game/`), the quiz app that used to live in the root, and the Godot island slice (`island/`). It is kept for reference only. Nothing in it is approved or used by the game.

`island/private/` stays where it is. It is git-ignored and private; see `island/PRIVATE.md`.
