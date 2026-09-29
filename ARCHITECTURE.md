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
characterization tests, CPU checks and the relevant fast routes. Comparable
traces keep route, viewport, quality, seed, initial storage and assets fixed and
record source hashes. Keep failed captures and investigate differences; do not
drop physical or ordered state merely to obtain an equal comparison.

Cross-team review and game-fact trailers follow the collaboration protocol and
GUIDE. The staged-snapshot hook package is still being implemented; the current
checks are runnable commands, not an installed Git hook guarantee.
