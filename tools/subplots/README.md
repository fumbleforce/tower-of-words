# Subplot editor

Local page: `http://127.0.0.1:8771/tools/subplots/web/`. Start the project server with `./start`. Image generation uses the existing service on port 8772 (`tools/imagegen/run.sh`). No agent session is needed to use either tool.

The public adapter finds `nodes` objects in story modules without executing them. The storyboard shows pictures, bilingual dialogue, choices and branches. Cast, locations, events and requirements come from the same public sources as the world bible. Existing helper expressions remain in the adapter, outside the editing interface. Encounter entries edit the story's `on` routes while preserving other nodes' routes and priorities. Existing routing that cannot be read statically is not rewritten. The preview follows choices into other nodes and lets the author try conditional branches without executing game actions.

Save draft stores editor work locally. Save to story checks the whole source file's revision before replacing the selected node and changed routes. It keeps the previous scene in Revisions. It does not commit or publish anything. Revisions restore into the editor first. Public scene notes, composition settings and selected image references are kept in the Git administrative directory, outside exports. Selecting an image for a public scene records the selection; a scene-specific picture action is still needed to display it in play.

Local scene providers own their source format, generated outputs, revisions and image application. `SUBPLOTS_PROVIDER` is a JSON command array. Requests are JSON on stdin, responses JSON on stdout. `SUBPLOTS_PUBLIC_ONLY=1` disables this adapter for QA. The editor never discovers or opens user-owned folders.

Provider operations:

- `catalog`: `{scenes:[{id,provider,title,node,group,count}],errors:[]}`. IDs must have a provider prefix other than `public:`.
- `read`, with `id`: `{id,title,node,group,revision,steps,raw,entries,routesEditable,metadata,history,draft}`. Steps use the game's story step objects. `null` steps are preserved as a computed sequence. Entries are `{event,condition,once}`. Metadata contains notes, composition controls and a selected image `{id,url,file,seed,positive}`.
- `draft`, `validate`, `save`: receive that editable shape. Save must reject stale revisions and return the updated read shape. A provider must update its source of truth and regenerate derived files, rather than writing generated files alone. For local scenes, keep all data within the existing local content layout.
- `history`, with `id` and `version`: return an earlier read shape. Restoring it is an edit, not an immediate source write.

The image service is proxied through a fixed localhost endpoint. Generation happens only when the user presses Generate. The existing service owns the GPU queue, model validation, generated files and render history. No generation job runs in the test suite.

Verification: `node --test tools/subplots/test/source.test.mjs` and `python3 -m unittest discover -s tools/subplots/test -p 'test_*.py'`. Browser tests must use fixture data and `SUBPLOTS_PUBLIC_ONLY=1`.

The bundled local adapter reads the existing scene-generator recipes. Run `python3 tools/subplots/setup_local.py` once to connect those sources. It preserves helper calls and alternate-language variants, edits existing place/day/availability fields, rebuilds the derived scenes, and applies selected renders to their picture slots. Fixed opening hooks remain in their existing position. Shot helpers expose supported framing and timing controls; other computed directions are preserved. For a changed line, stale local voice clips are retired; the editor does not generate speech. Public dialogue edits remove an outdated explicit voice reference and retain other staging fields.

Local saves back up source, derived outputs, metadata and the asset registry before rebuilding. A failed rebuild restores those files. Revision restoration includes picture-table references. Crash-recovery copies live alongside each scene's history in the configured state directory, under `recovery/<timestamp>/`; `files.json` maps the numbered backups to their original paths. Keep that directory when moving the project. Do not run an external recipe generator while saving from the editor.

Tests use temporary scenes, fake asset commands and simulated image jobs. Run `node --test tools/subplots/test/*.test.mjs`, Python discovery above, and `GL=soft node tools/subplots/test/browser.mjs`. The browser check exercises editing, slow-save locking, bilingual round trips, dropdown conditions, actual scene pictures, missing-image states, scoped destinations, previews, history and per-shot composition at 2560px, desktop and phone sizes. It never opens the actual local library or starts a render.

English and Japanese appear side by side. For public scenes, Spoken language selects the game's text; the other version stays in local editor metadata, so editing a translation does not reveal Japanese to the player. Recipe-based dialogue retains its existing alternate-language helper behavior. Narration helpers with only one authored language have one editable text field.

Each shot opens the image composer with its own settings. The composer uses the image generator's versioned character, outfit, scene, camera, framing, style, model and negative presets, portrait references, face correction, queue and render history. Existing renders can be selected for individual shots; multiple selections save together. Unrendered pictures are marked explicitly. An exact referenced archive file may provide a preview when its live file is absent; viewing it does not promote it.

`GET /api/subplots/authoring` supplies the public authoring vocabulary through static parsing, cached until its source files change. Tests never request user-owned files or submit real generation jobs. The dedicated image composer browser fixture is `GL=soft node tools/subplots/test/images-browser.mjs`.

Configured `checks` run after rebuilding and before accepting a save. A failed check restores source and derived outputs from the same backup as a failed rebuild. New local configurations include the existing language-visibility and encounter-entry checks.
