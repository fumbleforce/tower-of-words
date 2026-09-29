# Code structure and checks

Working rules and the active ownership freeze are in [GUIDE.md](GUIDE.md) and
[collab/PROTOCOL.md](collab/PROTOCOL.md). The approved sequence and remaining
extractions are in [notes/architecture-review.md](notes/architecture-review.md);
implementation evidence is in [notes/refactor-progress.md](notes/refactor-progress.md).

## Responsibilities

- `game3d/js/` owns browser runtime code. Main composes the game; reusable rules
  accept state and services explicitly. Keep each extracted module responsible
  for one named part of play and retain existing import facades during migration.
- `game3d/story/` owns authored narrative data. Structural IDs and declarations
  shared with tools live in runtime modules under `narrative/`, `places/` and
  `gameplay/`. Authored game facts belong in `docs/game/`.
- `game3d/js/narrative/state.js` owns the shared flags object and its condition
  evaluator. Runner retains its existing exports as a compatibility facade.
  Pure condition compilation lives in `narrative/conditions.js`; story checking
  and graph validation use it too. The graph infers requirements only for the
  expression subset it understands and retains other valid expressions as opaque.
- `game3d/js/audio/core.js` owns the shared context, volume buses, voice clips,
  mute and pause state. `audio/music.js` owns loop crossfades and ducking. The UI
  facade wires voice ducking and retains its existing exports; sound effects use
  the audio core directly.
- `game3d/js/ui/portraits.js` owns portrait state and layout. `ui/dialogue.js`
  supplies dialogue methods to the existing UI object, preserving its input state
  and public methods. `ui/dialogue-text.js` owns overheard text and reveal timing;
  `ui/dom.js` supplies their small DOM helpers.
- `game3d/js/narrative/hooks/` owns global hook registration by responsibility:
  targets, movement and saved staging, presentation, gestures, kotodama effects,
  and progression. Main injects the game and rendering/travel dependencies.
- `game3d/js/gameplay/interactions.js` installs marker availability, use/talk,
  Say practice and gifting against the shared game. Main retains input routing.
- `game3d/js/places/lifecycle.js` owns preparation, entry, travel and opening
  dispatch. Main injects place factories and rendering/marker callbacks and keeps
  boot/Continue orchestration. Save fields and transition ordering stay unchanged.
- `game3d/js/move.js` preserves the movement API while `movement/` separates
  navigation, crowd collision, player walking, scripted walking, targeting, path
  previews and diagnostics. Crowd owns the one shared pass-through map. Numeric
  navigation is independent of the renderer; engine re-exports `Nav`.
- `tools/lib/` owns reusable tooling support. Browser admission, deadlines and
  cleanup belong in `browser-job.mjs`; game startup belongs in
  `game3d/test/support/open-game.mjs`. Scenario drivers own their actions and checks.
- Runtime imports may resolve only within `game3d/js/`, `game3d/story/` and the
  vendored browser libraries. The pinned external speech-model module is explicit
  in the resolver. Runtime code must not import Node tools or archived code.

Every timer, listener, worker, browser or GPU allocation needs an owner and a
release path. State whether pending async work is cancelled or ignored on
shutdown. Keep shared assets separate from allocations owned by one instance.
These responsibilities require review; a passing check alone cannot establish them.

## CPU checks

Run `npm ci` with Node 24, then `npm run check`. Dependencies are pinned in
`package.json` and `package-lock.json`. The CPU command does not install a browser
or launch GPU work. Each group reports its status and has a 55-second deadline.
Browser scenarios are separate: install Chromium with `npm run browser:install`
and run `npm run check:browser` when the required approved assets are present.

The CPU command includes syntax, lint, runtime format, module budgets, dependency
resolution, unit tests, choices, story structure, language, bonds, facts and story
map checks. Individual commands are `check:syntax`, `check:lint`, `check:format`,
`check:budgets` and `check:dependencies`.

- ESLint enforces undefined names and unused bindings. Browser runtime modules
  do not receive Node globals. Node capture helpers explicitly declare their
  embedded browser context in `eslint.config.mjs`; plain tools do not inherit DOM
  globals. Inline suppression cannot bypass the check. Existing unused bindings
  are inventoried in `tools/check/lint-baseline.json`; new findings fail, and
  resolving or moving debt requires updating that inventory.
- Runtime formatting uses Prettier, 120 columns, single quotes, preserved property
  quoting and no embedded-language reformatting. `tools/check/format-runtime.mjs`
  also checks parsed syntax and string/template values. The two existing Node
  test drivers under `js/bonds/` are outside this runtime formatting pass.
- New runtime logic modules have a 400-formatted-line ceiling. Existing oversized
  modules have exact line and byte ceilings, a reason, owner and review reference
  in `tools/check/module-budgets.json`. Shrinking a file requires lowering its
  ceiling; removed or resolved exceptions must be retired. The check includes
  `.js`, `.mjs` and `.cjs` under `game3d/js/`. Authored story data is outside this
  budget. There is no universal byte cap or hard line-length limit for strings,
  shader text or other data; those remain subject to responsibility review.
- Dependency checks include static imports, re-exports and literal dynamic
  imports. Three.js aliases resolve against their actual vendored paths. Existing
  cyclic edges are recorded in `tools/check/cycle-baseline.json`; new edges fail,
  and removed cycles must lose their allowances. Nonliteral imports are reported
  for review because static resolution cannot determine their targets.

Do not raise a budget, broaden a lint exception or preserve a removed cycle to
make an extraction pass. Review the responsibility and update the evidence first.

## Change evidence

Refactors preserve saves, ordering, content and behavior. Each boundary gets
CPU checks and one normal fast run per viewport. Strict trace comparisons cover
dialogue, place lifecycle and navigation; focused regression checks address real
failures or uncovered risks. Comparable traces keep route, viewport, quality, seed,
initial storage and assets fixed and record source hashes. Keep failed captures
and investigate differences; do not drop physical or ordered state merely to
obtain an equal comparison.

Cross-team review and game-fact trailers follow the collaboration protocol and
GUIDE. Install the local hooks with `sh tools/check/install-hooks.sh`; the old
asset installer forwards to it. Pre-commit checks staged syntax, blocks private
paths and unallowed binaries using the staged asset policy, then runs `npm run
check` in a disposable public Git snapshot with its own dependencies and index.
It never stashes or replaces shared working files. Commit-msg requires one
`Facts: none` or `Facts: docs/game/<file>.md` line; a named fact file must be part
of the staged change. Attribution trailers may follow it.

Run `node tools/check/pre-commit.mjs` for the same check outside Git. Hooks are
locally bypassable. Receipt enforcement, committed-HEAD browser checks, pre-push
secret scanning and asset-lock/live-disk synchronization are deferred under
C-0080 so the runtime extractions can proceed.
