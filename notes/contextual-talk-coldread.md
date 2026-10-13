# Cold read: contextual Talk draft

Read 2026-09-30 against `.claude/worktrees/codex-train-discoveries/notes/contextual-talk-draft.md` (X-0327), with office.js, gate.js, plaza.js, forecourt.js and train.js from the same worktree, VOICE.md, GUIDE Writing, places.md and stories/evening-walk.md. Jørgen's note (2026-09-30_211255): "All people should always be interactable, but dont necessarily need to say that much interesting. Here it would make sense for her to say something about going to the copy room".

The routing analysis holds up: most gaps are hidden markers over existing routes, and the draft doesn't pad them with filler. Findings are on the new lines and on one presentation choice.

## Presentation: overheard, not `en`, for strangers

Every stranger at the gate and the canteen speaks as overheard Japanese today (gate.js `lobby_in`, `card_red`, the guard throughout; plaza.js `canteen_table`; forecourt.js `kuro`). Eric doesn't understand them, and the game rests on that. FORMAT.md keeps `en` for "moments the player should follow although Eric can't", and a passer-by's brush-off isn't one of those. If a commuter's aside comes up in English while the guard beside them stays blurred, Eric seems to understand commuters but not the guard. The draft is also inconsistent here: it reuses the canteen お疲れさまです "with `en` subtitle", but the existing line is overheard.

Fix: all new stranger lines are `overheard: true`, no `en`. Each one carries a word Eric knows ({ohayo}, {sumimasen}) or a loanword he'd catch by ear (ゲート, ケーキ, which VOICE.md allows as `clear`), plus a gesture, so the meaning gets through without a subtitle. The exact lines are below.

## Office

**Mio, `got_ticket && !copier_done`**: fix.
Draft: "Mori-san can show you the copy room. I need to get back to this."
- Mio said "He can show you." a few lines earlier in `ticket`, and by now Mori has already walked off to `copier_front`, so "can show you" is out of date.
- "I need to get back to this" is the busy-person brush-off the draft says it avoids. It's `mio_busy` with different words, and "this" has nothing on screen to point at.
- Jørgen asked for her to say something about going to the copy room. The line should tell him where it is, in her voice.

Replace with (emo `dry`, face neutral):
"Copy room is across the corridor. Mori-san is already there... probably bowing to the copier again."
It's where to go, in her loose English with the dropped article, and it's her kind of noticing: she watches whether Mori embarrasses himself. It also sets up what the player sees next (Mori bowing to the copier in `copier`) without giving away 動いて. "Again" fits the 1996 ticket that "nobody closes". No new lore.

**Mio, `machine_open && !chair_back`**: keep (reuse `mio_busy` morning). Anything about the chair or the cat would spoil "She comes with it, I think" in `chair_push`.

**Mio, `chair_back && !got_ticket`**: keep (old-save route).
**Mio, `copier_done && !ticket_closed`**: keep (`ticket_done`).
**Mio, afternoon**: keep (`mio_tomatte_echo`, then `mio_busy`).

**Mori, greeted, morning**: keep (restore `mori_copier_hint` / `mori_again`). One note for the builder: while `got_ticket && !copier_done` Mori is at `copier_front` inside the copy room, and entering the room fires `zone:copy_room`, so `mori_copier_hint` ("コピー機は、あちらです", pointing at the copier) is reachable only if the player catches him on his walk over. That's fine as long as the hint doesn't play while he's standing at the copier, pointing at the copier. If the new routing can reach him there, use `mori_again` instead.

**Mori / Kenji, other states**: keep.
**Tama, office**: keep.

## Other places

**Forecourt Tama, `going_home`**: keep (route to `garden_bench`). No second cat line.

**Canteen worker, `going_home && !evening_canteen_helped`**: fix.
Draft: "すみません、今日はもう終わりです。" with `en`.
Replace with overheard, then a glance at the stacked chairs:
`{ say: 'canteen_worker', overheard: true, emo: 'polite', text: '{sumimasen}、今日はもう終わりなんです。' }`, `{ do: 'look', who: 'canteen_worker', at: 'canteen_table' }`.
- 終わりなんです is the softer spoken form, the one staff use when explaining to a customer; 終わりです reads like a sign.
- With {sumimasen} sharp and the look at the upside-down chairs, the player gets "sorry, we're closing" without a subtitle. The `canteen_table` beat ("he realises they are closing") still works: he can go and help.
- The worker needs a voice clip entry like `evening-canteen-worker`.

**Canteen worker, `going_home && evening_canteen_helped`**: keep the reused お疲れさまです with its small bow, but overheard as it is in `canteen_table`, with no `en`.

**Gate, stationary extra (variant 4)**: keep "{ohayo}。" as overheard, with a small bow. By the gate {ohayo} is a learned word, so it shows sharp anyway; a subtitle would only repeat it.

**Gate, stationary extra (variant 2)**: fix.
Draft: "すみません、今、電話を待っていて。" with `en`.
A stranger explaining their phone call to someone who walked up is a bit much, and it's written-sounding. Replace with the Japanese way of saying bad timing, overheard:
`{ say: 'commuter', overheard: true, emo: 'polite', text: 'あ、{sumimasen}、今ちょっと…' }` plus `{ do: 'phone', who: <id>, state: 'look' }` if the body can take the phone step. That's their own concern, it's short, and 今ちょっと… is natural N5 speech that reads with the phone.

**Gate, moving commuter 0**: keep "すみません、通ります。" but overheard and written `{sumimasen}、通ります。`. It's a quieter version of Hamada's panicked "{sumimasen}、{sumimasen}、通ります！" later, so the phrase is heard once before the jam. That's fine.

**Gate, moving commuter 1**: keep "あ、{ohayo}。" as overheard. Emo `casual` is fine, since {ohayo} renders the polite form.

**Gate, moving commuter 2 (cake box)**: fix.
Draft: "すみません、これを届けないと。" ("I need to deliver this").
places.md says this person carries a cake box. Use it:
`{ say: 'commuter', overheard: true, emo: 'hurried', text: 'あ、{sumimasen}、ケーキなので…', clear: ['ケーキ'] }` and have them lift the box slightly away from Eric, if there's a gesture for it.
ケーキ is a loanword he'd catch by ear, so the player gets "careful, it's cake" from one sharp word and the box. It's more charming than "I need to deliver this", and it's still their own concern.

**Gate, the three movers while queued (`jammed && !gate_through_way`)**: fix.
Draft: "まだ通れないみたいですね。" with `en`. As overheard it would be fully blurred, since it has no known word.
Replace with `{ say: <targeted>, overheard: true, emo: 'low', text: 'ゲート、まだみたいですね…', clear: ['ゲート'] }` with the speaker looking at the gate first (`{ do: 'look', who: <id>, at: 'gate' }`). ゲート is on VOICE.md's list of loanwords he'd catch by ear, and the look shows the rest. Like the draft, it reveals no solution.

## Train (reuse only)

Keep restoring access to `cat_nudge`, `mio_doors_nudge` and `mio_after`. They fit their states and nothing in them contradicts the day. One optional point, since the draft brings `cat_nudge` back into play: "The cat. Go on, she won't bite." opens with a fragment, which VOICE.md bans for Mio. If it gets touched: "Go say it to the cat, she won't bite."

## Exclusions

Agreed on all of them: lunch, Emi, the absent evening cast, Rei and Aoi, the sales pair, the dorms. None of them is a talkable body the player can reach in free play, so none needs a line.

## Branch flow

Each new line is a single response with no choice, and it returns control to the current goal. None of them sets a flag, so the existing routes that follow are unchanged. Speakers are right: the targeted body speaks, and the gate lines need their own voice mapping, not the guard's (as the draft says).
