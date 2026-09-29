# Day 1 simplification: proposal

[Pick train, gate, lift or office](http://127.0.0.1:8771/bible/#review/day1-simplify). Each can be approved separately. This review changes no playable story or voice asset.

The lunchbox already takes two inputs: choose what to do, then advance the response. Apply that economy within the longer scenes: remove another tap on someone who is already speaking, repeated explanations and prerequisite pointing. The door pause stays so players can try akete. Keep the word, the player's attempt and the consequence understandable.

## Revised after the cold read

The office option now keeps both knocks, with a chance to use akete between them. Both request cards and Eric’s reaction to the copier’s age stay. The gate hint matches the mime menu, Hamada’s choice names his predicament, Mio’s reply regains her conversational hedge and echo, and her phone gets a short visible buzz before she reads it. Exact changes are in the linked scene documents.

## Before and after

One complete example: speak to a passenger; take any lunchbox outcome; nod rather than ask about family; practise with Tama; stay quiet after the train rescue; skip greeting the guard and help Hamada through mime without optional joke choices; knock at Mio's door; eat quietly with Mio; stay quiet at the evening question. This route includes Hamada's social-route snack visit in the office.

An **advance** is continuing a fully displayed spoken or narration line. **Choices** below are story choices, excluding the Say word selector. **Extra interactions removed** are mandatory reactivations of a person or door within an exchange. All successful teaching and practice submissions stay.

| Section | Advances before | Proposed | Story choices before → after | Extra interactions removed |
|---|---:|---:|---:|---|
| Train | 46 | 39 | 4 → 4 | 1: tap Mio after her phone buzzes |
| Gate, social solution | 26 | 16 | 3 → 1 | 0; two pointing choices removed instead |
| Lift | 5 | 3 | 0 → 0 | 0 |
| Office, Mio quiet lunch | 60 | 52 | 3 → 3 | 1: Talk to Mio after the chair |
| This whole route | 137 | 110 | 10 → 8 | 2 |

That example removes **31 successful input steps**: 27 advances, two menu choices and two re-interactions. It does not count walking taps, individual typing characters, text-reveal taps, retries or optional exploration. It is a source-based count, not a timed playthrough. Merging short replies reduces advances; it does not make the retained words disappear.

## Scene-by-scene counts and every changed line

Each document starts with its scene table, includes alternate and optional routes, and lists exact old/new or deleted text and flow changes. Unchanged helpers and optional scenes are accounted for so nothing silently disappears from the day.

- [Train: all 56 nodes, lessons, rescue and optional passenger/cat interactions](train.md).
- [Gate: all 46 nodes, magic and social routes; both travel transitions including the lift](gate.md).
- [Office: all 80 nodes, both lunch routes, gifts, afternoon and ending](office.md).

The train document includes Say selections in C and opens in E; gate and office separate them from authored choices. Use each table's key. In every case the cost of opening Say, selecting the word and any mastery-dependent typing is stated. A choice or typing prompt does not also cost a dialogue advance.

## What remains

Free exploration and player-started lesson breaks remain. Every taught word retains its successful typing step. Gate akete keeps a slow spoken model; the office retains normal and slow pronunciation. Both gate solutions, both lunches, warmth and relationship consequences, Kenji's cat distraction, the chair cat, Mori's seven cups, Emi's visit and optional gifts remain. The train rescue still establishes the sleeping passenger, failed attempt, closing doors and Eric's visible effect before the reaction.

The office ends at the existing repair request. Dorm interiors are a separate future review after the campus layout is chosen.

## Implementation after a pick

Sources were frozen at commit `52144e9`; source hashes and exact indices are in the detailed documents. Apply selected changes to the current story, preserve the fallback triggers for existing saves, update the affected story facts, and ask Claude's voice tool for changed spoken lines. Check the changed branches and run the required game checks then. This proposal has not changed the runtime or established a new build.

GUIDE checks: fewest steps, direct narration, readable cause and effect, spoken character voices, no new future plot. The four writing skills informed the edit; dialogue preserves distinct voices, story-sense identifies repeated beats, humanizer keeps plain language, and cliche-transcendence keeps people occupied with their own concerns. Claude’s C-0092 cold-reader findings are folded into this revision. The request cards, Eric’s 1996 reaction and the door-command opportunity are retained; all counts above describe the revised proposal.
