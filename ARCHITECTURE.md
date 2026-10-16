# Code structure and checks

Working rules are in [GUIDE.md](GUIDE.md), and file claims and any code freeze in
[collab/PROTOCOL.md](collab/PROTOCOL.md). The remaining extractions are in
[notes/architecture-review.md](notes/architecture-review.md), and the evidence in
[notes/refactor-progress.md](notes/refactor-progress.md).

## Responsibilities

- `game3d/js/` owns browser runtime code. Main composes the game; reusable rules
  accept state and services explicitly. Each module is responsible for one named
  part of play. Keep existing import facades working.
- `game3d/story/` owns authored narrative data. Structural IDs and declarations
  shared with tools live in runtime modules under `narrative/`, `places/` and
  `gameplay/`. Authored game facts belong in `docs/game/`.
- `game3d/js/narrative/state.js` owns the shared flags object and its condition
  evaluator. Pure condition compilation lives in `narrative/conditions.js`, which
  story checking and graph validation use too.
- `game3d/js/audio/core.js` owns the shared context, volume buses, voice clips,
  mute and pause state. `audio/music.js` owns loop crossfades and ducking. Sound
  effects use the audio core directly.
- `game3d/js/ui/portraits.js` owns portrait state and layout, `ui/dialogue.js` the
  dialogue methods of the UI object, and `ui/dialogue-text.js` overheard text and
  reveal timing.
- `game3d/js/narrative/hooks/` owns global hook registration by responsibility:
  targets, movement and saved staging, presentation, gestures, kotodama effects,
  and progression. Main injects the game and rendering/travel dependencies.
- `game3d/js/gameplay/interactions.js` installs marker availability, use/talk,
  Say practice and gifting against the shared game. Main retains input routing.
- `game3d/js/places/lifecycle.js` owns preparation, entry, travel and opening
  dispatch. Main injects place factories and rendering/marker callbacks and keeps
  boot/Continue orchestration.
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
Review checks these; a passing check alone can't.

## CPU checks

Run `npm ci` with Node 24, then `npm run check`. It installs no browser and runs
no GPU work, and each group has a 55-second deadline. Browser scenarios are
separate: `npm run browser:install`, then `npm run check:browser`.

It covers syntax, lint, format, module budgets, dependencies, unit tests, choices,
story, language, bonds, facts and the story map. Single groups: `check:syntax`,
`check:lint`, `check:format`, `check:budgets`, `check:dependencies`.

- ESLint enforces undefined names and unused bindings. Browser runtime modules
  get no Node globals, and plain tools get no DOM globals (`eslint.config.mjs`).
  Inline suppression can't bypass it. Existing findings are listed in
  `tools/check/lint-baseline.json`; new ones fail.
- Runtime formatting uses Prettier, 120 columns, single quotes, preserved property
  quoting and no embedded-language reformatting (`tools/check/format-runtime.mjs`).
- New runtime modules under `game3d/js/` have a 400-line ceiling after formatting.
  Existing oversized modules have exact ceilings with a reason and owner in
  `tools/check/module-budgets.json`. Shrinking a file means lowering its ceiling.
  Story data is outside the budget.
- Dependency checks cover static imports, re-exports and literal dynamic imports.
  Existing cycles are listed in `tools/check/cycle-baseline.json`; new ones fail,
  and a removed cycle loses its allowance. Nonliteral imports are reported for
  review.

Do not raise a budget, broaden a lint exception or preserve a removed cycle to
make an extraction pass. Review the responsibility and update the evidence first.

## Change evidence

Refactors preserve saves, ordering, content and behavior. Each boundary gets
CPU checks and one normal fast run per viewport. Strict trace comparisons cover
dialogue, place lifecycle and navigation, with route, viewport, quality, seed,
storage and assets fixed. Keep failed captures and investigate differences; never
drop state just to get an equal comparison.

## Commit gate

Install the hooks with `sh tools/check/install-hooks.sh`. Hooks are locally
bypassable; land re-checks every commit it takes in.

- Pre-commit checks staged syntax, blocks private paths and unallowed binaries,
  then runs `npm run check` in a disposable Git snapshot with its own
  dependencies and index. It never stashes or replaces shared working files.
  `node tools/check/pre-commit.mjs` runs the same check by hand.
- Commit-msg requires one `Facts: none` or `Facts: docs/game/<file>.md` line, and
  a named fact file must be part of the staged change. Attribution trailers may
  follow it.
- After a commit that touches game3d/, post-commit checks in the background that
  it boots to the title screen (tools/check/head-boot.mjs; result in
  .git/head-boot/latest.txt). tools/land.sh runs the same check on what it lands
  and fails loudly. The land queue, batches and place budgets: the land skill.
- Pre-push and game3d/tools/deploy-pages.sh run a gitleaks secret scan
  (tools/check/secrets.sh, rules in .gitleaks.toml, plus every key in the local
  .env) and refuse to push on a finding.

## Tool state and outputs

No gigabytes in git or `.git`. Tool state never goes inside `.git`.

- Tool state lives in `~/.cache/amakawa/<name>/`, through the one helper
  `tools/lib/cachedir.py` (`python3 tools/lib/cachedir.py <name>` or
  `cache_dir(name)`). Current folders: `pages-cache` (the bible's WebP copies)
  and `codex-reviews` (Codex review packets and reports).
- Check snapshots (`tools/lib/git-snapshot.mjs`) are temporary copies in
  `.git/snapshots`. A run removes its own copy when it ends, or on SIGINT or
  SIGTERM. The next run removes the copies of processes that have stopped.

The commit gate (`tools/check/staged-assets.mjs`) applies these rules to every
staged file. `tools/check/commit-cpu.mjs` applies them to every commit that a
land takes in, so a commit made with `--no-verify` cannot reach main.

- Binaries go to asset storage: a sync.json root, then
  `python3 tools/assets/sync.py push`.
- A text file over 2 MB is refused. The exception is a file in a folder listed
  in `large_allow` in `tools/assets/sync.json`, the shipping game asset folders.
  Those folders take files up to 16 MB.
- Pictures and video under any `shots` folder are refused. Game captures go to
  `game3d/shots/<job>/`, which git ignores. Other scratch output goes to
  `~/.cache/amakawa/<name>/`.

`python3 tools/outputs.py prune` deletes untracked scratch output (game captures, art candidates and renders, bible captures) that has not changed for 14 days, except anything a Review, Showcase, bible, asset library, spend ledger or game code path names. It is a dry run unless `--apply` is given, never touches the private folder, approved or live assets or retired files, and logs each deletion to `~/.cache/amakawa/outputs-prune.log`.
