# Full and vanilla builds

Jørgen, 2026-10-10: "it should be possible to build and distribute both an adult version (inc private assets and plugin) and a vanilla version that has none of that, no option for adult, no mention of adult, private, reward etc." What each build is for the player: [docs/game/setting.md](../docs/game/setting.md). This note is how the game code does it (#423). The desktop shell and packing are in docs/desktop-release.md (#420); the release file lists are tools/release/files.mjs (#419).

## The flag

`__FULL__`, a global boolean. game3d/js/full.js sets it to true (`??=`, so a test can set it first) in the dev, web and full desktop builds. A module that reads it imports `./full.js` first, so it exists before the module's own code runs, in Node tests too. In code and flags the two builds are `full` and `vanilla`; the word "adult" is not used for either.

Gate a full-only surface where it is read, in the file itself: `if (__FULL__) { ... }`, `__FULL__ && x`, or `...(__FULL__ ? { key: value } : {})`. The vanilla transform defines it false per file, so the condition must name `__FULL__` directly: a helper imported from another module is not folded. Exported names, imported names and object keys survive minifying, so they must be neutral or sit inside a gate. Never name a scene in public code.

## The release steps

1. Stage: the release files copied with links dereferenced (`rsync -aL`, `cp -L`) into dist/. The transform refuses a stage that holds a symlink.
2. `node tools/release/flavor.mjs --flavor vanilla --in <stage>` (full: nothing to do). Per file, in place inside the stage: the modules in its `STUBS` table are swapped for the no-op stand-ins in tools/release/stubs/ (game3d/js/plugins.js, game3d/js/full.js; the transform and a unit test refuse a stub whose exports differ); every .js is minified by esbuild with `__FULL__` defined false, which drops the gated branches, their strings and all comments; .css is minified, .json written compact, HTML comments removed. No bundling: file names and the import graph stay. Files are replaced by temp file and rename, never written through, and nothing is deleted.
3. `node tools/release/scan.mjs --flavor vanilla <dir>` over the stage and again over the unpacked app: file and folder names, text files, JSON keys and values, and the JSON inside .glb models. It fails on adult, private, reward, nsfw, skimpy, discreet, explicit, hentai, ecchi, 18+ (as a rating), lewd, and the local-only folders (island/private, f95zone, imagegen). Its allowlist is empty; a new entry needs a reason and a real, unrelated use. Fix findings at the source.

Tests: game3d/test/unit/release-flavor.test.mjs.

## Audit (2026-10-10)

Every surface in the shipped game files (game3d/ without tests, tools, shots, docs) and how vanilla loses it. Comments everywhere go with minifying.

| Surface | Where | Vanilla |
|---|---|---|
| Plugin loader: per-place plugins, the boot plugin (settings rows, portrait stand-ins), the scene viewer (`?scene=`), the new-game screen's local third choice, diag reports, the island/private path | game3d/js/plugins.js; used by main.js (installViewer), places/lifecycle.js, ui/new-game.js (localPlugin), ui/portraits.js (portraitSource) | stubbed: no fetch, no import, no third choice, no viewer |
| Private mode setting and its story flag `private_mode` | js/settings.js (DEFAULTS, load, setSetting); js/narrative/engine-flags.js (declared writes) | gated: no key, no flag |
| Forcing private mode for the viewer | was settings.js `forcePrivateMode`; now the neutral `forceSetting(key, value)`, called only from plugins.js | stubbed with plugins.js |
| Settings panel Private section ("Adult scenes on this device") | js/ui/settings-view.js | gated: five sections |
| Private pins: heart icons, neutral tooltip unless private mode | js/gameplay/pin-kinds.js (`isOptionalPin`, pinTip), js/ui/pin-tip.js (`optionalOn`, tipOf), js/engine.js (setIcon) | gated: never a private pin |
| A reply's heart icon in a choice | js/ui/pin-tip.js choiceIcon, used by js/runner.js | gated: draws nothing |
| Day-5 staging state named `private` | js/places/day5/office.js, story/day5/reveal.js | renamed `closedDoor` (all builds) |
| Wording in a check message ("reward") | story/days3-5-finds-check.mjs | reworded (all builds) |
| Clip resolver hook for plugin audio | js/audio/core.js setClipResolver | neutral name, kept; nothing calls it |
| Heart pin CSS | css/marks.css (`.icon-heart-*`) | neutral names, kept |

Not adult: the Photos album (finds, js/ui/finds-view.js), `explicit` as an ordinary word in code (minified away), three.js internals (scan clean). The web build is unchanged for now: it still has the Private setting, and plugins load only on a local host.
