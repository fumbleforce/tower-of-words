# Kenji outing: dialogue and staging draft

Draft for [339](https://github.com/fumbleforce/tower-of-words/issues/339), following the selected [outing proposal](../../reviews/game-additions-1/review.json). This is authored material for a cold read. It is not integrated, voiced or approved by the Claude story reader. The hook mapping below follows the builder's current mechanical prototype; story integration waits for its browser pass.

## Voice and scene decisions

Kenji wants company while he is out. At the shops, the game-centre frontage catches his attention while the player decides whether to buy anything. At the coast he is happy to sit without turning the stop into a confession. He speaks short casual Japanese, gets distracted physically, and answers an invitation with a nod and a direction question. The player speaks brief, ordinary English except for the optional familiar-word invitation. The internal player id remains `eric` for both Eric and Carina; this draft contains no gendered address or protagonist name.

Every Japanese Kenji line below is `{ say: 'kenji', overheard: true, emo, text }`. No `en` or `clear` field is supplied. Known brace words use the usual knowledge filter. Protagonist speech is `{ say: 'eric', emo, text }`. Prose in square brackets is a stage direction for the builder, never a narration panel. Choice labels are controls; they remain readable with zero words learned.

The default versions considered were a guided island tour, an instant personal confession on the bench, and another joke about losing lunch money. The chosen version gives the player the route and lets Kenji briefly get absorbed in something already established. His chair debt, karaoke progression and knowledge of the commands do not move here. The lasting result is an ordinary shared stop he can mention next time.

The main risks diagnosed with story-sense and dialogue were exposition and context drift: treating the arcade topic as heard, translating whole Japanese sentences through the player's replies, or calling a proposed stop a memory before it happened. The branches below carry each dependency. The rpg-scenes check removes narration of walks, pointing and seating; those actions must be visible. The humanizer pass removes neat closing morals and fragments from the player's lines. GUIDE's story/screen, all-path continuity and optional-language rules are the acceptance basis.

## 1. Invitation

Add `Invite Kenji for a walk.` beside his existing optional conversation topics, after he has actually been met. It is available when he can be addressed even if the current schedule makes him busy. Do not replace his ordinary Talk or existing topics.

`invite`

[Frame both people. Kenji turns to the player.]

- Player, warm: “Want to come for a walk?”

If busy, go directly to `busy`. Otherwise:

- Kenji, bright: 「うん、行こう。どっち？」
- [Kenji nods. Restore the walking camera.]
- Choices: `Walk to the shop street together.` / `Walk to the seafront together.` / `Actually, another time.`

The two destination choices begin the outing and give a small persistent side goal to the chosen destination. They return movement control. No automatic trip through several places; the player leads. Choosing another time receives the `decline` reply and leaves the invitation available.

When both `know_ikitai && know_isshoni` are true, the initial topic menu additionally offers `Try “I’d like to go together.”` This leads to `invite_words`:

- Player, hesitant: 「{isshoni}……{ikitai}。」
- If busy: `busy`.
- Otherwise Kenji, warm: 「うん、{isshoni}行こう。」
- [Nod. Reuse the destination choices above.]

Knowing only one word adds no half-finished invitation. Neither branch teaches, types, offers or awards a word. The Japanese reply echoes the familiar word rather than explaining it.

`busy`

[Kenji remains where his current activity puts him. If he is at his office desk, he points back to it. Do not invent a call, broken machine or appointment.]

- Kenji, sheepish: 「ごめん、今はちょっと。またあとで。」
- Player, warm: “Okay, I'll ask you later.”
- [Release the camera. Keep the pending invitation and any completed stops.]

`decline`

- Kenji, casual: 「うん、またあとで。」
- [Release the camera. Nothing is consumed.]

## 2. Walking and the shop street

Talking to Kenji during the walk opens the outing controls, after one short line on the first such talk:

- Kenji, curious: 「どうした？」
- Choices: `Head to the shop street.` / `Head to the seafront.` / `Continue walking.` / `Let's split up here.`

No line claims they are lost or behind schedule. Selecting a destination changes the side goal; it does not create a new outing, replay the invitation, or clear a completed stop. The current destination remains available so the player can look up the route again.

At the actual shop-street stop, use the game-centre frontage as the gathering point. A route arrival alone does not claim a purchase. The player interacts with Kenji or the stop marker to start the following exchange.

`shop_arrival`

[Frame Kenji and the game-centre frontage. He turns toward it, takes a short step to a clear viewing position, and points. He remains outdoors.]

If `kenji_arcade_talked`:

- Kenji, bright: 「あ、ここ。前に話したゲームセンター。」
- Player, amused: “The crane game you were telling me about?”
- [Kenji nods toward the frontage.]

Otherwise:

- Kenji, bright: 「あ、ゲームセンター。ちょっと見ていい？」
- [Kenji turns back to the player and points toward the frontage again.]
- Player, warm: “Sure. I'll have a look too.”

Both join:

- [Kenji looks at the frontage. His shoulders stay oriented toward it when the player opens the next choice. There is no claim that the player sees a prize or a running crane mechanism.]
- Choices: `Buy a drink at the convenience store.` / `Keep walking together.` / `Let's split up here.`

The `arcade` action records the shop stop only after both people actually reach the frontage and face it. Dialogue, a route arrival and a destination choice cannot create that receipt. Play this exchange after the action succeeds. It does not set `kenji_arcade_talked`: that existing flag belongs to the fuller conversation, and its optional ikitai lesson must remain available.

`shop_buy`

- Player, casual: “I'm going to get a drink.”
- [The player points at the convenience-store door. Kenji looks from the frontage to that door.]
- Kenji, casual: 「うん。ここで待ってるね。」
- [Kenji steps to the agreed waiting position clear of the door and pedestrian path. Return control for the ordinary store trip.]

The existing konbini interaction owns product selection, price, payment, refusal, collection and cancellation. It sells milk, milk tea, coffee and rice balls; this scene invents no melon-soda purchase. Do not skip its physical transaction or automatically give Kenji an item. Do not play this line if the store is closed; use `shop_closed` instead.

`shop_return_drink`, only after a new completed drink order during this visit, with the goods collected:

[Both are outside again. Kenji turns from the frontage to the player, then steps back beside them. No drinking or bottle inspection is implied.]

- Kenji, warm: 「あ、戻った。じゃあ、行こうか。」
- Player, casual: “That's my shopping done. Shall we keep going?”
- [Restore outing controls. Record the drink variant of the shop stop.]

`shop_return_other`, for food only, no purchase, cancelled checkout, or leaving without collecting:

- Kenji, casual: 「あ、戻った。じゃあ、行こうか。」
- Player, warm: “Ready when you are.”
- [Restore outing controls. Keep the ordinary shop stop; never claim a drink.]

The return line reports the completed shopping. It does not claim an object is in the player's hand. The existing receipt reaches `konbini_phase == 'complete'` after collection; its paid/order ids and basket identify the transaction. Record that completion during the shop wait so a second order cannot erase it. An item owned before this outing is insufficient. Milk consumed at the shop still counts as a purchased drink, but no later line claims the player carried it back outside.

`shop_closed`

[Frame the existing closed door and its current opening card before the reply.]

- Player, casual: “It's closed. Let's keep going.”
- [Kenji nods. Return control; the coast and parting choices remain.]

`shop_repeat`, after this outing's shop exchange has played:

- [Kenji looks toward the frontage, then back to the player.]
- Kenji, casual: 「もう少し見る？」
- Choices: `Buy a drink at the convenience store.` / `Head to the seafront.` / `Keep walking together.` / `Let's split up here.`

Repeat viewing does not award another memory or any points. A later real drink purchase may refine the shop receipt to the drink variant, once.

## 3. Seafront bench

The coast stop uses the actual terrace bench. The offer reserves nothing. Only selecting `Sit on the bench with Kenji.` starts the `coast` action, which finds and reserves two free seating positions with separate clear approaches. Declining leaves every seat available to others. At the draft's base revision, `terrace_bench` is only a spot; real paired seating comes from the builder's outing adapter.

`coast_arrival`

[Frame both people with the bench. If two positions appear free, Kenji points toward the bench while standing on the path. This look does not reserve them. If the bench is already visibly full, use `coast_full` immediately.]

- Kenji, warm: 「ここ、座ろうか。」
- Choices: `Sit on the bench with Kenji.` / `Keep walking together.` / `Let's split up here.`

`coast_sit`

- Player, warm: “You go first. I'll sit beside you.”
- [Run the `coast` action now. It rechecks and reserves both positions; if either is unavailable, use `coast_full` before either person sits. On success Kenji walks to his approach and sits, then the player walks to their own position and sits. Keep both bodies and their contact with the bench visible.]
- Kenji, casual: 「あー、ちょっと休もう。」
- [He turns his head toward the water, then back to the player.]
- Choices: `Stay on the bench a little longer.` / `Get up and keep walking.` / `I should get going.`

Record the coast stop only when both people have successfully sat. “Stay” returns movement-free bench control with Kenji beside the player; no reading timer or forced duration. A later interaction offers the same leave/get-up controls without replaying the sitting exchange. Keeping a separate visible `Get up` action follows whichever existing seated UI the builder chooses.

`coast_stand`

- Player, casual: “Shall we keep going?”
- Kenji, warm: 「うん、行こう。」
- [Both stand, release their reservations and return to following.]

`coast_full`, if two seats cannot be reserved, or someone takes one before either sits:

[Kenji remains on the path and looks back to the player. Do not point at an occupied place as if it were free.]

- Player, casual: “Let's leave them the bench. We can keep walking.”
- [Return control. The stop stays available; no coast memory is recorded.]

If only one person managed to sit before an interruption, stand that person safely and release both reservations. Do not play a completed-stop line.

## 4. Leaving, interruptions and another visit

`part`

- Player, warm: “I should get going. See you later.”
- Kenji, warm: 「うん、またね。」
- [If seated, both stand first. Release the outing camera and side goal. Kenji walks toward the appropriate exit or resumes his actual local activity before leaving the frame. Do not pop him away in view.]

This ends following and keeps completed stop receipts. It leaves a later invitation available. A player who leaves before either stop receives no fabricated callback.

Selecting an exit into a place this prototype cannot accompany automatically suspends the outing before the normal trip. The exit choice itself is sufficient; there is no second confirmation or added parting exchange. Retain receipts, release Kenji to his schedule and keep the selected destination reachable. The separate `Let's split up here.` control still plays `part` when the player deliberately addresses him.

Save/Continue, supported outdoor transitions and the declared konbini wait retain the outing. A forced period/day change releases Kenji to his schedule and retains the unfinished outing without dialogue over someone else's scene. On the next eligible interaction, use `resume`; do not interrupt a work, club or milestone scene to announce it.

`resume`

- Choice: `Continue our walk.` / `Maybe another time.`
- On continue and available: Player, warm: “Want to carry on with our walk?”
- Kenji, warm: 「うん、行こう。」
- [Reuse destination controls. Finished stop exchanges use their repeat controls; they do not replay their first-time lines.]
- On continue but busy: `busy`.
- On another time: `decline`.

`later_callback` runs from an optional `Ask about our walk.` topic at a later eligible visit, once following has ended. It does not auto-fire every time the player talks. Use the latest physically completed stop, including the drink refinement if that was the latest completion. Select exactly one branch:

| Receipt | Player line, warm | Kenji line, emo warm | Subsequent action |
|---|---|---|---|
| Shop with collected drink | “You were still watching the game centre after I'd finished shopping.” | 「あ、うん。見てるだけでも面白くて。」 | Kenji gives a small sheepish nod; finish this topic. |
| Shop, no collected drink | “Did you want to go into the game centre when we stopped there?” | 「うん。でも、見てるだけでも面白いよ。」 | Kenji gives a sheepish shrug; finish this topic. |
| Coast seated | “I liked stopping at that bench with you.” | 「うん。またあそこに座ろうよ。」 | Kenji nods; finish this topic. |

The coast callback is an optional choice whose label shows the sentiment before the player selects it: `Tell him you liked the seafront stop.` The shop labels are `Ask about stopping at the game centre.` and `Mention the drink stop.` They are statements the player chooses, not feelings forced into an automatic line. The first label also fits a brief visit followed immediately by walking on. A fresh invitation is a separate choice and can still receive a busy answer.

Store the recalled receipt id when the callback finishes. Merely opening the menu does not consume it. After it has been heard, the same topic can be revisited without any reward; its wording continues to describe the same actual outing. A new completed outing updates the receipt and the callback available from it.

## State and branch table

These are semantic states, not extra flags the story should mutate directly. The runtime must have one owner for the outing and receipts.

| Starting state / action | State after | Lines and physical requirement | Durable change |
|---|---|---|---|
| Not met | Unavailable | Existing introduction remains the route | None |
| Met, busy, ordinary or word invitation | Offered/deferred | `busy`; Kenji stays at current duty | Preserve pending opportunity |
| Met, free, ordinary invitation | Destination choice | `invite` | None until destination selected |
| Both words known, free | Destination choice | `invite_words` | No word grant |
| One or both words unknown | Ordinary invitation available | Familiar-word choice absent | No word grant |
| Destination chosen | Following | Player leads supported route | Session, destination, start time |
| Other destination chosen mid-walk | Following | No second invitation | Destination only |
| Shop stop selected | Following | Successful `arcade` action brings both people to face frontage; then `shop_arrival` | Shop receipt from observed completion |
| Enter open store from drink choice | Waiting outside | `shop_buy`; Kenji occupies a clear wait spot | Store order baseline / wait state |
| Return with new paid, collected drink | Following | `shop_return_drink` | Shop drink receipt with order id |
| Return without new collected drink | Following | `shop_return_other` | No purchase claim |
| Reopen old paid order / already-owned drink | Following | Other-return path | No new purchase receipt |
| Buy selected while store closed | Following | `shop_closed` | None |
| Coast reached, keep walking | Following | `coast_arrival`, choose walk; never reserve seats | No coast receipt |
| Coast sit, two actual seats succeed | Seated | `coast_sit` | Coast receipt, latest completed stop |
| Coast sit fails / seats occupied | Following | `coast_full`, recover physical posture | No coast receipt |
| Get up | Following | `coast_stand`; both stand | Retain coast receipt |
| Save/Continue while following / waiting / seated | Same valid state | Restore bodies, poses, seats, receipt cursor; no repeated scene or charge | Preserve all |
| Voluntary part before first stop | Ended | `part`; walk out of frame | No callback |
| Part after one/both stops | Ended | `part` | Keep actual receipts |
| Unsupported trip / forced schedule change | Suspended | Automatic lifecycle pause; no extra confirmation or dialogue | Keep route/receipts; restore normal schedule |
| Resume, free | Following | `resume` | Reuse unfinished session |
| Resume, busy | Suspended | `busy` | Preserve session |
| Later topic after actual stop | Ended/suspended | Appropriate `later_callback` branch | Callback cursor only |

## Engine mapping

Use the runner's existing `choice`, `if`, `call`, `go`, `cam`, `walk`, `face`, `look`, `gesture`, `sit`, `stand`, `goal` and `save` where their promises hold. Put lifecycle/receipt decisions in one new `outing` hook rather than teaching the story to duplicate a companion controller.

The builder's current hook is `{ do: 'outing', state }`, with states `invite`, `resume`, `pause`, `finish`, `keepWalking`, `arcade`, `drink` and `coast`. `outing_action_complete` reports whether the action succeeded. `invite`/`resume` own availability; a failed request takes `busy`. Destination controls can update the ordinary side goal without a new companion action. `keepWalking` releases any seating and resumes following. `drink` starts the outside-store wait; the ordinary trip enters the store. `arcade` records a stop after both observed walks and turns succeed; `coast` reserves and animates both bodies, then records the stop only after both sit. The story checks the outcome before any line claiming success.

The coast action currently performs reservation and seating as one awaited operation. Put the player's seat-offer line before that operation without claiming a reserved position, then play Kenji's rest line only after success. Detailed pointing within the operation is staging owned by its adapter. This keeps the failed-seat branch truthful without adding a reservation-only story hook. Invitation/finish side-goal changes must preserve the main ticket goal. A generic remember hook may publish a human-readable memory only from an engine-issued completed receipt; story `set` must never manufacture a completion.

Regular `trip` and lifecycle adapters handle cross-place following and the temporary store wait. Actual shop collection records the receipt through the existing order state, not a new `buy` hook. Period changes suspend through lifecycle. The story needs status/destination/completed-stop facts to choose replies, not per-frame movement data, hard-coded seat numbers or flags for every spoken line.

## Cold-read and runtime checklist

Read the ordinary invitation with no Japanese known: the player asks for the walk, Kenji nods, and the next controls name both destinations. No translation is needed to choose. Read the busy branch: the player's response and Kenji staying at work make the refusal understandable. Read each shop context independently: the missed-topic path introduces only the place visible in front of them; the heard-topic path refers to exactly the crane-game conversation. Neither promises a playable crane game.

Check both route orders with both protagonists, including one-stop departures, walking without stopping, declining the bench, full bench, buying food only, cancelled shop selection, insufficient money, paid-but-uncollected goods, repeated shop entry and save at each transition boundary. Test known/unknown word combinations and actual earlier `kenji_arcade_talked` values independently. Inspect native phone and desktop shots of the invitation, frontage, outside-store waiting, both seated bodies and parting. Listen only after the text and physical actions pass the cold read.

The earlier root design receipt at `game3d/shots/continue-goal/kenji-outing-design.txt` agrees on player-led routes, busy preservation, two optional stops, actual receipts, normal shopping and suspend/resume. This draft adds concrete lines and the physical thresholds. It deliberately does not claim the existing coast spot already supports sitting, that entering the shop proves a purchase, or that this casual outing advances Kenji's authored karaoke milestones.

## Cold-read corrections

Independent `flock_review` reported no blocking story findings. The follow-up fixes remove the extra confirmation promise for unsupported travel, reserve seats only after choosing to sit, and give a brief arcade stop a truthful callback label. The hook mapping now uses the builder's actual `outing` states. Stop receipts require observed arrival, paid-and-collected drink goods or both seated bodies; completing dialogue alone cannot create one. These are contract corrections, not claims that browser staging or Claude story approval has passed.
