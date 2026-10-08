# Independent conversation review

Reviewed held candidate `b0fe4f7c` against `a97a5ea7`, 2026-10-08. This is an independent Codex read, not the required Claude cross-team review. No game files changed. The candidate remains held for revision, Claude review, voice production and rendered QA.

Read GUIDE Writing, the story-reader checklist, VOICE.md, FORMAT.md, setting and relevant cast facts, both complete conversation files, their integration and memory/save code, the changed tests and candidate documentation. Applied dialogue and humanizer diagnostically. Findings below come from source and branch reading; the author's assessment was not treated as evidence.

## Should fix before voice production

### 1. Emi offers a request discussion the player cannot have

`game3d/story/conversations/emi.js:82`, `chat_emi_language`; `emi.js:91`, `chat_emi_team_again`.

Emi says, “If you still aren’t sure, bring the question to me before you start taking anything apart.” On the next visit she asks, “Is it a request you want to go over?” The results preference instead produces “Have you got a result for me, or are you still checking?” Neither question has an answering option. The choices are a worry about competence, changing the help preference, and having nothing to report. Changing the preference just returns to the generic agreement menu. This creates an expectation of practical help and then blocks it at the offered interaction.

Keep this slice within its authored scope: make the opener ask about the remembered preference and how it feels, with choices that answer that question, and remove the unsupported invitation to bring a particular request. Alternatively, implement a concrete request discussion using real ticket state. The latter is a larger feature and is not necessary to fix this conversation. Check both `results` and `request` branches as complete exchanges, rather than asserting only that their opening lines differ.

### 2. Emi forgets the listening boundary in the conversation where it matters

`game3d/story/conversations/emi.js:103`, `chat_emi_worry`; `emi.js:111`, `chat_emi_ask_first`; `emi.js:129`, `chat_emi_hello`.

Reproduction: finish the work agreement, return, choose the worry, ask “Could you hear me out before giving me advice?”, and finish with “That was it. I just wanted you to know.” Return and choose the worry again. Even with `chat_emi_ask_first: true`, Emi repeats the identical advice, Eric repeats his boundary, and Emi repeats the identical apology. The only flag read is in the unrelated no-work hello. The saved memory says she heard the request, while the directly relevant repeated encounter behaves as if it never happened.

The real Runner reproduces identical first and second transcripts. Have `chat_emi_worry` acknowledge the existing boundary before advising and allow the player to request advice or finish being heard. A recurring mistake could be in character, but it needs recognition and a changed exchange; this version is an unacknowledged reset. Add a return-to-the-same-worry assertion, rather than relying only on the existing hello assertion.

## Craft observations

Mio's mother's-food follow-up has the clearest subtext. Her mother gets past “it’s fine” by asking what she has eaten; Mio accepts food after pointing out that her mother is still working. Those details reveal care and avoidance through an ordinary disagreement. They extend the already established mother/food relationship without installing a new job, former partner, family event or proposed history.

Emi's strongest distinction is her concern about what she has already told upstairs. “I may need a moment to change what I was going to tell upstairs” lets her protect her own concern while trying to support the player. Keep that friction. Her new exchanges otherwise lean toward explicit descriptions of good communication: advice, hearing someone out, being unsure, asking for help. “I worry that asking makes me look unable to do the job” is particularly formal and explanatory for Eric's short, dry voice. This is a dialogue D4/text-and-subtext concern, not a broken branch. A less clinical expression of the same selected concern would help the two characters remain distinct.

Mio's deferred return (`chat_mio_settling_again:105`) asks whether the player has figured out what to do after work, then offers questions about her mother, “I feel differently about it now”, or hello. The player has not previously chosen a feeling in this state. Give this state a direct route back to answering the check-in without claiming a change of mind. This is a smaller version of finding 1 and worth resolving in the same pass.

There is no need to turn these topics into longer confessions. Ordinary disclosures, a credible response, and a changed later response satisfy this slice. Mio's check-in is somewhat more accommodating than her early guarded voice, but it follows her own family topic and does not leap to romance or intimacy.

## Branch read and pacing

Counts below are visible spoken lines and choice menus from the named topic, excluding the outer Chat menu, invisible hooks and later revisits. These are authored counts, not measured browser taps. A typed lesson adds its own input.

| Topic and branches read | Pacing and continuation |
|---|---|
| Mio mainland: nice / shops, then quiet / try / English / defer | Both original answers join the same quote coherently. Quiet ends after 10 lines and 2 menus; defer after 8 and 2; English after 10 and 3. The new check-in adds about 2–4 lines and 1–2 menus to the original family topic. No separate stage is needed. |
| Mio try, then wait, then mother / understood advice / revise / hello | Waiting opens a real reply turn. Mother route is 12 lines and 4 menus from mainland; understood advice is 13 and 4. Revision can return through all preference choices. No timed pause, automatic lesson or unseen activity is inserted. |
| Mio repeat: quiet / try / English / no selected preference / legacy home | The remembered opener matches quiet, try and English. Mother, understood advice, revision and hello all terminate normally. The no-preference opener has the answer mismatch noted above. Legacy home gets the first check-in. |
| Mio retained food / lunch / drink / quiet-lunch / break / guess / mother-right / break-again | Read both milestone conditions and the understood menu. No changed continuation finding. Sender entries and busy-morning limits are unchanged; sender investigation content is outside this review. |
| Emi initial work: daijoubu / result / language | Both agreement answers end at the same coherent response, 6 lines and 1 menu. Language is 7 lines and 2 menus if the lesson is declined, or 10 lines, 2 menus and typing if requested. Already-known mouichido skips the extra menu and lesson. |
| Emi repeat: request / results, then worry / change-help / hello | All targets exist and finish, but the opening question has no direct answer (finding 1). Changing help reaches every existing agreement branch and saves the revised value. |
| Emi worry: ask-first / unsure, then heard / requested language help | First-time heard route is 6 lines and 3 menus. Explicitly requesting help after the apology makes the ensuing advice appropriate. Returning with the boundary already set fails finding 2. Unsure branch is coherent and retains her concern about reporting upstairs. |
| Emi hello: boundary absent / present, then how-she-is / leave; club known / unknown | The personal-answer path is 5 lines and 2 menus. Both club variants follow the question and claim no completed player outing. These are acknowledgements and brief personal contact, not a new relationship milestone. |
| Emi retained club / volunteer / enjoy / turn / optional repeat-word lesson | Read both milestone versions. No newly introduced continuation finding. |

The extra menus serve different decisions, so wholesale shortening would remove agency. Most repetition risk lies in returning to the same apology and preference menus without a changed response, not the length of the first encounter. No new narration, exposition panels, slogans, fragment triads or visible actions claimed without staging were found.

## Language, memory and reachability

- The new mother-advice question requires both `know_yasumi` and `chat_mio_break_understood`. The ordinary mother question supplies no translation of the earlier Japanese remark. All four knowledge/understanding combinations are covered by the Runner test. The English fallback inside `chat_mio_her_break` is unreachable through its current guarded menu and does not create a player-accessible bypass.
- Daijoubu remains knowledge-gated. Mouichido is taught only through the existing explicitly chosen typing action; already knowing it prevents a repeat lesson. There are no new `en` subtitle fields or `clear` entries. English is appropriate to these two established speakers.
- `chat_mio_home || chat_mio_checkin_offered` preserves access for completed old-save family conversations. Deferral leaves the check-in reachable and does not fabricate a preference or memory. A deferred revision keeps the earlier preference. Emi's previously completed work topic can be revisited to make the new agreement.
- Mutable preference flags drive later lines. The three new memory texts describe past conversations and remain true after preference revision. `Bonds.remember` deduplicates by normalized id; these ids do not overlap within either character. There are no bond awards, completed-ticket flags, invented outing completion flags or changes to the day clock.
- Ordinary flag persistence is supported by the real save code copying `flags` and restoring them. This read does not establish compatibility for an old save paused inside a node whose contents changed, nor does it substitute for public Continue/browser QA.

## Verification and limits

Ran `node --test game3d/test/unit/conversation-reciprocity.test.mjs game3d/test/unit/runner-choice-words.test.mjs`: 11 tests passed. Also reproduced finding 2 through the real Runner over two visits using the first visit's resulting flags. The test output includes the pre-existing unknown `sender` hook warning from the word-rendering fixture.

The new tests meaningfully exercise the actual Runner: condition filtering, jumps, choices, flag writes, camera/save hook dispatch and a restored frame. They do not merely inspect story strings. Their limits matter: `remember` is a locally implemented deduplication stub, `save` records a call, and the Continue case calls `run(..., { restored })` directly. It does not execute the complete save serialization, checkpoint validation, title Continue or load path. The lesson hook adds the word directly instead of exercising typing. These are reasonable unit boundaries, provided their passing result is not represented as end-to-end persistence, lesson or rendered verification.

The candidate's documented 40 missing voice clips remain a release blocker. I did not rerun voice generation or the strict fast tests, which the candidate note says stop at that gate. Claude's independent cross-team story read, approved-reference voice production, strict phone/desktop fast tests and rendered checks remain outstanding after the narrative fixes.

## Verification of revision e00908ad

Independent follow-up on 2026-10-08, reviewing `b0fe4f7c..e00908ad`. The original findings above remain as the record of the earlier candidate. All three requested corrections are resolved in this revision; no new finding in the changed branches.

1. **Emi's unsupported request discussion:** `chat_emi_language` no longer invites the player to bring a particular request. Both variants of `chat_emi_team_again` ask how the player feels about the remembered agreement. The new `chat_emi_still_agree` provides a direct unchanged answer, with a response about Emi's concern over what she has already told upstairs. The other replies can now express uncertainty, revise the agreement or redirect to hello without dodging a concrete ticket question. No ticket action or scheduling change was added; her reassurance about allowing time is conversational, not an implemented adjustment to the clock.
2. **Remembered listening boundary:** `chat_emi_worry` reads `chat_emi_ask_first` before the old advice and jumps to `chat_emi_worry_listen`. I reran the original two-visit reproduction through `chat_emi`, using the first visit's resulting flags and memory, for both `request` and `results`. On the second visit Emi says, “I remember. Do you want my answer this time?” Declining reaches `chat_emi_heard` without advice. Accepting reaches `chat_emi_worry_answer`, where she answers the concern and relates it to her own premature promises. Neither repeat includes the old advice, the repeated apology or another request to hear the player out. The memory remains a single entry in the test hook.
3. **Mio's deferred first answer:** `chat_mio_return_questions` offers “I think I know what I’d like now” when no preference exists, and offers “I feel differently about it now” only when one does. I ran a legacy `chat_mio_home` state through the normal Chat menu, deferred the first check-in, returned through Chat and chose the first preference. The menu made no claim of a changed feeling, and the resulting value was `quiet`. The revision retains the existing Japanese clue conditions.

The revised worry line, “If I keep asking, won’t you think I can’t do this?”, also addresses the earlier formal-voice observation. The requested-answer response connects Eric's concern with Emi's tendency to promise too soon, giving the reply a character-specific second purpose.

Ran the two reviewed test files again: 14 tests passed. Separately executed and read the real Runner's transcripts for four repeated-worry cases (two stored help preferences, each accepting or declining an answer), both unchanged-agreement answers, and Mio's legacy-save deferral/first-preference sequence. Camera release, normal completion and stored preference assertions passed. The unit boundaries described above still apply; this does not claim a full browser Continue test. I did not independently rerun the reported 744-test full suite or the broader 27-test focused set.

Ready for Claude's required cross-team story review. Still held, with no approval to land or release. The coordinator reports the revised manifest now has 44 missing clips; I did not independently recount them or generate audio. Approved-reference voice production, strict phone/desktop tests and rendered verification remain outstanding.
