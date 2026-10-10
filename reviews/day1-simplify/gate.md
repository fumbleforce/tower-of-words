# Gate and lift simplification proposal

Gate and lift simplification proposal. No story changes applied.

Source: `/home/jorgen/repo/japanese/.claude/worktrees/codex-day1-simplify`, HEAD `52144e90d7873882d8f3111451c364bed9a41e7b`.
SHA256 gate.js: `59ae37906ef3bf458628fe670e81bc8db6ad383f0b00554bd0d7e641c458930a`.
SHA256 transitions.js: `1903dff2890d4525ef221c0dd851b591830f43ad029b5a4c71f6ec1d0672ae71`.
All indices below are zero-based indices into the frozen original, including hooks and flag steps. Proposed counts describe the complete proposal in this file.

## Counting method

A = successful manual dialogue/narration advances, including phone messages and overheard Japanese. C = narrative choice selections. T = required teaching submissions. E = external world interactions that start/restart a scene (Talk, reader use, Say); the initial interaction is included, so repeated attempts can be added without ambiguity. S = Say menu opens / word selections / optional practice submissions, written `1/1/0..1`. One successful practice submission is sufficient; failed answers, typing characters, reveal taps, walking taps, voice playback, animation waits and intentional dialogue replays are excluded. A word that still needs practice costs one submission; a mastered word costs none. For keyboard-only fresh play use the upper practice figure until the saved mastery threshold is met. Teaching T and Say practice are separate, and must not be summed twice.

Choice prompts do not add A: Runner.choice calls ui.choose directly. A preceding say line still costs A before choices appear. Walk captions cost zero advances; this source has no walk captions. Lift ride lines run through runner.steps and DO cost advances. Zone crossings are movement, not E: `past_gate` and `to_lift` need walking but no external action selection. Opening lobby automatically costs E=0. `card_red` automatically chains into `bench_wait`, so sitting on the bench is not another E. Sources checked: runner.js step/line/sayLine/choice/ambient; ui/dialogue.js say/choose; gameplay/interactions.js say/sayWord0; mastery.js; places/lobby.js readerTap/tripOut; trips.js.

## Diagnosis and boundaries

The gate scene already has distinct concerns: Hamada is late, Ishibashi is trying to get technical support, Mio is elsewhere and sends a practical text. Preserve these. Its pacing problem is repeated information and prerequisite menu selections, especially identifying both the man and the briefcase when the screen already explains the count. The cat denial is character humour worth keeping optional. The standard obstruction-puzzle pattern here is identify object A, identify object B, unlock obvious solution; remove that prerequisite without making Ishibashi incompetent or removing his greeting-dependent warmth. Skill checks applied: dialogue (repeated single-purpose exchanges), story-sense (pacing), humanizer (direct narration), cliche-transcendence (preserve other people's concerns). The proposed work keeps both social and magic routes and their different consequences.

## Review choice G: shorten the gate sequence

| Narrative scene / route | Original A/C/T | Proposed A/C/T | E; Say cost | Scope |
|---|---:|---:|---|---|
| Arrive: guard and commuter exchange greetings (`lobby_in`) | 2/0/0 | 2/0/0 | 0; none | Keep the demonstrated greeting. |
| Try English first (`guard_look`) | 1/0/0 | 1/0/0 | 1; none | Optional, unchanged. |
| Greet guard with ohayo OR yoroshiku, including pointing at reader (`ohayo_guard` or `yoroshiku_guard`, `guard_points_reader`) | 2/0/0 | 1/0/0 | 1; 1/1/0..1 | Combine greeting and card request; keep bow, point, goal and bond. |
| Card refused, directed to bench (`card_red`) | 5/0/0 | 3/0/0 | 1; none | Keep registration-at-nine explanation and greeting-dependent tone. |
| Bench, Hamada arrives, jam, Mio text (`bench_wait`) | 11/0/0 | 6/0/0 | 0 when entered from card; none | One clear jam explanation, one akete model, one Mio message. |
| Talk to Hamada/gate and choose to leave (`hamada_stuck` → `noop`) | 1/1/0 | 0/1/0 | 1; none | The player may still decline. Another attempt needs another E. |
| Learn akete and open gate (`hamada_stuck` → `word_type` → `word_say`) | 4/1/1 | 3/1/1 | 1; none | Keep typed teaching and visible/audible magic, add direct result narration, preserve train connection. |
| Use already-known akete on man/gate/either reader (`word_say`) | 3/0/0 | 3/0/0 | 1; 1/1/0..1 | No narrative choice or new teaching. Optional mastery practice remains. |
| Social solution, skipped greeting; case/man then lift (`way_social`, pointing loop, `mime_lift`) | 8/3/0 | 5/1/0 | 1; 1/1/0..1 | Lift solution appears immediately; guard remains cool. |
| Social solution, greeted; case/man then lift | 9/3/0 | 5/1/0 | 1; 1/1/0..1 | Warm face and earned bond remain; remove separate laugh advance. |
| Social route also selecting cat and/or squeeze | Add 1 A/1 C for cat; add 2 A/1 C for squeeze | Same optional increments | 0 additional E; no extra Say | Both jokes stay; each can be selected once. |
| All social routes, no voluntary repeats | 8..12/3..5/0 | 5..8/1..3/0 | 1; 1/1/0..1 | Range combines greeting state and optional jokes; see routes above. |
| Cross gate and approach lift (`past_gate`, `to_lift`) | 0/0/0 | 0/0/0 | 0; none | Keep physical navigation and triggers. Ride counted separately below. |

## Optional reactions and short scenes, all retained

| Scene / source nodes | Original A/C/T | Proposed A/C/T | E; Say cost | Notes |
|---|---:|---:|---|---|
| Greet guard again (`greet_again_guard`) | 0/0/0 | 0/0/0 | 1; 1/1/0..1 | Bow only. |
| Retry refused card (`card_red_again`) | 0/0/0 | 0/0/0 | 1; none | Nine/bench gestures. |
| Talk to guard again before/after card (`guard_again`) | 0/0/0 | 0/0/0 | 1; none | Conditional gestures. |
| Sit on bench outside automatic sequence (`bench`) | 0/0/0 | 0/0/0 | 1; none | Sit action. |
| Guard after magic/social route (`guard_after`) | 0/0/0 | 0/0/0 | 1; none | Route/mood-specific gestures retained. |
| Talk to busy guard or desk during jam (`guard_busy`) | 1/0/0 | 1/0/0 | 1; none | Lets the player discover Talk is insufficient. |
| Greet guard during jam (`jam_greet`) | 0/0/0 | 0/0/0 | 1; 1/1/0..1 | Bow; `late_greet` retained. |
| Point at cat during mime (`mime_cat`) | 1/0/0 after selection | same | 0; none | Selecting costs C=1 in parent menu. Joke remains. |
| Mime squeezing during mime (`mime_squeeze`) | 2/0/0 after selection | same | 0; none | Selecting costs C=1; wording tightened below. |
| Sumimasen to Hamada (`sumi_hamada`) | 1/0/0 | same | 1; 1/1/0..1 | Apology and bow. |
| Ohayo/yoroshiku to Hamada (`greet_hamada`) | 1/0/0 | same | 1; 1/1/0..1 | Flustered greeting. |
| Sumimasen to gate (`sumi_gate`) | 1/0/0 | same | 1; 1/1/0..1 | One person at a time. |
| Sumimasen to receptionist (`sumi_kuro`) | 0/0/0 | same | 1; 1/1/0..1 | Points to guard. |
| Matte to Hamada (`matte_hamada`) | 1/0/0 | same | 1; 1/1/0..1 | He is already waiting. |
| Matte to gate (`matte_gate`) | 1/0/0 | same | 1; 1/1/0..1 | Machine repeats fault. |
| Akete to guard (`akete_guard`) | 0/0/0 | same | 1; 1/1/0..1 | Puzzled reaction; no unexplained human mind control. |
| Talk to receptionist/counter (`kuro`) | 1/0/0 | same | 1; none | Refers Eric to guard. |
| Ohayo to receptionist (`ohayo_kuro`) | 1/0/0 | same | 1; 1/1/0..1 | Greeting. |
| Yoroshiku to receptionist (`yoroshiku_kuro`) | 1/0/0 | same | 1; 1/1/0..1 | Puzzled greeting. |
| Ohayo to gate (`ohayo_gate`) | 1/0/0 | same | 1; 1/1/0..1 | Greeting and red reader effect; reader hook does not call card_red. |
| Talk to gate outside jam (`gate_talk`) | 1/0/0 | same | 1; none | Card reminder. During jam Talk instead routes to hamada_stuck. |
| First Talk to Tama (`tama`) | 1/0/0 | same | 1; none | Denial and bowl hidden. |
| Ohayo to Tama / subsequent Talk (`tama_ohayo`) | 1/0/0 | same | 1; Say costs 1/1/0..1, Talk none | Heart and denial. |
| Matte to Tama (`tama_matte`) | 2/0/0 | same | 1; 1/1/0..1 | Name Tama in narration; keep it because no freeze hook replaces that information. |
| Sumimasen to Tama (`tama_sumimasen`) | 1/0/0 | same | 1; 1/1/0..1 | Cat approaches desk; denial. |
| Read visitor book (`signin`) | 1/0/0 | same | 1; none | Preserve TAMA reveal. |
| Read either poster (`poster`) | 1/0/0 | same | 1; none | Optional company slogan remains. |

Helper coverage: `guard_points_reader` is included in the greeting scene, not counted twice. `pt_case` and `pt_man` each currently have zero standalone advances, one parent-menu selection, and loop internally; completing the second calls `guard_knows` for one advance. Both pointing helpers and `guard_knows` become unused and are proposed for deletion. `mime_menu` carries choices/prompts only. `word_type` is the one teaching submission in the magic scene. `noop` is empty and retained. These tables and helper notes cover all 46 gate nodes.

## Route totals for the gate, from lobby opening through resolution, before the lift ride

| Route without unrelated side interactions | Original A/C/T | Proposed A/C/T | E | Say opens / selections / practice |
|---|---:|---:|---:|---|
| Skip greeting, learn akete | 22/1/1 | 14/1/1 | 2 | 0/0/0 |
| Greet, learn akete | 24/1/1 | 15/1/1 | 3 | 1/1/0..1 |
| Skip greeting, shortest social | 26/3/0 | 16/1/0 | 2 | 1/1/0..1 |
| Greet, shortest social | 29/3/0 | 17/1/0 | 3 | 2/2/0..2 |
| Skip greeting, social with both jokes | 29/5/0 | 19/3/0 | 2 | 1/1/0..1 |
| Greet, social with both jokes | 32/5/0 | 20/3/0 | 3 | 2/2/0..2 |

No fixed maximum exists if the player repeats world interactions. Each optional row gives the additional cost. The low and high values above are named successful routes, not estimated literal clicks. Greeting and sumimasen mastery depend on earlier train choices, settings and optional practice; retain the range when consolidating. Social routes still do not teach akete, preserving the later office door choice difference.

## Exact proposed gate changes

1. `ohayo_guard[3].text`: `{ohayo}。` → `{ohayo}。カードを、どうぞ。`. Retain speaker, overheard, emotion and surrounding flags/bows.
2. `yoroshiku_guard[3].text`: `はい、{yoroshiku}。` → `はい、{yoroshiku}。カードを、どうぞ。`. Retain amused delivery.
3. Delete `guard_points_reader[1]`, the separate guard line `カードを、どうぞ。`. Keep its pointing hook and reader goal. This merges the request into each greeting response; the call stays.
4. Delete `card_red[2]`, commuter `…{sumimasen}。`. Sumimasen was taught on the train, occurs again as Hamada enters, and remains in Mio's prompt. Keep the guard beckoning the player over.
5. Delete `card_red[13]`, guard `あちらで、お待ちください。`. Retain the preceding nine-finger/point/face-to-bench hooks, Eric's `Right, Mio did say nine.`, the existing bench goal and automatic bench move. No extra player action is added.
6. Delete `bench_wait[3]`, `> 8:52.`. The exact minute is not necessary to the obstacle; registration at nine remains explicit. If the time is required as a fact, it may remain with +1 A to every proposed route; do not add a timed caption.
7. Delete `bench_wait[10]`, gate `共連れを検知しました！`. Keep jam, red gate/count display and sound. The next narration explains the unreadable fault directly.
8. `bench_wait[11]`: `> The little screen on the gate counts two people, him and his briefcase.` → `> The gate counts the man and his briefcase as two people. He's stuck.` Keep after the physical jam. This names both cause and consequence without relying on tiny screen text.
9. Merge `bench_wait[13]`, `[15]`, `[16]` into the existing `[13]` line `{akete}...`, adding `slow: true` and retaining its pleading expression/emotion. Delete `[15]` `{akete}...` and `[16]` `お願い、{akete}…いい子だから…`. One visible word model remains before the player's voluntary lesson; typing still follows only on the magic route. Hamada's apologetic entrance and later reactions remain.
10. `bench_wait[14]`: `> He mimes hauling two heavy doors apart, then pats the gate like a nervous horse.` → `> He mimes pulling the gate open.` Keep it beside his akete model: no implemented hook currently replaces this meaning cue. If the actual screen staging lacks the mime, the later implementation must stage that existing action or keep the meaning in the choice label; do not claim an unseen mime was verified.
11. Merge `bench_wait[22]` and `[23]`: `the chat says the lobby gate is broken again. is that you?` + `if the guard ignores you say {sumimasen} and point at stuff. loud` → one `miotext` line at `[22]`: `the lobby gate again? is that you? say {sumimasen} to the guard and show him`. Delete `[23]`. Preserve phone styling, the guard's independent phone call at `[17]`/`[18]`, and final help-or-guard goal. No new English explanation is attributed to the guard.
12. Delete `hamada_stuck[2]`, Hamada `あ…すみません、ゲートが…`. His setup has just shown the problem and his attempted word. Keep both facing hooks and the two choice options at `[4]` unchanged, including `Say 開けて (akete, open) with him` and `Leave him to it`. Add `prompt: "> He's still stuck in the gate."` to the choice object at `[4]`. The prompt names the situation without another advance. No mandatory akete acquisition on the social route.
13. Insert immediately after `word_say[2]` kotodama: `> The gate snaps open at your word.` Keep the slam hook before it and the actual kotodama effect. Delete `word_say[10]`, guard `…あ、もしもし。いえ…開きました。`; keep phone off at `[11]`. Retain Hamada's surprised response `[5]`, his escape, Eric's `The train doors, and now this...`, `gate_magic`, guard reactions and lift goal. A stays 3 in word_say, with one direct description of the magic replacing the second phone exchange.
14. `mime_menu[0].choice`: delete original option `[0]` `Point at the briefcase` and option `[1]` `Point at the man`. Keep cat option `[2]` and its `!pt_cat` condition. Keep squeeze option `[3]` but replace condition `pt_case && pt_man && !m_squeeze` with `!m_squeeze`. Keep lift option `[4]` but remove condition `pt_case && pt_man`, change its text from `Mime lifting something over your head` to `Mime lifting the briefcase over the gate`, and put this useful option first. Remaining order: lift, squeeze, cat. Existing prompt `> You don't have the words for this.` stays part of the choice UI, not a separate advance. Keep the initial social-route commitment flag as currently authored; no new cancel/re-entry state is proposed.
15. Delete whole now-unreachable `pt_case`, `pt_man` and `guard_knows` helpers. Their only spoken line is `guard_knows[1]`: `はい、わかってます。二人だと思ってるんです。`. Removed internal actions: `pt_case`/`pt_man` flags, duplicate point/look actions, Hamada bow, and loops to the same menu. Preserve all `mime_cat` actions/flag/text and its loop. Preserve `mime_squeeze` actions/flag/text and its loop, except narration change below. No new controls or UI implementation is required.
16. `mime_squeeze[2]`: `> You turn sideways and suck your stomach in.` → `> You mime squeezing past the briefcase.` Retain the squeeze gesture and guard's `…無理ですね。`. Optional failed idea costs the same, with the object explicit.
17. Delete `mime_lift[1]`, `> You lift an invisible briefcase high over your head.` The selected option now names the exact action; the existing Eric gesture executes it. Do not delete the later guard instruction or Hamada's lift gesture.
18. Delete only `mime_lift[3].else[0]`, guard `ははっ。`; keep the guard bond increment at `.else[1]` and preserve the friendly response later at `[22].else[0]` with `face: 'amused'`. The un-greeted stern branch remains. The humour of the guard finally understanding comes through the emote, action and warm permission instead of another advance.
19. Delete `mime_lift[23]`, Eric `Arigatō.`. Keep Hamada's thanks `[13]`, his bow, meeting/bond/`hamada_friend`, the guard's mood-dependent permission `[22]` and lift goal. Keep guard's phone-company line `[10]`: the ordinary support call finishing after the problem is solved remains a small payoff.
20. `tama_matte[0]`: `> She freezes with her head in the bowl.` → `> Tama freezes with her head in the bowl.` Count unchanged. This identifies the subject and preserves the result, which is not implemented by a separate freeze hook.
21. `signin[0]`: `> The first name in the visitor book today, in careful capitals, is TAMA.` → `> TAMA is the first name in today's visitor book.` Count unchanged; preserve the discovery.

## Review choice L: shorten the lift ride, independent of G

| Transition scene | Original A/C/T | Proposed A/C/T | E / Say | Result |
|---|---:|---:|---|---|
| Platform to lobby (`train_to_gate.walk`, `.arrive`) | 0/0/0 | 0/0/0 | 0 / none | Empty authored slots; keep. Physical travel has no advance. |
| Lobby to office (`gate_to_office.ride`) | 5/0/0 | 3/0/0 | 0 / none | Keep sales gossip, recognition and B2 arrival. |

Exact changes in original `gate_to_office.ride`:

- Delete `[1]`, `> Someone has pressed 5.`. Floor and door hooks remain, including the detour to 5 before B2; no change to staging is implied.
- Keep `[3]`, sales1 `十時の会議、四番目の議題見た？`.
- Keep `[4]`, sales2 `B2のやつでしょ。コンサルタントが来るって。`, including its existing B2/consultant clear entries. They are discussing their own meeting; Eric understands enough to connect it to himself.
- Delete `[5]`, sales1 `え、今日から？`. It repeats surprise about the newcomer without changing the scene.
- `[6]`: `> One of them glances at the card on your lanyard, and they stop talking.` → `> They notice your card and stop talking.` Keep this because card recognition is a small important action, not a landscape description.
- Keep `[0]`, `[2]`, `[7]` through `[11]` door/floor hooks and both empty `with` arrays. No walking caption replacement is proposed.

## Facts/dependencies if approved

Update docs/game/stories/gate-morning.md (card response), sleeping-man.md (shorter jam model, direct mime availability and removed pointing flags), tama.md (optional cat humour still present; no factual plot deletion), and the place/travel documentation only if it currently repeats the removed lift text. `pt_case`/`pt_man` references disappear from the story and its documented menu condition; `pt_cat`/`m_squeeze`, `guard_cool`, `gate_magic`, `hamada_friend`, greeting bonds and B2 snack consequences remain. Akete retains exactly one required typing submission and Hamada as its teacher. Keep original Japanese clip keys for untouched lines; combined greeting lines and the merged Mio message need new voice assets only after approval. Counts do not certify visual acting or magic readability; existing hooks were read, not rendered.
