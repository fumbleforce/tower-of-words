# Image gen dashboard

`tools/imagegen/run.sh`, then http://127.0.0.1:8772/ (`--restart` loads new code and keeps his GPU session). The rules for using it are in GUIDE.md (Engineering, "Image gen dashboard").

## What is in git and what is not

The code is in git. The data is not:

| What | Where | In git |
|---|---|---|
| Server, queue, filters, web page | `tools/imagegen/` | yes |
| Example blocks for a fresh checkout | `tools/imagegen/example-config/presets.json` | yes |
| Public blocks (cast, cameras, framings, plain styles, locations, poses, snippets ...) | `tools/imagegen/config/presets/<type>/<id>.json` in the main checkout | no, git-ignored |
| Private blocks | `island/private/imagegen/presets/<type>/<id>.json` | no |
| Private filter terms and private seed blocks | `island/private/imagegen/private.json` | no |
| Render log, outputs, thumbnails, trash, session | `island/private/imagegen/` | no |

A block keeps every version; saving makes a new one and Restore brings an old one back as a new version. Private blocks are listed and served only in private mode (the `/private` cookie, notes/tools/README.md); a block moves between the two folders with `POST /api/preset/<type>/<id>/private {"private": true|false}` in private mode. The first start on an empty config folder copies the example blocks; cast characters come from art/cast-looks.json (tools/cast_looks.py). A worktree's copy of the code reads and writes the main checkout's data (store.py).

`privacy.py` decides what is private: renders by rating, path and the private file's terms; blocks by folder. `python3 tools/imagegen/privacy.py import <file>` writes the private file (agents never write under island/private/imagegen/ by hand) and `privacy.py sort` moves existing blocks to the folder their audience says.

## Backups

Nothing backs up the blocks or island/private/ today: tools/assets/sync.py never uploads anything private and only uploads binaries.
