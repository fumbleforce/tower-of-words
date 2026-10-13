# Runtime globals before state extraction

Inventory from active `game3d/js`, boot setup and external writers consumed by the runtime, reviewed by `codex-agent:contracts_inventory` on 2026-09-29. This is a boundary inventory, not permission to remove globals. No computed `window[...]`, `Object.assign(window, ...)` or `globalThis` runtime registrations were found in this snapshot.

| Name | Initialization / writer | Readers and purpose | Persistence |
| --- | --- | --- | --- |
| `BUILD` | `index.html`, before module loading | runner, ui, sfx, ambience, mio, end: asset cache version | None |
| `__game` | main publishes the game before asynchronous boot | menu, onboard, ui, settings, cam, move, story, perf/batch, shell QA and browser tools | Contains references to saved flags/found state and unsaved scene/queue state; not itself serialized |
| `__settings` | settings, mutated by setSetting | cam and speech; other modules import the same object | localStorage `amakawa-settings` |
| `__qualityTier` | settings function alias | main renderer configuration; reads game renderer | Derived preference |
| `__onboard` | onboard state and hook wrappers | ui and menu: goals, hints, action labels, targeting | moved/talked/uses/sayUsed in localStorage `amakawa-onboard`; active/hold fields derived |
| `__shell` | menu object, methods and captured photos | end photos, shell QA, menu | Photos in sessionStorage `amakawa-photos`; API methods unsaved |
| `__shellBooted` | menu when hiding loader | boot watchdog and menu startup polling | Readiness latch, unsaved |
| `__lift` | places/lift when attaching lift | move reads active ride; lift capture tools inspect cars | Actual movement dependency, unsaved |
| `__ended` | end after displaying end screen | menu pause eligibility, testmode completion, QA | End-screen latch, no explicit false initializer |
| `__test` | testmode invoked by main for fast mode | ui changes voice timing; runner/sim append diagnostics; move/QA read route | Test-only driver state, unsaved |
| `__voiceLog` | ui during ordinary play and tests | fast tool records voice telemetry | Unsaved |
| `__moveCheck` | move instrumentation started by testmode | move writes diagnostics; fast/capture tools inspect | Unsaved |
| `__advance` | main only in capture mode | tools/feel/seq advances fixed simulation steps | Capture API, unsaved |
| `__run` | tools/feel/movement-scenes; no runtime initializer | main permits automatic simulation in capture mode | Capture input, unsaved |
| `__done` | main after first rendered frames; showcase separately | shot/style/look/perf/shell tools | Render readiness, not story completion |
| `__shellReady` | shell-qa after requested setup | a11y, shell-shots, talk-clicks | QA readiness, unsaved |
| `__line` | shell-qa synthetic dialogue counter | talk-clicks | QA counter, unsaved |
| `__idleT` | tools/characters/view.html query input | avatar overrides Eric idle reference time | Preview input, unsaved |
| `__styleId` | No active initializer found | style/index fallback after query parameter | Optional external visual input, unsaved |
| `__style` | post when style exists | Console tuning API; no executable runtime reader found | Mutable presentation references, unsaved |
| `__show` | showcase/main | showcase-shots modifies view/look and renders | Standalone showcase API, unsaved |
| `__roomRect` | showcase/main | showcase-shots crop bounds | Standalone showcase API, unsaved |
| `__bench` | showcase/main | showcase-shots GPU timing | Standalone showcase API, unsaved |

`__game`, `__lift`, `__onboard`, `__settings` and `__qualityTier` affect ordinary play. Preserve those dependencies during extraction. Keep render readiness (`__done`), loader readiness (`__shellBooted`), QA scene readiness (`__shellReady`), end-screen state (`__ended`) and route completion (`__test.done`) distinct.

Tool-injected values such as `__mv`, `__evErr`, `__arr`, `__sim` and `__sfxCtx` are outside this runtime inventory: tools both inject and consume them.
