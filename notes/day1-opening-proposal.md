# Train opening with reverse exposure

Working proposal, 2026-09-25. Not an approved script. This replaces the earlier proposal in this file: the user rejected its English fact-sheet exposition and onboarding-led opening. No game code has changed.

The newer screen-by-screen draft is `train-opening-script.md`. It replaces this proposal's opening phone argument with a simple physical interaction and short Japanese phrases, following the user's instruction to avoid an initial Japanese dump. Use that draft for the current train sequence.

The user's direction: start from the moment someone opens the game. Neither game nor player knows the other. Build understanding gradually through an engaging, recognisable game, with generous Japanese speech, immediate escape hatches, and opportunities to feel growing proficiency. Introduce the setting through events and interaction. Do not open with a narrated list explaining the job, island and relocation.

## Existing learning rule

GUIDE.md's reverse-learning instruction takes precedence over older placement-check proposals: initially show natural Japanese. A word tap reveals its kana reading; another reveals English. Observe requested help and adapt gently. Reintroduce unfamiliar language later. No opening test or level selection.

Assuming competence governs presentation. Internally, untouched words remain unconfirmed. A lack of taps is not proof of mastery.

## Proposed scene

Meet Rei on the train before knowing her name or company role. This changes the previous plan to meet her first in Sales and would require a later script revision if selected.

The opening sound is her side of a phone argument: 「だから、無理だって。」 She listens, then ends the call: 「……じゃあ、自分でやって。」 Across the aisle, her laptop and papers occupy the adjacent seat.

The train bends and her coffee slides towards the laptop. Let the player catch the cup or steady the laptop; she secures the other. This is a staged choice, not a timed reaction test. Physical actions can use clear English labels or visual targets. She says 「……ありがとう。」 and clears the seat: 「どうぞ。」

The player sits. Rei notices their new company badge and asks 「初日？」 Her tone, glance and the badge supply context. The player can nod, show the badge or speak. She reads the department: 「企画室７？」 then recognises Emi's team. Her manner changes slightly.

The island becomes visible during the conversation. Optional questions concern things the player can see. A company-phone notification from Emi introduces a second relationship within this scene. Rei knows her; the player has a reason to notice Rei's reaction. Specific dialogue and the reason for that reaction still need writing.

At arrival, the exchange ends with Rei collecting her things. The player can help with the coffee again. Learning her name gives a future visit to Sales personal significance.

The scene needs to work as character interaction before adding language measurement. Rei's own concern starts the scene; curiosity about her and the destination carries it. She should not become a language tutor or an exposition guide.

## How reverse exposure appears during the scene

All spoken dialogue starts voiced, with natural Japanese subtitles following the voice. No default English translations or universal furigana. Teach tapping directly on the first subtitle: a small dismissible cue says 'Tap a word for help.' The first reading reveal carries the short follow-up 'Tap again for the meaning.' The explanation happens on the dialogue itself, without opening an onboarding screen. A proficient player can continue without requesting help. This follows the user's explicit direction: teach the player to tap to explain, and adapt future text as play proceeds.

For 初日, the first tap shows しょにち above the word. The second shows a contextual meaning such as 'first day' below it. Already-kana expressions do not get duplicate kana readings; their meaning should be directly accessible. Keep romanisation available on request for players who need script support, consistent with the guide's tap-only katakana support.

Reveals persist while the player is using the line. No dialogue advances or response expires while they inspect words. Replay is available and slightly slower. The backlog allows returning to earlier lines.

A clearly labelled whole-line Meaning control is the quick escape hatch when word-by-word inspection would be tedious or fail to explain grammar. It records sentence-level assistance, without declaring every constituent word unknown. A contextual 'Help me respond' control provides an immediately usable response or action.

Reply options begin in Japanese where the character will speak Japanese. Their words support the same taps. Inspecting an option must not select it. The chosen line is spoken aloud by the protagonist. Straightforward gestures can remain available where plausible, so understanding speech and producing speech are separate demands.

## Adapt from requests for help

- Reading revealed: assistance requested for this written word in this context. Do not mark every constituent kanji unreadable.
- Meaning revealed: assistance requested with this word's meaning.
- Whole-line meaning revealed: sentence-level support; the difficulty might be grammar or a phrase.
- Replay: audio support used, with no automatic conclusion of failure.
- Correct contextual action: tentative comprehension evidence, weighted by available visual and language support.
- Unaided reuse later: stronger evidence, still requiring successes on separate days before mastery.
- Continued without help: exposure only.

After a reading request, retain that reading as support for the word's next occurrence. Repeated reading requests justify broader automatic readings for the relevant written forms. Meaning requests identify words to reuse in short, clear contexts soon. Keep vocabulary, written forms and grammar evidence separate. A single lookup should not change the entire game's difficulty.

Adapt future wording as well as text rendering. If several lines need extensive explanation, subsequent dialogue should use shorter clauses, more familiar vocabulary and fewer simultaneous unfamiliar elements, while preserving the character's intent and the scene's events. For example, Rei can ask 「初日？」 where an otherwise suitable fuller line is 「今日からここで働くの？」. These are equivalent story beats with different language demands, not a claim that one is universally easier: choose from what this player has requested help with. Authored alternate lines can support this without changing the plot or requiring an LLM. If little help is requested, keep natural dialogue rather than automatically raising difficulty from silence alone.

## How improvement becomes perceptible

The train gives language an event to attach to: thanks follows catching the cup; an invitation follows clearing the seat; 初日 concerns the new badge. Later, another person uses an expression in a different context. The player recognises it or acts with less assistance. Do not announce mastery after two encounters or remove requested assistance prematurely.

Keep the same story for learners at different levels. More experienced players hear the full phone exchange and read Rei's attitude. Beginners can follow its emotional shape, participate physically, and reveal whichever language they want. Necessary plot facts must remain recoverable through help; optional overheard details need not all become learning targets.

Reuse a few requested words and useful expressions in later authored scenes. Do not contort every character's speech around a review queue or replace the story with generated exercises.

## Next review

Write and storyboard only the train encounter first: what happens, what the player sees and hears, what they can do, and what help is available on each screen. Check that a player can follow and enjoy it without any Japanese, while a proficient player can proceed without compulsory explanation. This proposal is not authorization to implement new assets or replace the game script.
