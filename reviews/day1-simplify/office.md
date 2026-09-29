# Office day-one simplification proposal

Proposal only. The review documents are committed; no story source or assets have changed. Revised after Claude’s C-0092 cold read.

Frozen source: `/home/jorgen/repo/japanese/.claude/worktrees/codex-day1-simplify/game3d/story/office.js`, commit `52144e90d7873882d8f3111451c364bed9a41e7b`, SHA-256 `9a5b66b4f6d1cb90104ec7cd2a0e6d474d5eca0a181317ac99c77efc02bb6210`. All node indices below are zero-based indices in that source, before deletions.

Read: GUIDE, collab protocol/inbox C-0090, VOICE.md, dialogue/story-sense/humanizer/cliche-transcendence skills, and docs/game/stories/{b2-welcome,copier,lunch,tama,mio-notices,vending-gift,emi-budget}. The skill output is this assigned file.

The chair conversation now leads straight to Mio’s request. The proposed automatic door opening is withdrawn: the pause after her first reply gives players time to try akete. Both knocks and the command route remain as authored. Keep the cat riding the chair, Kenji's forest-cat distraction, the two lunch partners, their conversational choices, both lessons and their consequences. The first request card and Eric’s reaction to its age stay, as does the closing assignment card. The remaining cuts remove a repeated sensor instruction and move three gesture explanations into their existing typing prompts. Ordinary pronunciation, slow pronunciation and the player's submission remain separate learning beats.

## Counting convention

`A` = one advance of a fully revealed spoken or narration line. `C` = one authored choice selection. A choice prompt is included in C and does not also count as A. `T` = successful authored typing submission; the prompt is part of T, not another advance. `E` = an external action that starts or resumes a scene, listed explicitly. These are semantic action counts, not an estimate of time.

For literal manual inputs, Talk/Use/E is one activation. An external Say normally needs two selector inputs (open Say, choose word), plus 0 or 1 successful practice submission according to mastery. A scene's internal `do: type` is already in T. Movement taps, typing characters, text reveal, replay/help, errors and retries are excluded. Automatic zone events, `go`/`call`, scripted walks, gestures and waits are zero player inputs. Optional repeat interactions are unbounded and are not folded into a mandatory total.

## Before/after by narrative scene

| Scene / route and source lines | A before → after | C | Authored T | External actions before → after |
|---|---:|---:|---:|---|
| Mori welcome: `office_in` + `yoroshiku_mori` or `ohayo_mori` + `lead_in`, 120–158 | 4 → 3 | 0 | 0 | One Say to Mori; unchanged. Two selectors + conditional 0–1 practice submission. `mori_wait` is optional, not required. |
| Kenji introduction, `kenji_first`, 181–195 | 5 → 4 | 0 | 0 | One Talk to Kenji, desk or machine door; unchanged. |
| Machine room, knock route: `machine_door` + `mio_opens`, 231–239 | 2 → 2 | 0 | 0 | Two door activations → two. Keep the pause after “one minute” so akete remains an option. |
| Machine room, command route: `akete_machine`, 240–247 | 1 → 1 | 0 | 0 | One Say akete; unchanged, with two selectors and 0–1 practice submission. |
| Enter room: `machine_in`, 248–250 | 0 → 0 | 0 | 0 | Automatic zone, zero. |
| Chair and first request: `chair_push` + `ticket`, 251–273 | 9 → 8 | 0 | 0 | Use chair, then Talk to Mio → Use chair only. Request follows the cat line. |
| Copier lesson and repair: `copier`, 288–324 | 5 → 4 | 0 | 1 | Walking into copy-room zone starts it; no further object interaction required. Manual Talk/Say is an alternative trigger, not an extra required action. |
| Report repair: `ticket_done`, 327–336 | 5 → 4 | 0 | 0 | One Talk to Mio; unchanged. It starts lunch automatically. |
| Choose lunch partner: `lunch_start`, 339–349 | 2 → 2 | 1 | 0 | Already in scene; zero. |
| Mio lunch conversation: `lunch_mio` + B2 / doors / quiet branch, 351–384 | 4 / 3 / 2 → unchanged | 1 | 0 | Zero. Choice retained. |
| Mio rack lesson: `mio_bond`, 385–400 | 5 → 4 | 0 | 1 | Zero. Warm/cool closing line both retained. |
| Mori lunch: `lunch_mori` + landing / pouring + `mori_cups` + `mori_bond`, 402–446 | 8 → 7, either choice | 1 | 1 | Zero. Seven cups setup and both payoff lines retained. |
| Afternoon transition: `lunch_end`, 448–468 | `2 + 3H + G` → unchanged | 0 | 0 | Zero. H=`hamada_friend`, G=`gate_magic`; possible A=2–6 before/after. |
| Desk, Emi visit and evening transition: `work_afternoon` + `emi_drops_in`, 538–566 | 6 → 6 | 0 | 0 | One Use desk; unchanged. Emi's four lines carry her introduction, own goal and dangerous promise. |
| Mio's evening question: `ending`, 569–585 | `5 + G` → `4 + G` | 1 | 0 | Normally automatic after Emi. No extra Talk to Mio required. One lunch-specific line in either branch. |
| Answer to Mio: `end_dunno` / `end_nicely` / `end_quiet`, 586–588 | 1 / 1 / 0 → unchanged | 0 | 0 | Zero; the preceding choice already paid for the answer. |
| Next repair request: `end_ticket`, 590–608 | 5 → 4 | 0 | 0 | Zero. Last line still varies with lunch/warmth; day ends automatically. |

H and G are conditions, not extra choices in the office. Mutually exclusive lunch branches are not added together.

### Named complete office routes

These examples start at office entry, include the welcome and required chair/copier route, end at the day-end call, and omit all optional exploration/gifts/echoes. They follow the social gate route that helped Hamada (H=1, G=0), use the knock at the machine room, and choose silence at the final answer. The two lesson submissions are included separately.

| Route | A before → after | C before/after | T before/after | External E before → after |
|---|---:|---:|---:|---:|
| Social gate / lunch Mio / eat quietly / evening silence | 60 → 52 | 3 | 2, plus Mori Say practice 0–1 | 8 → 7 |
| Social gate / lunch Mio / ask about doors / evening silence | 61 → 53 | 3 | 2, plus Mori Say practice 0–1 | 8 → 7 |
| Social gate / lunch Mio / ask why B2 / evening silence | 62 → 54 | 3 | 2, plus Mori Say practice 0–1 | 8 → 7 |
| Social gate / lunch Mori / landing or pour / evening silence | 61 → 53 | 3 | 2, plus Mori Say practice 0–1 | 8 → 7 |

Adjust any row: final verbal answer adds 1 A. For different gate flags, apply `3(H−1) + 2G` A relative to these social-route examples: switching to the magic gate route H=0,G=1 removes 1 A overall (the cracker delivery is replaced by afternoon gossip and an evening observation). Using akete before the first knock removes 1 A and replaces two Uses with one Say in both versions; Say needs two selectors and 0–1 practice submission. Knocking once, hearing Mio, then using akete instead of knocking again keeps the knock-route A total and replaces only its second Use with Say. The pause and both triggers remain unchanged. Only use combinations the preceding train/gate route actually permits.

External E sequence, before: Say Mori; Talk Kenji; knock; knock again; Use chair; Talk Mio for request; Talk Mio after copier; Use desk. After: Say Mori; Talk Kenji; knock; knock again; Use chair; Talk Mio after copier; Use desk. Seven → six are re-interactions after the initial Say; E counts eight → seven total activations. Copier/lunch changes happen inside those scenes.

For the first example, literal minimum dialogue/choice/word/action inputs are 60 A + 3 C + 2 T + 7 Talk/Use + 2 Say selectors + 0–1 practice = **74–75 → 65–66**. This is a route example, not a universal office click count.

## Exact proposed changes

All unlisted source entries remain unchanged, including Japanese lines, flags, bonds, movement, gesture hooks, choices and time transitions. New lines below are proposals for Jørgen to pick; none has been inserted into the story.

1. `office_in[5]`, line 126: delete `> He waits.` The bow, hold and goal already establish that Mori wants an answer. Greeting response and bow differences remain.

2. `kenji_first[5]`, line 188: merge the introduction and chair apology into this line, retaining this entry's speaker/face/emo:
   - Old: `Eric-san? I am Kenji! I am new also, two months. So now I am not the newest.`
   - New: `Eric-san? I am Kenji! Two months here, so now I am not the newest. Ah, sorry, your chair... I borrowed it. Mine is broken.`
   - Delete `kenji_first[6]`, line 189: `Ah, sorry, sorry. Your chair... I borrowed it. Mine is broken.`
   - Keep `[9]` forest cats/YouTube and `[10]` Mio's ban unchanged. They explain why he cannot solve his own mess and give him a life beyond the tutorial.

3. **Withdrawn: automatic door opening.** Keep `machine_door`, `mio_opens`, `akete_machine` and their triggers unchanged. Mio still says `Mm, one minute!`, then control returns to the player. A second knock gets her to open the door; a player who learned akete at the gate can use Say on the closed door instead, including after the first knock. Keep the command’s `door_magic` flag and Mio’s card-reader response. This costs the existing second interaction and preserves the opportunity to try the word.

4. `chair_push[3]`, line 255: delete `Oh, and come here a second. I have a job for you.`
   - Replace `chair_push[4]`, line 256, `{ do: 'goal', text: 'Talk to Mio.' }` with `{ go: 'ticket' }`.
   - Keep `[2]` verbatim: `Ah, that's your chair? Sorry. She comes with it, I think.`
   - The current `chairRoll` hook rolls the chair, not Eric, so this does not require a new automatic walk back to Mio. They are already conversing in the machine room. Keep `ticket`'s Talk trigger as recovery/fallback; `got_ticket` still guards it.

5. `ticket[2]`, line 263: bridge the chair joke into her request, retaining its tags:
   - Old: `Okay, your first repair request. I changed your screen to English, by the way.`
   - New: `Oh, and... I put your screen in English. Here, your first repair request.`
   - Keep `ticket[3]`, line 264: `> REPAIR REQUEST #1. Copier, B2 copy room. Eats paper. Opened 1 April 1996.`
   - Keep `ticket[4]`, line 265: `Nineteen ninety-six?`
   - Keep `ticket[6]`, line 267: `Yeah. Mori-san opened it when he was new here, I think. Nobody closes it, it's like... tradition. He can show you.`
   - Keep the gaijin correction, Mori’s walk and the copy-room goal. The player reads the date, Eric reacts, and Mio answers him. This keeps the age setup for Mori’s thirty-year whisper and all seven request advances.

6. `copier[13]`, line 305: delete standalone `> He rolls his hands over each other, slowly, like winding up an old engine.`
   - Move the useful gesture into `copier[15].prompt`, line 307: replace `> Mori looks at you, then at the copier.` with `> Mori rolls his hands like an engine turning. Try saying it to the copier.`
   - Keep normal `{ugoite}.`, slow `{ugoite}...`, type word/from, failed attempt, kotodama, successful print, thirty years, secrecy gesture and all completion state. The prompt stays on screen until the player submits; the gesture meaning no longer costs an extra advance.

7. `ticket_done[5]`, line 333: replace `...Asked it nicely. Like the doors, this morning?` with `...Asked it nicely. Like the doors this morning? Okay, I'll close it. It's lunch anyway.`
   - Delete `ticket_done[6]`, line 334: `Okay. Okay, I'll close it. Um. It's lunch anyway.`
   - Keep Eric's `I asked it nicely.`, the three failed contractors and the lunch transition. No new claim about Mio knowing how the power works.

8. `mio_bond[7]`, line 393: delete standalone `> She holds her hand flat over the blinking rack, as if she could press the noise back down into it.`
   - `mio_bond[9].prompt`, line 395: replace `mio: Go on.` with `> Mio holds a flat palm over the rack alarm. Try saying it to the rack.`
   - Keep `No, no, not now...`, her explanation that tomatte means stop, her experimental motive, normal/slow word, one submission, alarm off and the warm/cool response. This is one fewer advance, not one fewer lesson component.

9. `mori_bond[6]`, line 437: delete standalone `> He tips an invisible pot over his cup, very carefully, the way you pour for a guest.`
   - `mori_bond[8].prompt`, line 439: replace `> He looks at you, then at the pot.` with `> Mori mimes pouring tea into his cup. Try saying it to the pot.`
   - Keep both irete pronunciations and submission; retain `mori_cups[0]`'s seven cups/three dusty setup, `mori_bond[11]`'s literal-minded pouring, `[12]`'s pause and `[13]`'s washing. The choice to pour Mori's tea before the magic also stays; his generosity and the cups matter more than another click saved.

10. `ending[2]`, line 572: delete standalone `Okay, I'm going home.` Also delete `ending[3]`'s 700 ms wait, line 573, which separated the two greetings.
    - In `ending[4].then[0]`, line 574, replace `Um. Eric.` with `Okay, I'm going home. Um... Eric?`
    - In `ending[4].else[0]`, same line, replace `Hey, {gaijin}.` with `Okay, I'm going home. Hey, {gaijin}.`
    - Preserve the conditional `lunch_mio`, each existing face/emo tag, the full word/effect recollection, all three player answers and each response. Saying his name is still the lunch payoff.

11. `end_ticket[8]`, line 599: delete only `You're the IT guy. You tell them it's the sensor.`
    - Keep `end_ticket[4]`, line 595: `It was supposed to go on my list. ...Okay, I'm putting it on yours.`
    - Keep `end_ticket[7]`, line 598: `> REPAIR REQUEST #2. Train doors, Honsha station. Assigned to: ERIC.`
    - Keep `[3]` explaining why her sensor excuse generated the request, the phone hooks/beep, both `[9]` goodbyes, save and end. The assignment card is the closing gag and echoes request one. The cool goodbye already repeats the sensor instruction; the warm goodbye still offers to accompany him. This cuts one advance, from five to four.

## Optional scenes: retained, not added to required totals

| Optional route | A | C | T / external inputs | Decision |
|---|---:|---:|---|---|
| Kenji after the chair: `kenji_again` → `kenji_small` or `kenji_pat` | 2 either branch | 1 | One Talk; no authored T | Unchanged. Reciprocal English/Japanese encouragement or the serious desk pat. |
| Kenji before chair returned / later repeat | 1 / 0 | 0 | One Talk per attempt | Unchanged. A repeat is not required progression. |
| Kenji first ohayo / yoroshiku | 2 / 1, plus intro if not met | 0 | One Say, 2 selectors + practice 0–1 | Greeting lines unchanged; intro saving is already counted above if it follows. |
| Mori/Mio lunch echo | 2 each | 0 | One Talk; no authored T | Unchanged. Do not auto-insert on required route or remove the lunch consequence. |
| Vending first purchase → unsticking | 2 total | 1 | One Use vending plus one Say ugoite, 2 selectors + practice 0–1 | Unchanged. A short optional application of the copier word with a visible result. |
| Vending later purchase | 0 | 1 | One Use; no authored T | Unchanged. |
| Vending choose Nothing | 0 | 1 | One Use | Unchanged. |
| Vending still stuck / idle ugoite | 1 / 0 | 0 | One optional Use / Say | Unchanged. |
| Gift coffee to Mio / other | 2 / 1 | 0 authored | Open Give + choose item, separate from prior vending; no T | Unchanged. Preferences and distracted thanks matter. |
| Gift corn soup to Mori / other | 2 / 1 | 0 authored | Open Give + choose item; no T | Unchanged. Return cup-of-tea payoff stays. |
| Gift melon soda to Kenji / other | 2 / 2 | 0 authored | Open Give + choose item; no T | Unchanged. His overconfident help offer echoes his introduction. |
| Repeat gift | 1 | 0 authored | Open Give + choose item | Unchanged. Item stays in Bag; preserve keep/refusal path. |
| Ambient Kenji/Mori conversation | 0 blocking advances (2 captions) | 0 | No action | Unchanged. It does not cost two clicks. |
| Tama Talk / greeting | 1 / 0 | 0 | One Talk / one Say with selectors + practice if due | Unchanged. The cat's indifference remains. |
| Desk name card, board, covered desk, stairs | 1 each | 0 | One optional Talk/Use each | Unchanged. Small discoveries stay available. |
| Copier after repair, kettle, coffee machine, clock, fan word responses | 1 each | 0 | One optional Say; selectors + practice if due | Unchanged. Existing world responses are rewards for trying known words. |

Some optional entries may currently be difficult to reach because `show` hides Mori/Mio markers outside the main progression. That is existing engine/trigger behaviour, not a proposal to delete their authored scenes or count them as compulsory. No trigger visibility change is proposed here.

## Preservation and scope

All seven relevant story documents still have their core events: formal welcome, chair-cat joke, copier's age, genuine lunch agency, alarm experiment or seven cups, optional drink preferences, Emi's independent budget fight, Mio's accumulating suspicion and the repair request assigned to Eric. Japanese normal/slow teaching lines are unchanged. The three new prompt narrations name the relevant machine and visible gesture directly. Typed lesson count stays two on either lunch route, plus mastery-dependent external Say practice.

No new subplot, future-day scene, model action, hook, UI feature or automatic optional activity is proposed. Existing flags/bonds/remembered choices are retained. Follow-on fact edits after acceptance belong in b2-welcome (request continuation; door routes unchanged), copier (request presentation), lunch (gesture prompt wording) and mio-notices (merged goodbye/request presentation), without changing the story facts elsewhere. Changed voice clips would be needed for Kenji's merged introduction, Mio's request introduction, repair report and conditional goodbye; prompt narration changes need no character voice.

The small-scale diagnosis is pacing: repeated acknowledgement/input boundaries. Avoid turning Mio into a generic quest dispenser by stripping her workload/sensor excuse; avoid turning Mori into a silent teaching prop by cutting cups/Lillehammer; avoid turning Kenji into directions-only dialogue by cutting the cat detour. Their independent motives are retained.

## Every-node local inventory

Each row below counts only that node's own entries, including conditional branches but excluding called/jumped child nodes (those have their own rows). This appendix is for coverage; use the scene table for route totals. Ranges select one condition/choice path, never add both. All 80 source nodes are listed. The ending range assumes exactly one completed lunch, as required by the playable office route. `A/C/T` excludes external Say practice and selector clicks as defined above. A status of unchanged can still lead into a changed child node.

| Node | Local A/C/T before | After | Status |
|---|---|---|---|
| `noop` | 0/0/0 | 0/0/0 | Unchanged |
| `office_in` | 2/0/0 | 1/0/0 | Proposed change |
| `mori_wait` | 0/0/0 | 0/0/0 | Unchanged |
| `yoroshiku_mori` | 1/0/0 | 1/0/0 | Unchanged |
| `ohayo_mori` | 1/0/0 | 1/0/0 | Unchanged |
| `lead_in` | 1/0/0 | 1/0/0 | Unchanged |
| `greet_again_mori` | 0/0/0 | 0/0/0 | Unchanged |
| `sumimasen_mori` | 0/0/0 | 0/0/0 | Unchanged |
| `mori_copier_hint` | 1/0/0 | 1/0/0 | Unchanged |
| `mori_again` | 0/0/0 | 0/0/0 | Unchanged |
| `mori_irete_echo` | 2/0/0 | 2/0/0 | Unchanged |
| `kenji_first` | 5/0/0 | 4/0/0 | Proposed change |
| `kenji_again` | 0–1/0–1/0 | 0–1/0–1/0 | Unchanged |
| `kenji_small` | 1/0/0 | 1/0/0 | Unchanged |
| `kenji_pat` | 1/0/0 | 1/0/0 | Unchanged |
| `ohayo_kenji` | 2/0/0 | 2/0/0 | Unchanged |
| `yoroshiku_kenji` | 1/0/0 | 1/0/0 | Unchanged |
| `greet_again_kenji` | 0/0/0 | 0/0/0 | Unchanged |
| `sumimasen_kenji` | 1/0/0 | 1/0/0 | Unchanged |
| `machine_door` | 1/0/0 | 1/0/0 | Unchanged; returns control |
| `mio_opens` | 1/0/0 | 1/0/0 | Unchanged |
| `akete_machine` | 1/0/0 | 1/0/0 | Unchanged |
| `machine_in` | 0/0/0 | 0/0/0 | Unchanged |
| `chair_push` | 2/0/0 | 1/0/0 | Proposed change |
| `ticket` | 7/0/0 | 7/0/0 | Proposed change |
| `mio_busy` | 1/0/0 | 1/0/0 | Unchanged |
| `mio_tomatte_echo` | 2/0/0 | 2/0/0 | Unchanged |
| `copier` | 5/0/1 | 4/0/1 | Proposed change |
| `copier_look` | 0/0/0 | 0/0/0 | Unchanged |
| `ugoite_copier_again` | 1/0/0 | 1/0/0 | Unchanged |
| `ticket_done` | 5/0/0 | 4/0/0 | Proposed change |
| `lunch_start` | 2/1/0 | 2/1/0 | Unchanged |
| `lunch_mio` | 1/1/0 | 1/1/0 | Unchanged |
| `mio_b2` | 3/0/0 | 3/0/0 | Unchanged |
| `mio_doors` | 2/0/0 | 2/0/0 | Unchanged |
| `mio_quiet` | 1/0/0 | 1/0/0 | Unchanged |
| `mio_lunch_end` | 0/0/0 | 0/0/0 | Unchanged |
| `mio_bond` | 5/0/1 | 4/0/1 | Proposed change |
| `lunch_mori` | 1/1/0 | 1/1/0 | Unchanged |
| `mori_landing` | 1/0/0 | 1/0/0 | Unchanged |
| `mori_pour` | 1/0/0 | 1/0/0 | Unchanged |
| `mori_cups` | 1/0/0 | 1/0/0 | Unchanged |
| `mori_bond` | 5/0/1 | 4/0/1 | Proposed change |
| `lunch_end` | 2–6/0/0 | 2–6/0/0 | Unchanged |
| `vending` | 0/1/0 | 0/1/0 | Unchanged |
| `buy_coffee` | 0/0/0 | 0/0/0 | Unchanged |
| `buy_tea` | 0/0/0 | 0/0/0 | Unchanged |
| `buy_melon` | 0/0/0 | 0/0/0 | Unchanged |
| `buy_cornsoup` | 0/0/0 | 0/0/0 | Unchanged |
| `vend_stuck` | 1/0/0 | 1/0/0 | Unchanged |
| `vend_ugoite` | 1/0/0 | 1/0/0 | Unchanged |
| `vend_ugoite_idle` | 0/0/0 | 0/0/0 | Unchanged |
| `vend_still_stuck` | 1/0/0 | 1/0/0 | Unchanged |
| `gift_mio_coffee` | 2/0/0 | 2/0/0 | Unchanged |
| `gift_mio_other` | 1/0/0 | 1/0/0 | Unchanged |
| `gift_mori_cornsoup` | 2/0/0 | 2/0/0 | Unchanged |
| `gift_mori_other` | 1/0/0 | 1/0/0 | Unchanged |
| `gift_kenji_melon` | 2/0/0 | 2/0/0 | Unchanged |
| `gift_kenji_other` | 2/0/0 | 2/0/0 | Unchanged |
| `gift_again` | 1/0/0 | 1/0/0 | Unchanged |
| `work_afternoon` | 2/0/0 | 2/0/0 | Unchanged |
| `emi_drops_in` | 4/0/0 | 4/0/0 | Unchanged |
| `ending` | 5–6/1/0 | 4–5/1/0 | Proposed change |
| `end_dunno` | 1/0/0 | 1/0/0 | Unchanged |
| `end_nicely` | 1/0/0 | 1/0/0 | Unchanged |
| `end_quiet` | 0/0/0 | 0/0/0 | Unchanged |
| `end_ticket` | 5/0/0 | 4/0/0 | Proposed change |
| `ohayo_mio` | 1/0/0 | 1/0/0 | Unchanged |
| `yoroshiku_mio` | 1/0/0 | 1/0/0 | Unchanged |
| `sumimasen_mio` | 1/0/0 | 1/0/0 | Unchanged |
| `tama` | 1/0/0 | 1/0/0 | Unchanged |
| `tama_ohayo` | 0/0/0 | 0/0/0 | Unchanged |
| `desk_look` | 1/0/0 | 1/0/0 | Unchanged |
| `irete_kettle` | 1/0/0 | 1/0/0 | Unchanged |
| `inout_board` | 1/0/0 | 1/0/0 | Unchanged |
| `covered` | 1/0/0 | 1/0/0 | Unchanged |
| `stairs` | 1/0/0 | 1/0/0 | Unchanged |
| `ugoite_coffee` | 1/0/0 | 1/0/0 | Unchanged |
| `matte_clock` | 1/0/0 | 1/0/0 | Unchanged |
| `tomatte_fan` | 1/0/0 | 1/0/0 | Unchanged |
