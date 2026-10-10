# Subplot editor

Local page: `http://127.0.0.1:8771/tools/subplots/web/`. Start the project server with `./start`. Image generation uses the existing service on port 8772 (`tools/imagegen/run.sh`). No agent session is needed to use either tool.

The public adapter finds `nodes` objects in story modules without executing them. Literal sequences have dialogue cards and editable action/choice data. Helper-based sequences retain their original expression in Source. Encounter entries edit the story's `on` routes while preserving other nodes' routes and priorities. Existing routing that cannot be read statically is not rewritten. The preview reads steps without executing game actions.

Save draft stores editor work locally. Save to story checks the whole source file's revision before replacing the selected node and changed routes. It keeps the previous scene in Revisions. It does not commit or publish anything. Revisions restore into the editor first. Public scene notes, composition settings and selected image references are kept in the Git administrative directory, outside exports. Selecting an image for a public scene records the selection; a scene-specific picture action is still needed to display it in play.

Local scene providers own their source format, generated outputs, revisions and image application. `SUBPLOTS_PROVIDER` is a JSON command array. Requests are JSON on stdin, responses JSON on stdout. `SUBPLOTS_PUBLIC_ONLY=1` disables this adapter for QA. The editor never discovers or opens user-owned folders.

Provider operations:

- `catalog`: `{scenes:[{id,provider,title,node,group,count}],errors:[]}`. IDs must have a provider prefix other than `public:`.
- `read`, with `id`: `{id,title,node,group,revision,steps,raw,entries,routesEditable,metadata,history,draft}`. Steps use the game's story step objects. `null` steps use Source. Entries are `{event,condition,once}`. Metadata contains notes, composition controls and a selected image `{id,url,file,seed,positive}`.
- `draft`, `validate`, `save`: receive that editable shape. Save must reject stale revisions and return the updated read shape. A provider must update its source of truth and regenerate derived files, rather than writing generated files alone. For local scenes, keep all data within the existing local content layout.
- `history`, with `id` and `version`: return an earlier read shape. Restoring it is an edit, not an immediate source write.

The image service is proxied through a fixed localhost endpoint. Generation happens only when the user presses Generate. The existing service owns the GPU queue, model validation, generated files and render history. No generation job runs in the test suite.

Verification: `node --test tools/subplots/test/source.test.mjs` and `python3 -m unittest discover -s tools/subplots/test -p 'test_*.py'`. Browser tests must use fixture data and `SUBPLOTS_PUBLIC_ONLY=1`.

The bundled local adapter reads the existing scene-generator recipes. Run `python3 tools/subplots/setup_local.py` once to connect those sources. It preserves helper calls and alternate-language variants, edits existing place/day/availability fields, rebuilds the derived scenes, and applies selected renders to their picture slots. Fixed opening hooks remain in their existing position. Computed expressions have a Source editor. For a changed line, stale local voice clips are retired; the editor does not generate speech. Public dialogue edits remove an outdated explicit voice reference and retain other staging fields.

Local saves back up source, derived outputs, metadata and the asset registry before rebuilding. A failed rebuild restores those files. Revision restoration includes picture-table references. Crash-recovery copies live alongside each scene's history in the configured state directory, under `recovery/<timestamp>/`; `files.json` maps the numbered backups to their original paths. Keep that directory when moving the project. Do not run an external recipe generator while saving from the editor.

Tests use temporary scenes, fake asset commands and simulated image jobs. Run both Node test files, Python discovery above, and `GL=soft node tools/subplots/test/browser.mjs`. The browser check exercises editing, slow-save locking, Source/Sequence agreement, previews, history and composition at desktop and phone sizes. It never opens the actual local library or starts a render.
