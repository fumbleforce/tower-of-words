# Day 4

Sunday 4 October. Story, voices and physical integration are implemented; Sunday is playable through the normal Days menu and Saturday’s end screen. The [story set](../../../../game3d/story/day4/index.js) contains the open routes, routine, optional stops, tennis session and two new repair requests. Its [build contract](../../../../game3d/story/day4/README.md#build-contract-for-claude) specifies staging and save behaviour. The [day loader](../../../../game3d/js/days.js) includes Sunday among the five opening days.

## Cast

`eric`, `rei`, `aoi`, `mio`, `mori`, `kenji`, `emi`, `guard`, `kuroda`, `kuro`, `tama`, `attendant`, `member`.

## Beats

Mio's morning messages name the court display and gym fan requests before the player goes out. The room's desk advances one period or rests until evening; the bed offers Sleep in the evening regardless of work or club progress. Saturday's unfinished requests retain their progress and hours.

The tennis club meets on Sunday evening. Rei introduces herself and offers two spare rackets. Aoi can practise with the player on a separate practice court while Rei waits for her doubles game. The player can practise with Aoi or watch Rei demonstrate a serve. Either path gives Aoi a turn before Rei goes back to doubles. A drink afterwards is optional. Leaving early preserves the invitation.

At the court, Rei demonstrates one press adding two points. The player reseats the button cap; Rei checks a single increment. At the gym desk, the attendant asks for help with the stalled fan before either the lever or a known command starts it. A full oscillation precedes his confirmation. Each completed request pays once. Neither repair advances time or closes its venue.

## Choices and flags

| Flag | Set by / read by |
|---|---|
| `d4_tennis_done` | Either completed tennis branch; later club visits offer ordinary play. |
| `d4_played_aoi`, `d4_watched_rei` | The selected activity; Rei can recall it during her separate personal scenes. Neither awards a bond step. |
| `d4_rei_intro` | Rei's spoken introduction; gates her known name. Aoi retains `d3_aoi_intro`. |
| `d4_display_done`, `d4_fan_done` | Verified repairs; their respective T-0005/T-0006 closures and physical restoration. |
| `d4_complete` | Choosing Sleep; the integration must provide the next-day transition. |

## Words taught

| Word | By | Node |
|---|---|---|
| `isshoni` | `aoi` | `d4_together` |

The invitation's word lesson is optional. Known `ikitai` can be combined with it; unknown `ikitai` is not assumed. The inherited printer lesson remains available separately after an ordinary print.

## Nodes

| File | Nodes |
|---|---|
| `day4/dorms.js` | Room routine, ticket list and Sleep (`d4_room`, `d4_chair`, `d4_bed`). |
| `day4/sports.js`, `day4/tennis.js` | Court repair and club offer (`d4_display`, `d4_tennis_offer`). |
| `day4/gym.js`, `day4/fan.js` | Deferred booking repair, fan request and printer lesson (`d3_booking`, `d4_fan`, `d4_printer`). |
| Other files in `day4/` | Routes, deferred station work and optional place conversations. |

The separate [finds and personal-scene packs](../early-optional/README.md) have independent eligibility. Sunday staging lives in `game3d/js/places/day4/`, including physical repair state, court play, optional props and checkpoint restoration.
