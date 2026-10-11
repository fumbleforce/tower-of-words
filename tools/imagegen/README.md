# Image gen dashboard

`tools/imagegen/run.sh`, then http://127.0.0.1:8772/ (`--restart` loads new code and keeps his GPU session). The rules for using it are in GUIDE.md (Engineering, "Image gen dashboard").

ComfyUI started by the dashboard leaves 2 GB of VRAM alone (`--reserve-vram`, `IMAGEGEN_RESERVE_VRAM` in gpu.py), so the browser keeps headroom while a render runs. A ComfyUI that was already running keeps whatever it was started with.

## Image workspace

The main page uses the scene editor's composer, prompt builder, picture tools and library. Its composition has no scene or shot attachment. Prompt and Negative remain editable side by side, with generated pictures in rows below. People, place, light, camera direction, local prompt changes, references, masks, LoRAs and generation settings use the same controls in both tools. Public and private browser drafts are stored separately. The previous page remains at `/legacy`.

Select a picture to create a scene or character. Create scene saves a local draft with a separate copy of the image and its generation settings, then links to the scene editor. It can be edited, previewed, saved and restored from revisions there. Scene drafts do not enter the game automatically. Create character opens the shared character form, then saves a versioned image-tool character with its own portrait copy. Private source pictures keep their audience. Neither action changes the original render or an existing character.

The scene editor owns scene draft storage and access. The image service owns character creation, render lookup and portrait copies (`image_actions.py`). Tests use temporary data, intercepted generation requests and software-rendered browser fixtures. Run `python3 -m unittest tools/imagegen/test_imagegen.py`, `node --test tools/imagegen/test/*.test.mjs`, and `GL=soft node tools/imagegen/test/studio-browser.mjs`.

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

Local tool data needs its own backup. `tools/assets/sync.py` never uploads private files and only uploads binaries. Before a tool migration, preserve the versioned code in Git and archive `tools/imagegen/config/`, the image service data directory, and the scene editor state directory. Browser composition drafts remain in that browser's local storage. Restore data with the services stopped so a running writer cannot overwrite it.
