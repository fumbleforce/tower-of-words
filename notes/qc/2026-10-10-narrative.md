# Narrative and plan QC — 10 October 2026

Codex. Reviewed public narrative and plans at `5b501000fa3da5508fff2adca8162bb419e1b93c`. Scope: Kuro's recurring conversations, opening lessons, seasonal club stories and the approved relationship plan. Implemented behavior and future-plan dependencies are distinguished below.

## Findings

### Current defect: skipping the opening swim blocks a recurring conversation

`game3d/story/conversations/kuro.js` requires `know_oyogu` before Kuro's swimming follow-up appears. The only typed lesson for that word is `club_swimming_word` in `game3d/story/clubs.js`, during the optional opening Saturday swim. Later Saturdays use `game3d/story/ongoing/gym.js` and the winter club nodes, which do not teach it.

A player who skips that lesson can keep hearing her swimming remark without being able to pursue its meaning. Add a contextual opportunity to learn the word in a recurring conversation. This is tracked in [#427](https://github.com/fumbleforce/tower-of-words/issues/427), related to the parked persistent-language work #297/#300.

### Plan dependency: three prerequisite words can be missed

`notes/characters/kuro/route.md`, step 3, requires `watashi`, `anata`, `rokuji` and `futari`. The first three are currently taught in optional opening exchanges: day-two reception in `story/day2/forecourt.js` and Aoi's introduction in `story/day3/plaza.js`. No recurring public lesson was found for them.

Add later opportunities to acquire those words before implementing the requirement under [#357](https://github.com/fumbleforce/tower-of-words/issues/357). The acquisition work is included in #427. `Futari` already recurs through the inherited shotengai interaction and is not a missing prerequisite. This finding concerns a future plan, not an assertion that the planned relationship scene currently runs.

### Manual decision: the swimming plan conflicts with winter closure

The planned step-3 meeting takes place at the pool at 14 relationship points. The outdoor pool closes after day three, before the three-point daily cap permits that threshold. Recurring club meetings use the gym. The step-4 friendship continuation also allows the player to propose a later swim, so the conflict reaches beyond one scene.

[Review: Kuro's winter venue](../../reviews/kuro-winter-venue-1/review.json) asks whether to adapt the meetings to the existing winter gym or preserve swimming and establish a year-round venue. I recommend the gym because it fits the existing seasonal schedule. The approved rule that she stops inviting him after a refusal remains in force; this decision concerns the setting and activity. The approved relationship choices stay unchanged. Review work is tracked in [#428](https://github.com/fumbleforce/tower-of-words/issues/428); implementation stays with #357 after the answer.

## Verification and limits

The review traced teaching hooks, inherited story nodes, recurring club overrides and Say practice. Say lists known words (`game3d/js/ui.js`); practice and gloss clicks do not provide an alternate acquisition path. No browser playthrough was performed for this report.

The previously reported Rei approval and threshold discrepancies remain with #357 and are not counted again. No additional prose defect was found in the approved Aoi and Emi bios within this pass. That is a bounded reading, not approval of every character document.

For future plan reviews, trace required words, earliest reachable relationship thresholds and the calendar together before approving scene placement. A plausible scene can still be unreachable under the game's progression rules.
