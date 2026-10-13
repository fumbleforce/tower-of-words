# Architecture and code quality review

2026-09-29. Proposal for Jørgen and Claude, requested in C-0016. No game refactors in this review. Start implementation only after Jørgen approves the scope and Claude releases the affected files.

The first change should make the existing checks fail reliably. Both `story-check.mjs` and the final result in `fast.mjs` can report a failure while the process succeeds. Then replace source-text discovery with explicit contracts, establish reproducible tools and formatting, and split modules along their responsibilities. Keep the browser ES modules, Three.js and current story format.

This audit inspected the shared working tree, including ongoing edits, at HEAD `477b5f50d34ffffa6ea780feac5cefd142e7a9e0`. Line references describe that snapshot and can move. Game facts and their documentation belong to the separate [game facts proposal](../docs/game-facts-proposal.md). This plan does not make source scraping the authority for the setting or story.

Revision after Claude's C-0019 review: the wider tooling/global inventory and three scraper dependencies were checked at HEAD `4f97a94edd32bb413201653293951716d7fd6bd1`, including uncommitted work. The first-stage option now includes contracts, pinned tools, enforcement and a formatting freeze. Broad formatting must follow scraper migration: doing it first can silently change the facts those tools discover. User approval remains pending.

## Skills installed and used

I used find-skills to discover candidates, inspected their instructions and repository trees, then installed these Markdown-only skill directories with the Codex skill-installer. Installation did not execute code from those repositories.

| Skill | Source and pinned revision | Use in this review |
|---|---|---|
| clean-architecture 1.4.0 | [wondelai/skills](https://github.com/wondelai/skills/tree/c172996495bed0fcd26896a9416b2093fd7073f0/clean-architecture) | Dependency direction, module ownership, isolating rules from browser effects |
| clean-code 1.4.0 | [wondelai/skills](https://github.com/wondelai/skills/tree/c172996495bed0fcd26896a9416b2093fd7073f0/clean-code) | Readability, duplication, error paths and small tested refactors |
| requesting-code-review, no declared version | [obra/superpowers](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d/skills/requesting-code-review) | A bounded review brief, explicit requirements and concrete findings before integration |

They are installed under `~/.codex/skills/` and become available automatically on the next turn. Selection considered fit and source inspection, not just popularity. Humanizer was used to edit this report.

Use the skills as review aids. This project does not need an enterprise class hierarchy, four mandatory architecture layers, or four-line functions. GUIDE's requirement to report evidence takes precedence over the skills' numerical self-grading. Claude's review remains the independent review required by our collaboration protocol.

## Current structure and hotspots

There are useful boundaries already: `bonds/model.js` is testable without a browser; story files contain data; place factories assemble scenes; the renderer uses a single frame loop. Preserve those while reducing the dependencies between them.

Measured recursively across `.js` and `.mjs`, excluding vendor files: `game3d/js` has 60 files, 15,853 lines and 1,021,196 bytes; `game3d/story` has eight script files including placeholders, with 1,546 lines; `game3d/tools` has 36 scripts, with 3,119 lines. These are physical line counts, not complexity scores.

| File | Lines / bytes | Long lines over 160 characters | Responsibilities now |
|---|---:|---:|---|
| `js/ui.js` | 874 / 63,383 | 60 | Audio buses, voice playback, music, portraits, text rendering, teaching prompts, HUD and menus |
| `js/main.js` | 862 / 53,239 | 40 | Startup, shared state, rendering, input, interactions, story hooks, movement effects, travel, frame loop |
| `js/move.js` | 842 / 55,252 | 26 | Crowd collision, player steering, scripted walks, picking, path preview, movement diagnostics |
| `js/scenes/office.js` | 774 / 67,612 | 90 | Office geometry, furnishing and animated object state |
| `js/places/train.js` | 675 / 52,528 | 51 | Train scene assembly, camera, ride motion, NPCs, interactables and story hooks |
| `js/menu.js` | 656 / 41,969 | 41 | Shell, title, pause/settings, camera captures, target cycling and onboarding integration |

Long lines hide the work a module does. Splitting a file into arbitrary numbered pieces would preserve that problem. `ui.js:87` has voice lifecycle logic; `ui.js:245` stages portraits; `ui.js:315` interprets known words; `ui.js:405` starts the UI controller. Those are practical extraction boundaries.

## Findings in priority order

### 1. The checks are not yet a reliable refactor safety net

`game3d/tools/story-check.mjs:83` prints the problem count without setting an exit code. I ran an in-memory copy of the checker with one imported train node changed to jump to a missing node. It printed the missing-node diagnostic and `1 problem(s)`, then exited **0**. No story file was modified.

`game3d/tools/fast.mjs:61` prints PASS/FAIL, but lines 64 through 67 add movement errors afterward, and the file ends without setting failure status. Evaluating only its reporting block with an unfinished route printed FAIL without an exit assignment. A completed route with one simulated overlap printed PASS before appending the overlap error. This is a reporting defect demonstrated without running the game.

First fix: collect all findings, compute one final result, emit that result, then return a nonzero exit status for failure or timeout. Diagnostic overrides such as `MOVE_WARN`, `VOICE_WARN` and `SKIP_CHECKS` must appear in the result so an overridden run cannot be mistaken for a full pass. Add small tests of the result aggregation and an invalid-story subprocess fixture. Preserve fast-test duration limits.

### 2. Story semantics have multiple implementations that already disagree

`js/runner.js:43` evaluates conditions, `tools/story-check.mjs:28` compiles a second copy of the condition transformation, and `bible/story-graph.js:16` implements its own parser. The Runner accepts `n + 1 > 2`; the graph rejects the `+`. With `n = 2`, the Runner evaluates `!n == 1` as false, while the graph parses it as `!(n == 1)`. These probes show grammar and precedence drift; they do not establish that a current scene contains either expression.

Trigger ordering and `once` rules also live in the Runner (`runner.js:86`) and graph interpretation. Share pure condition parsing/evaluation and trigger matching under the story runtime. Extract the current evaluator first and characterize its accepted expressions before considering a grammar change. A deliberate narrowing of the grammar is a separate content migration.

The bible may consume shared technical syntax helpers if its owner keeps the graph. That does not authorize deriving game facts from source code. Coordinate this boundary with Claude's documentation work.

### 3. State and audio imports form cycles

Verified imports form `ui.js → mastery.js → runner.js → ui.js` (`ui.js:5`, `mastery.js:11`, `runner.js:2`) and `ui.js ↔ sfx.js` (`ui.js:139`, `sfx.js:6`). The UI-to-SFX edge is a dynamic import. A current visual workstream also has `props.js ↔ look/detail.js` (`props.js:9`, `look/detail.js:10`). These cycles can work today; they constrain initialization order and make isolated imports difficult.

Move flags and state access out of the Runner. Put audio context, buses and mute state in an audio service used by both UI and SFX. Keep primitive prop/material helpers below both plain and detailed prop builders. Do the visual change only with that workstream's owner. Do not introduce a general event bus just to disguise the cycles.

### 4. Runtime modules depend on hidden globals and startup side effects

The revision scan found 104 textual `window.__*` references across 22 names in `game3d/js/**/*.js`, including comments. `__game` accounts for 21 references; `__onboard` for 15; `__settings` for 13. These are scoped text counts, not a complete runtime-access analysis. `main.js:81` publishes mutable state; `move.js:215` reads it as a constructor default; `menu.js:636` polls until it exists. `ui.js:7` modifies the DOM on import, and `runner.js:10` fetches audio data on import. Even `engine.js:9` reads `location` before a caller can use its navigation class.

| Current state | Intended owner |
|---|---|
| `__game`, `__onboard`, `__settings`, `__shell`, `__lift`, `__qualityTier`, `__ended` | Explicit session/controller/service dependencies; these affect ordinary play, including goal suppression at `ui.js:497` |
| `__style`, `__styleId`, `__idleT` | Rendering or animation configuration/state, with debug access kept separate |
| `__test`, `__moveCheck`, `__voiceLog`, `__advance`, `__run`, `__line` | One opt-in `window.__testmode` adapter; temporarily keep aliases for existing tools |
| `__done`, `__shellBooted`, `__shellReady`, `__show`, `__roomRect`, `__bench` | Explicit readiness/debug interfaces for the relevant page; classify each caller before consolidation |
| Exported `flags`, `known`, `seen`, `sim`, `bonds`, `settings`, `audioKeys` | Include in the same ownership inventory; an ES-module export can still expose shared mutable state |

For each name, record readers, writers, initialization, reset/save behavior and its replacement. Stage 2 records the full inventory; migrate real state and diagnostic callers in the later module splits. A single namespace is useful only if production modules stop relying on it.

This shows up in the CPU tests: `choice-check.mjs:10` registers a loader that replaces UI imports and supplies browser/fetch globals before importing the real Runner. Keep the existing test while extracting a Runner that accepts presentation, state, audio and timing dependencies explicitly. Pass the game to controllers at startup; retain `window.__game` as an intentional debug adapter during migration.

### 5. Ownership is obscured by method wrapping

`sim.js:46` wraps `runner.run` and `runner.trigger`; `menu.js:589` wraps `markers.update` to choose the current target. Both add stateful behavior after construction. A developer editing either original method must know about the wrappers.

Provide explicit callbacks for node/trigger observation, with defined ordering. Let the interaction controller own target selection, with the menu calling `cycleTarget()`. Preserve nested story calls, `once` behavior, queued events and target locking in characterization tests before removing each wrapper. The existing `game.onNode` and `game.onTrigger` callbacks are starting points, but their timing must match current behavior before reuse.

### 6. Browser jobs copy policy, cleanup and environment assumptions

The wider revision scan found 47 files containing `/home/jorgen/ai/opening/node_modules/playwright`: 22 directly in `game3d/tools`, five in its `perf/`, three in `speech/`, four in `game3d/qa`, one in `js/bonds`, and twelve under repository `tools/`. This excludes vendor, cache and legacy trees. The scan is broader than the eleven screenshot scripts in the original audit. `tools/bible/check.mjs:11` uses a configurable dependency location outside the repo and is an additional migration target.

Some jobs rely on a shell wrapper; printer/lunch scripts own browser and GPU markers; lift captures have a separate hard timeout. `tools/with-browser-lock.sh` and `tools/perf/locked.sh` are near duplicates. `hud-shots.mjs:12` and `words-menu-shots.mjs:12` also duplicate page creation, onboarding storage, navigation, title dismissal and waits.

The working tree is migrating to per-process browser markers. `fast.mjs:36`, printer/lunch jobs and the shell wrappers use `browser.lock.<pid>`, while `js/bonds/day1-check.mjs:13` still uses the old exclusive marker. Several comments still describe exclusivity. The wrappers themselves do not implement the load check in GUIDE. This is policy spread across entry points, not a reason to restore serialization.

Consolidate into one repository tooling helper that owns load admission, per-process markers, GPU acquisition, browser launch, an overall deadline and cleanup in `finally`. Put game-specific startup in `game3d/test/support/open-game.mjs`: `openGame(browser, { viewport, onboard, route, quality })` owns context/page creation and title startup. Return a page plus explicit readiness/settled helpers. The defaults must preserve a fresh player's onboarding; each scenario requests any storage setup it needs. Avoid fixed sleeps when there is an observable condition.

Use one git-ignored output directory per run, such as `game3d/shots/<job>/<run-id>/`; `fast.mjs:60` currently overwrites one file per viewport. Keep scenario steps and assertions in the callers, and put general creator/assets/browser support in `tools/lib`, without importing game onboarding code there. Pin Playwright locally as described below. Migrate callers only after their owners release them.

Codex's new `tools/creator/browser-job.mjs` already implements much of this lifecycle. Review and generalize that helper with its owner instead of writing another version. Validate failure, launch rejection, timeout and interrupt paths, including cleanup after the child browser exits.

### 7. Structural validation relies on source layout

Three consumers depend on where and how engine code is written:

| Consumer | Source assumptions that a move or formatter can break |
|---|---|
| `game3d/tools/story-check.mjs:10` | Hand-copied commands; word/speaker regexes; indentation and brace scanning for hooks, spots, people and events |
| `tools/facts/check.mjs:98` | Literal declarations in Runner/UI/sim; `things` label/kind layout at line 110; Mio's insertion in `main.js` at line 114 |
| `bible/story-graph.js:104` | `NEXT`, `PLACES` and imports in `main.js`; flag writes in a fixed `ENGINE_FILES` list; hook indentation and `game.event` calls at line 134 |

`choice-check.mjs:40` additionally verifies a precise source-text pattern for inventory deduction, then reproduces the give flow in its test. Formatting these files before migrating the consumers can quietly reduce discoveries even when the game still runs.

Before bulk formatting or file moves, create small importable structural declarations, exposed through `narrative/contracts.js`: things and their labels/kinds, spots, seats, zones, speakers, portrait IDs, items, hook names, events, transitions and engine-written flag names/prefixes. Keep domain declarations in their owning modules; the contracts entry point can re-export them. Runtime construction must use the declarations or validate registered IDs against them, so this does not become an unused parallel catalogue. Remove superseded source literals rather than maintain duplicate copies.

Migrate all three consumers with the facts-docs owner. Compare their discovered ID sets and graph edges before/after, and add a fixture that omits a registration and must fail. Missing declarations or failed imports must be errors, not empty collections. Facts docs remain authored requirements, checked against these implementation declarations; prose is not generated from them. Test the actual extracted gift operation rather than matching source spelling. Update the language audit's source reads where the same move affects them.

`lang-audit.mjs:37` also has a hand-maintained main-route list. For now it should remain an explicit test fixture with a consistency check. Replacing it with a second general story interpreter would add more semantics to maintain.

### 8. Presentation, persistence and simulation share a module

`sim.js:66` advances the period and updates UI, schedules and storage together. `sim.js:282` renders People HTML; `sim.js:324` serializes mutable runtime state into localStorage. Isolate save encoding/validation from the storage adapter, and move People rendering to UI. Preserve the existing save key/version and migration behavior during extraction. The bond model's JSON round-trip test does not cover a whole-game restore with flags, knowledge, inventory and schedules. Add that characterization fixture in stage 2, before any state extraction, and check its expected behavior with the owner of `docs/game/systems.md`'s saving section.

### 9. Dead-code candidates need a focused deletion pass

A reference search across active game, tools and bible JavaScript/HTML found no consumers of `story.js:8` (`WHO`), `story.js:23` (`offerCmd`) or `engine.js:27` (`makeComposer`). The private `ui.js:148` helper `thump` has no calls; `noise` is used only by it. `main.js:3` imports `Walker` but uses `SmoothWalker`.

These are candidates, not a license to delete exports based on a text search. Check dynamic uses and retained development pages before removal, then delete them in a separate reviewed change. `walkPerson`, `stepPeople` and `lookAt` in `story.js` are used by places and are not dead. Rename or move those helpers by their movement responsibility later. No file tracked by the asset manifest is part of the deletion pass.

### 10. Tool placement does not distinguish pipelines from finished experiments

`tools/` has 113 top-level entries, including numbered rounds, page generators and repeated model experiments. Checks are spread across `game3d/tools`, `game3d/qa`, `tools` and `js/bonds`. Inventory entry points and callers before relocating anything. Reusable production pipelines get `tools/<pipeline>/`; reusable tooling gets `tools/lib/`; active experiments live with their pipeline until finished. Move finished one-off scripts to `legacy/tools/<pipeline>/<round>/`, preserving their recipe/reference links. Archive code by an explicit reviewed list; do not move manifest assets as a side effect.

## Proposed module structure

Use ordinary ES modules and explicit function parameters. Keep existing import paths as short compatibility facades while callers move. Add folders only when extracting a concrete responsibility.

```text
game3d/js/
  main.js                    startup wiring and boot entry
  runtime/
    session.js               state and lifecycle ownership
    loop.js                  frame scheduling, pause and time scale
    rendering.js             renderer, composer, quality and resize
    places.js                prepare, enter and travel orchestration
  gameplay/
    interactions.js          use, talk, say, gift and target selection
    simulation.js            period/schedule/bond integration
    save.js                  encode, validate and restore saved state
  narrative/
    conditions.js            shared expression semantics
    triggers.js              ordered matching and once behavior
    runner.js                execute steps through explicit adapters
    contracts.js             step and hook structural declarations
    hooks/                   movement, presentation and game operations
  ui/
    dialogue.js              line/choice lifecycle
    portraits.js             portrait state and layout
    hud.js                   goals and target prompts
    practice.js              typed/spoken command prompt
    shell.js                 title, pause and settings presentation
  audio/
    context.js               buses, volume and mute ownership
    voice.js                 playback/cancellation and sequencing
    music.js                 loops and ducking
    sfx.js                   effect playback
  movement/
    navigation.js            walk grid and path calculation
    walker.js                player steering
    crowd.js                 spacing and passing
    scripted.js              scripted rig movement
    preview.js               visual path feedback
  places/, scenes/, train/   retain current place/scene responsibilities
  bonds/                     retain the existing pure bond model

game3d/story/                authored story data and format documentation
game3d/test/
  unit/                     pure rule and lifecycle tests
  integration/              Runner, save/restore and contracts
  browser/                  fast routes and focused browser assertions
  support/                  open-game, fixtures and trace comparison
game3d/tools/shots/         capture scenarios without pass/fail test suites
tools/check/               check coordinator, size/cycle/review gates
tools/lib/                 shared browser jobs and other tool services
tools/<pipeline>/          assets, creator, speech and other pipelines
legacy/tools/              reviewed archives of completed round scripts
ARCHITECTURE.md             short module map and engineering rules
```

Rule: gameplay and narrative rules can run with plain state and fake adapters in Node. UI and rendering call those rules; rules do not import DOM/audio implementations. `main.js` chooses concrete implementations. Geometry stays close to its place or prop; shader code and static story content can be large when keeping it together helps editing.

For office scene work, first extract named room builders such as kitchenette or copier area behind the existing scene factory. Keep anchors, collision bounds and hook references owned by one place definition. Preserve object IDs, node IDs, save fields and story authoring syntax through all mechanical moves.

Existing check paths remain forwarding entry points while callers move; each check still has one implementation. Facts and bible checks can stay beside those tools, registered in the shared check command. The eventual `ARCHITECTURE.md` owns the engineering rules and placement map; GUIDE, AGENTS and CLAUDE link to it. This proposal remains the audit record, not another permanent copy of those rules.

## Reproducible tools and enforceable checks

Propose a root `package.json` with `private: true`, exact development dependency versions and a committed lockfile. The checked candidates are `playwright@1.63.0`, `eslint@10.11.0`, `prettier@3.9.9` and `madge@8.0.0`; Playwright matches this machine's existing installation. Their published Node engine ranges accept the installed Node `24.21.0`. These are proposed pins, not installed or integration-tested packages. Record the tested Node/npm versions when building the package and validate any root `type` setting against existing scripts instead of changing module interpretation casually. Version metadata: [Playwright](https://registry.npmjs.org/playwright/1.63.0), [ESLint](https://registry.npmjs.org/eslint/10.11.0), [Prettier](https://registry.npmjs.org/prettier/3.9.9), [Madge](https://registry.npmjs.org/madge/8.0.0).

A fresh checkout uses `npm ci`, the pinned Playwright browser install command, and the asset team's documented pull command when a browser scenario needs assets. CPU checks must not download browsers or launch GPU work. The lockfile makes dependency installation reproducible; Playwright's browser binaries also need installation. [npm documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/), [Playwright library setup](https://playwright.dev/docs/library).

`npm run check` should coordinate choice-check, story-check, the CPU bond test, facts/check, story-map-check, lint, formatting verification and module budgets. Target under one minute for a warm CPU run, then measure it; report each subcommand's status and timeout. Expose browser routes separately as `check:browser`, so a CPU gate never unexpectedly opens Chromium. Each stage below runs both facts and story-map checks, even for a mechanical move.

Use an ESLint flat config for browser modules and Node tooling separately, initially enforcing `no-undef` and `no-unused-vars`. Ignore vendor, generated output and archived code explicitly. Existing failures get a reviewed inventory; extraction cannot silently add suppressions. Use Madge with a tested resolver for relative modules and Three.js import-map aliases, checking static and literal dynamic imports. Keep exact existing cycle components in a temporary baseline; fail on a new cycle or unresolved internal import. Include an injected-cycle fixture so the check proves it sees the patterns this repo uses. [ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files), [Madge documentation](https://github.com/pahen/madge).

Use Prettier `printWidth: 120` with string, template and embedded-language handling reviewed first. It is a formatting target, not a hard line-length requirement. Do not add ESLint `max-len` across dialogue, URLs, shader strings or data: it can demand manual changes that the formatter deliberately leaves alone. `prettier --check` enforces the agreed format, and `--debug-check` supplies an extra correctness check for the mechanical pass. [Prettier options](https://prettier.io/docs/options#print-width), [Prettier CLI](https://prettier.io/docs/cli#--debug-check).

After formatting, record per-file line/byte ceilings in `tools/check/module-budgets.json`. New runtime logic modules have a default ceiling of 400 formatted physical lines. Existing oversized files cannot grow beyond their recorded ceiling without a separately reviewed exception. Scene/data/shader exceptions name a reason, owner and review reference. Lower the recorded ceiling when extraction shrinks a file; never compare formatted code against today's compressed line counts. Budget checks supplement responsibility review and must not encourage arbitrary file splits or compressed statements.

Share hook ownership with the asset team. One hook package owns `pre-commit` for staged-tree checks and `commit-msg` for trailers; the latter is where Git supplies the final commit message. Do not overwrite an asset hook or install competing managers. Check the staged snapshot without stashing another agent's work. Proposed runtime/shared-tool commits name the review entry in `Reviewed-by: C-...` or `X-...`, alongside the facts trailer required by the docs workflow. Review evidence records the file set and reviewed diff hash; a trailer alone does not prove that the staged change was reviewed. The same checker must be runnable outside hooks, since local hooks are bypassable.

## Safe sequence and proof for each step

Each row is a separately reviewable change, with a temporary file claim and its own rollback. Do not combine story edits, visual tuning or new features with extraction. Every row runs `node tools/facts/check.mjs` and `node tools/bible/story-map-check.mjs` in addition to the named checks; once wired, `npm run check` includes them.

| Order | Change | Proof before moving on |
|---|---|---|
| 0 | Fix checker exit status and final result aggregation; record a baseline on a frozen file set | Invalid-story fixture exits nonzero; movement failure cannot print PASS; CPU checks; phone/desktop fast results including facts and story-map checks |
| 1a | Add pinned package/lockfile and check commands; inventory callers and current diagnostics | Fresh-install smoke in a temporary checkout; CPU checks do not require the external opening repo; record unresolved lint and import issues explicitly |
| 1b | Share browser lifecycle and game startup; migrate two released callers first | Fake-browser failure/timeout/interrupt tests; one small capture per migrated path when admitted; unique outputs and correct cleanup; facts/story-map checks |
| 2a | Publish structural declarations and migrate all three scrapers with the docs owner; add global inventory and save fixture | Same discovered IDs and graph edges; missing-registration negative test; whole-game save/restore including legacy data; choice/story/bonds/facts/story-map checks |
| 2b | One mechanical runtime formatting pass in a declared freeze, then activate lint/format/size/cycle gates | Prettier correctness check, unchanged string/template values, full CPU checks, both fast viewports and equivalent behavior traces; baseline sizes measured after formatting |
| 2c | Extract flags/state access and condition semantics, keeping current facades | Runner fixtures for `know_`, precedence, `once` peeks and queued events; save fixture; full CPU checks and fast traces |
| 3 | Extract audio and dialogue/portrait modules, one boundary at a time | Voice/cancel/pause failure tests; full CPU checks and fast traces; focused real-time audio and phone/desktop dialogue inspection because fast mode suppresses audio |
| 4 | Extract main's hooks, interaction operations and place lifecycle in its own freeze | Actual gift-operation tests; travel/target locking; save fixture; full CPU checks, fast traces and selected composition screenshots |
| 5 | Separate navigation, crowd movement and previews; then room builders as needed | Deterministic blocked-path/arrival/spacing tests; soft-collision test when admitted; full CPU checks, fast traces, targeted geometry views and comparable performance measurements |
| 6 | Consolidate test/capture/pipeline locations; archive finished one-offs; delete confirmed dead runtime code | Reviewed entry-point/reference inventory; forwarding commands; full CPU and affected browser checks; no manifest asset moved or deleted |

Freeze means Claude confirms the exact files, owners finish or save their work, and the coordinator records the start snapshot and reopen condition. Use one bounded window for formatting all released `game3d/js` runtime files, after scraper migration, and another for the hot `main.js` split. If a file cannot be released, defer the whole mechanical pass or explicitly narrow it before starting. Reopen editing only after the standalone formatting diff is reviewed and validated.

For stages 2b through 5, capture a before/after fast-run trace with the same route, viewport, quality, seed, initial storage and asset manifest. Log ordered node/trigger transitions, place sequence, final flags/known words and save JSON. Normalize only documented nondeterministic fields such as wall timestamps and visual-only jitter; preserve array/event order. A seeded random source alone does not make timer-driven gameplay deterministic. Compare logical checkpoints, investigate ordering differences, and record baseline file hashes with each run. These are planned fixtures, not existing test coverage.

Run CPU checks immediately and fast checks in the background before calling an extraction verified. The default driver takes the first reply and has a separate social route; include alternate gate/lunch routes when changing narrative execution, simulation or movement. Record unfinished checks explicitly. No single speedrun proves every branch.

Suggested first implementation scope is stages 0 through 2c, including the tooling package, shared setup, contracts, formatting and enforcement. Reassess later module splits after that. Stage 0 can be approved independently. Approval does not release another team's files or authorize the coordinator to declare its freeze unilaterally.

## Engineering standards and asset coordination

The proposed `ARCHITECTURE.md` will own the enforceable configuration and placement rules above. GUIDE, AGENTS and CLAUDE should link there after approval. It also records responsibilities that require human review:

- Give a module one named responsibility and a small documented interface. Main wires dependencies; lower-level rules accept state/services explicitly. New imports must not introduce a cycle.
- Put shared browser admission, deadlines, cleanup and artifact naming in the tooling helper. Every automated check must return failure status when its assertions fail. Tests use the same operation being shipped, with explicit fakes only at external boundaries.
- Every timer, listener, worker, browser or GPU resource needs a named owner and a release path. Caches must distinguish shared assets from per-instance allocations. Async operations state what happens on cancellation or late completion.
- Refactor in small steps with preserved behavior, focused checks and an independently reviewed diff. Keep save/content compatibility explicit. Follow the existing review-before-completion rule in the collaboration protocol; review defects are resolved before a change is called ready.
- Update the approved game-fact docs in the same change when behavior changes. Mechanical extraction should keep those facts unchanged. Any derived diagram must disclose its limits and use the approved documentation plan.

Coordinate the ignored capture root, manifest exclusions and shared hook entry points with the [asset storage work](asset-storage-proposal.md) and its current implementation owner. Captures referenced by a review need retention/sync through that workflow, not ordinary temporary-output cleanup. Keep reusable helper code in `tools/lib`; asset sync remains in `tools/assets`. Do not archive or delete a manifest path as part of code cleanup. Any future history rewrite gets a separate quiet window outside this refactor, because it invalidates branch, review and baseline hashes.

## Validation and remaining limits

CPU checks run for this review: `node game3d/tools/choice-check.mjs` passed; `node game3d/tools/story-check.mjs` printed `story check: ok`; `node game3d/js/bonds/test.mjs` passed 14 tests. The two reporting probes and condition-parser probes above ran without browser rendering or repository source changes.

Revision checks: `node tools/facts/check.mjs` passed with five documented pending items; `node tools/bible/story-map-check.mjs` loaded 186 nodes and reported its existing three unreachable-node and nine unread-flag notices. Those notices remain findings to assess, not claims of complete story coverage. No game source, package configuration or hooks were changed for this revision.

I accidentally included `js/bonds/day1-check.mjs` in the CPU batch, then interrupted it after inspecting its browser setup. It has no usable result. No browser/GPU run supports the conclusions in this report. Full fast playthroughs, audio verification and visual comparisons remain implementation gates, not completed evidence.

The dependency scan was a literal import scan followed by manual verification of the reported cycles. Dead-code findings are scoped reference searches, not whole-program reachability proofs. Active visual and documentation edits may change the listed files before a freeze; refresh the baseline before implementation.
