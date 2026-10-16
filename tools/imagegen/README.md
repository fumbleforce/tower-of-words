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

## Generation records

Both Image Gen and Scene Editor use the same picture library and settings lightbox. A compose.mjs render keeps the owner and round it was sent with. Made by and the Agents filter count any row with an owner as an agent's (`agent_row` in server.py); Jørgen's own renders have no owner. Fresh queue results and reloaded history keep steps, CFG, sampler and scheduler. Loading a local picture preserves its exact recorded prompt and exclusions even when a shared block has changed since generation. Changing a block deliberately rebuilds the prompt. The Original prompt panel keeps the full source recipe, including preset versions, local block changes, references and picture tools.

A completed external tool output enters that same numbered history through:

```sh
python3 tools/imagegen/external.py /path/to/receipt.json
```

The receipt records evidence from the actual tool call. A minimal example is:

```json
{
  "import_id": "tool-call-output-1",
  "engine": "image_gen.imagegen",
  "prompt": "A quiet station entrance with a blue sign.",
  "output": "/path/to/original.png",
  "rating": "safe",
  "references": ["/path/to/reference.png"],
  "requested": {
    "prompt": "A quiet station entrance with a blue sign.",
    "transparent_background": false,
    "referenced_image_paths": ["/path/to/reference.png"]
  },
  "observed": {"provider_output": "tool-output.png"}
}
```

Use the actual known engine identifier. Do not infer its internal model version or local sampler settings. `requested` holds only verified tool arguments; `observed` holds returned metadata or explicitly labelled historical evidence. If a historical request is incomplete, record that in `observed` and leave unknown arguments absent. `references` preserves input order and must agree with `requested.referenced_image_paths` when present. The prompt must also agree with `requested.prompt`.

`at` is optional. Supply an ISO timestamp with a timezone only when evidence exists, with `timestamp_source` explaining it, such as `tool_receipt` or `source_file_mtime`. A file modification time remains labelled as such. Without `at`, the row uses import time for history ordering, while `provenance.generated_at` remains null and its source is `not_recorded`. `imported_at` always records import time.

The importer stores the original and reference snapshots byte for byte, with original paths, SHA-256 and decoded dimensions. It takes the ordinary cross-process store lock. Identical retries of an `import_id` return the same numbered row and preserve ratings and notes. Contradictory evidence for that ID is refused. Inputs are fully decoded before mutation. A guarded importing record is written before any output, reference or thumbnail becomes addressable. A failed import removes its new copies and can resume with the same number without losing notes. Protected sources and symlinks are refused before opening them. Private ratings or private source/reference paths keep the entire record and its reference copies private; `private: true` may explicitly retain a private audience.

External records retain rating, notes, comparison, trash, image selection and Create scene/character actions. The same lightbox displays their exact request, observed result, unavailable controls and ordered references. Unsupported seed replay is disabled in both hosts and guarded in their action handlers. Opening an external scene source shows its settings read-only. Starting a new local generation is an explicit separate action.

| Feature | Image Gen and Scene Editor |
|---|---|
| Cast, outfit, scene, place, light, camera, style, excludes and local block changes | Shared composer and prompt builder |
| Seed, size, model, steps, CFG, sampler and scheduler | Shared queue recipe, live results and durable history |
| Prompt overrides and preset versions | Exact original words and full versioned recipe retained |
| Reference, start image, LoRA, guide and colour tools | Full recorded fields retained in settings and local reuse |
| Original prompt and original/current settings | Shared source record, visible in both composers |
| Star, favourite, reject reason, notes, compare and trash | Shared library actions and service records |
| Create scene or character | Existing source-preserving actions; scene-only attachments stay in Scene Editor |
| External tool evidence | Same library/lightbox; unsupported provider controls remain unknown |

Tests: `python3 -m unittest tools/imagegen/test_external.py tools/imagegen/test_imagegen.py tools/subplots/test/test_studio.py`, `node --test tools/imagegen/test/*.test.mjs tools/subplots/test/image-compose.test.mjs`, and `GL=soft node tools/imagegen/test/provenance-browser.mjs`. The browser matrix intercepts every request and checks both actual hosts at 390px and 1366px. It does not access the live queue or measure native GPU performance.
