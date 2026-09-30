# Day-1 contextual Talk draft

Writing draft for #106 / C-0207, inspected against shared checkout ffd6f3d8 on 2026-09-30; Codex finalized the wording and scope. No implementation; Claude's fallback node/key contract is pending. Conditions below are semantic routing requirements, not proposed engine syntax. Existing talk routes win. A body hidden by a schedule stays hidden. Scripted scenes still finish before another conversation starts.

## Office first

The reported copy-room problem has two parts. `story/office.js:49-56` already gives Mio a complete Talk chain ending in `mio_busy`. `story/office.js:105` suppresses her marker between the repair request and the repaired copier. Removing that suppression restores Talk, but a fallback selected only when no talk node exists will still produce `mio_busy`. The copy-room line needs a branch in the existing route, above `mio_busy`.

| Person / free-play context | Response to use |
|---|---|
| Mio; `got_ticket && !copier_done`, goal “Go to the copy room with Mr. Mori.” | New: “Copy room is across the corridor. Mori-san is already there... probably bowing to the copier again.” `emo: 'casual'`, neutral face. Mori has already walked over; this returns the player to that task without repeating her handoff. |
| Mio; `machine_open && !chair_back`, chair still in the machine room | Reuse `mio_busy`'s existing morning response. The chair has its own action; do not turn Talk into another automatic chair push. |
| Mio; `chair_back && !got_ticket` | Existing `ticket` route; retain the old-save recovery. |
| Mio; `copier_done && !ticket_closed` | Existing `ticket_done` route. |
| Mio; afternoon | Existing `mio_tomatte_echo` when due, then `mio_busy`. |
| Mori; greeted, before/after copier, before afternoon | Restore access to existing `mori_copier_hint` when `got_ticket && !copier_done`, otherwise `mori_again`. Once Mori is standing at the copier, use `mori_again`; the copier hint is only for catching him on the walk over. `show.mori` currently suppresses these morning routes too. A bow is an intentional response; no filler line needed. |
| Mori / Kenji; all other free-play states where visible | Existing ordered `talk:mori` / `talk:kenji` routes already cover them. |
| Tama; office | Existing `talk:tama`. No extra line. |

Lunch is an uninterrupted scene from `ticket_done` through `lunch_end`; do not write a free-roaming lunch fallback that cannot currently be reached. Emi appears and leaves inside `emi_drops_in` while the game is busy (`office.js:563-578`). Mori and Kenji hide in the evening; Mio hides before `going_home` is set. There is no reachable post-work office fallback for those absent people. Rei and Aoi remain hidden on day 1.

## Other real gaps

| Place / person / context | Response or reuse |
|---|---|
| Forecourt / Tama / `going_home`, any evening goal | Route the cat's Talk to the existing `garden_bench` encounter, using its bench approach spot. That node already handles first and repeat visits. Do not invent a second cat exchange beside the same bench. |
| Plaza / canteen worker / `going_home && !evening_canteen_helped` | One new Japanese line, `emo: 'polite'`, `overheard: true`: “{sumimasen}、今日はもう終わりなんです。” Meaning for the writer: “Sorry, we're finished for today.” Have her look at the chairs (`look` at `canteen_table`). Keep the chair interaction on the table; talking alone does not make Eric pick up a chair. |
| Plaza / canteen worker / `going_home && evening_canteen_helped` | Reuse the existing spoken line “お疲れさまです。” with `voice: 'evening-canteen-worker'`, `emo: 'polite'`, `overheard: true`; a small bow may accompany it. Do not replay `canteen_table`, which runs the whole help sequence. |
| Gate / first stationary extra, worker variant 4 at (-3.0, -2.9) / all reachable morning goals | “{ohayo}。” `emo: 'polite'`, `overheard: true`. A simple greeting fits an optional interruption. |
| Gate / second stationary extra, worker variant 2 at (-2.45, -2.6) / all reachable morning goals | “あ、{sumimasen}、今ちょっと…” `emo: 'polite'`, `overheard: true`. Writer gloss: “Oh, sorry, now is a bit…” A glance at their phone carries the rest; the builder must supply a real gesture, not an unsupported phone hook. |
| Gate / moving commuter index 0, worker variant 0 / unjammed, visible and reachable | “{sumimasen}、通ります。” `emo: 'polite'`, `overheard: true`. Writer gloss: “Excuse me, coming through.” |
| Gate / moving commuter index 1, worker variant 2 / unjammed, visible and reachable | “あ、{ohayo}。” `emo: 'casual'`, `overheard: true`. |
| Gate / moving commuter index 2, worker variant 5 carrying a box / unjammed, visible and reachable | “あ、{sumimasen}、ケーキなので…” `emo: 'hurried'`, `overheard: true`. Writer gloss: “Oh, sorry, it’s cake…” Keep ケーキ clear as a loanword; a slight lift of the existing cake box supplies context if the body supports it. |
| Gate / any of those three moving commuters / `jammed && !gate_through_way` while queued | Shared text, spoken by the targeted person: “ゲート、まだみたいですね…” `emo: 'low'`, `overheard: true`. Writer gloss: “Looks like the gate still isn’t ready…” Keep ゲート clear as a loanword, with a look at the gate. The interruption does not trigger rescue or reveal its solution. |

The gate's two stationary extras and three moving commuters are real visible bodies, but currently live outside `place.people` and `place.things` (`js/places/lobby.js:68-85`, `js/places/lobby-commuters.js:13-30`). A fallback over `place.people` alone misses all five. Claude needs stable target IDs, valid approach positions and a pause/resume policy for the moving commuters before these lines can be wired. Variant 2 appears in both groups; identify by body, not mesh variant. New lines for these IDs need speaker/voice mapping; do not silently use the guard's voice. The English glosses in this table are editorial only. The original Japanese supplies the voice and overheard display; these responses teach no words. Keep the reused greeting/worker lines in their existing presentation unless they need a new subtitle to make the reply clear.

## Existing coverage and deliberate exclusions

- Train: Mio's `cat_nudge`, `mio_doors_nudge`, and `mio_after` already exist even where `show.mio` hides her marker (`train.js:29-38,74`). Restore access; reuse those nodes. All visible passenger IDs already have Talk routes, with the discoveries integration replacing their content. The stander is explicitly hidden and removed from the animated passenger list (`js/places/train.js:179-181`); Rei is hidden. No filler for either.
- Gate: guard and Tama have complete Talk routes. Hamada is available via `hamada_stuck` throughout the actionable jam, then both resolutions hide him before the player regains control (`gate.js:207-208,305-306`). No reachable post-rescue gap. Aoi and Rei are hidden.
- Forecourt: Kuro already responds differently before and after work through `kuro`; preserve it (`forecourt.js:55-70`).
- Sales pair: registered in the lift's `place.people`, but shown for the scripted ride and its dialogue (`js/places/lift.js:559-575`, `story/transitions.js:17-35`). No free-play gap on the present route. Do not add generic lines or interrupt that ride unless the engine contract intentionally introduces an opportunity to talk.
- Dorm court and dorms have no people in their place maps. The bath voices have no visible body; the manager's window and neighbour's TV do not establish interactable people. No invented residents.

## Writing check

Read VOICE.md and dialogue, story-sense, humanizer and cliche-transcendence. The issue is missing responses and hidden existing routes, so most cases reuse those routes. Avoided the generic RPG hint-giver, the busy-person punchline, repeated “first day?” introductions, new mysteries and strangers who know Eric's current task. Mio redirects him because the copier has already been handed off and she has her own work; the canteen worker is closing; commuters are trying to get through. One optional line per new response, no new teaching, no goal changes, no future plot. Claude story-reader C0211 corrections are folded in. The engine target/key contract remains before implementation. No new clips are requested until those IDs and voice mappings exist.
