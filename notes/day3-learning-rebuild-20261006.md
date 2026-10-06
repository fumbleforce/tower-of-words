# Day-three learning and story rebuild

Work #294, claim X-0653. The revised source and voices have passed independent cold review and automated checks; final integrated player QA is recorded below.

The user’s full review request is recorded in notes/feedback-game/2026-10-06_213555. The false Emi introduction is _214411. The request for pool and swimming vocabulary and illustrated event moments is _214913. Physical pool work belongs to X-0649; illustrations and swimwear remain separate asset dependencies. No text here certifies them as installed.

## Diagnosis

The day originally introduced only koko as a new word, plus a dashite lesson during the printer job. Joining and completing the swimming club taught no pool terms. The repair jobs could be passed by selecting a single obvious action. Most incidental people supplied one line without inviting a response. A branch checker established reachability, not an interesting day or a coherent player learning experience.

The Emi report is a state bug as well as a writing failure. Day-selector samples save Emi in `met` but do not save `met_emi`. Restore rebuilt the People collection without that derived condition; Talk also failed to repair it when she was already in the collection. Day-three arrival then saved `d3_emi_needs_intro`, which overrode later meetings. The fix reconstructs only met flags from the saved collection and handles old introduction captures without rewriting unrelated relationship state.

## Revised learning path

The latest user instruction asks for enough language without lessons crowding out dialogue, and persistent reuse across the game. The first density draft below was reviewed, then reduced before landing. Existing recordings remain as unused candidates wherever a lesson was removed.

| Context | Word | Required or optional | Immediate and later authored use |
| --- | --- | --- | --- |
| Club-board map | koko, here | Optional existing lesson | Map reply, goggles-owner speech, inherited map interaction in later story sets |
| Monitor fault | gamen, screen | Core ticket | Guard's model, typed noun, witnessed retest; known-word branches at d4_display and d5_screen |
| Booking request | yoyaku, booking | Core ticket | Typed request and complete list check; court reservation in d4_tennis_offer |
| Completed printer sheet | dashite, give it out | Core ticket if print completed | Existing command prepared before guided vending delivery; optional later printer catch-up |
| Choosing to swim | oyogu, swim | One optional conversation reply | Typed only if the player asks; used when joining; Kuro's later d3_kuro_pool question |
| Pool and easy pace | puru / yukkuri | Context only | Readable location/pace glosses, no typing or learned records |
| Choosing to watch | existing mitai | Reuse only | Known phrase reply or ordinary English; no miru lesson |

The core ticket route has at most three new typed words, separated by repair actions. Every normal swim/watch/bags/Leave branch has zero prompts. The optional pool reply adds one. Four day-three vocabulary records remain (existing koko, new gamen/yoyaku/oyogu); dashite already exists centrally. No new powers are introduced. The later callbacks have English alternatives when the word is unknown. A future club week is not claimed playable, and no day-six scene was invented.

## Story and staging

The station monitor repair is tested in front of its requester. After the connector is seated and the monitor physically turns, the player can verify it again before closing the request. Payment and the relationship award remain once-only. The gym list connects paid work to an actual evening activity: the player prints a complete sheet and sees the swimming session on its final line before signing off.

At the club, Emi has arrived but still gets handed other people’s bags and equipment list. The player can help, swim, watch or leave. Emi gives the work back and actually gets into the pool. Post-swim conversation concerns her difficulty leaving the office behind; no confession or bond milestone is inserted. The scene retains current physical state names so the builder can stage every handover and entry. A known Emi receives a greeting, and an actual first meeting does not assert a false history of missed encounters.

The obvious weak versions were a vocabulary lecturer at the pool, another automatic repair click, a manager giving a briefing instead of swimming, and warm colleagues forgetting the player. The draft uses the existing people’s immediate wants and an action to give each word a purpose. Dialogue, story-sense, humanizer and cliché checks informed the revision; the independent cold read covered the complete revised branches.

## Cold read and validation in progress

Root independently read the complete revised branches. Corrected the copier callback from yesterday to the first day, removed an unsupported membership assertion from Kuro’s invitation reply, and removed the duplicate English instruction before the Japanese pace cue. The later density review removed the yukkuri typing lesson entirely. Root accepted the revised wording for scoped voice production. Japanese word mentions inside English dialogue use word tokens, so production splits actual kana/kanji into native Japanese takes.

The authoring checker passes 196 contextual nodes, including each swimming/deck/bag/Leave branch, repeat-word suppression, monitor retesting before payment, and known Emi / prior Kuro invitation histories. The final run uses landed Day 2 definitions from 93f89a83; the integrated CPU gate passes. Save/declaration/recovery checks pass 27 cases, including the real Continue callback after place restoration. Physical staging and final browser play remain separate acceptance requirements.

The first voice batch covered 98 new or changed clips for both protagonists, with unchanged approved references. It exported 92 passing clips and stopped honestly on six short Japanese units; no fallback ran. After the density revision, removed lines and all takes remain saved, and the accepted reduced-density cold read generated only the missing delta. That revised batch exported 15 further passing clips (107 retained exports total); eight short gamen units remained unqualified under the unchanged native-Japanese guard. A bounded generation-only kana spelling repair used three new natural seeds per unit; the checker still compares the original written target and approved reference. Source manifest and raw takes are under `/home/jorgen/ai/game3d-day3-rebuild/`; no fallback is enabled. The new words are vocabulary, not newly invented powers. Swimming clothes and requested illustrations remain separate unresolved asset work until their own acceptance; no source-test result claims them complete.

The bounded kana-spelling repair supplied four additional qualifying Japanese units. Four remaining identical-word destinations reuse unchanged same-protagonist recordings, with original source keys/takes and SHA256 in `gamen-reuse-provenance.json`. Every destination passed the unchanged checker (CER 0, native-Japanese probability 0.828 for Eric / 0.869 for Carina); no speech processing, reference substitution or fallback ran. The retained export total is 115, including unused earlier candidates. Nine changed overheard clips have ten aligned surfaces and zero missing spans; unrelated baseline spans and every baseline clip text entry remain unchanged, including the subsequently landed Day 2 clips.

The production typing hook was exercised with real text input at desktop Eric and phone Carina sizes for gamen, yoyaku and oyogu. All six matching protagonist MP3s emitted actual `playing` and `ended` events without audio or page errors. Evidence is `game3d/shots/day3-word-audio/` in the shared checkout. This is playback and automated reading/native/pitch qualification, not a claimed human listening approval.

After merging Day 2, whole-game coverage checks 1,201 active lines with no missing clips or escapes. Both full-day viewports reached the ending, but the initial integrated run exposed pool motion diagnostics and genuine shared-step overlaps. The separate pool correction removes ground-gait checks while actively swimming, retains submerged pair-collision checks and limits facing speed. Its first integration leaves four reproducible step-path overlaps on both sizes; choreography correction is pending. These failures are retained in `game3d/shots/day3-rebuild/fast/` rather than reported as passes.

The first phone branch matrix passed 32 of 33 scenarios and covered all 37 authored choices. Its Continue fixture incorrectly waited for dialogue on the parent node before a newly called child; it now checkpoints the actual `club_swimming_slow` dialogue and retains the same real title/Continue and save assertions. The original failing report is retained with the later correction.

Final branch coverage: desktop Eric passes 33/33 scenarios and 37/37 authored choices. Phone Carina passes the same 33 scenarios across the original matrix and corrected Continue rerun, also covering 37/37 choices. Continue now resumes the actual water dialogue child; the parent frame remains available for the remaining length and exit. Both native typing runs produce all six matching audio events. All 115 owned MP3s were independently hash-checked against their preserved main-checkout copies; no baseline audio was replaced.

Final integrated full-day runs pass at desktop Eric and phone Carina in 114 and 116 seconds respectively, with more than 20,000 sampled movement steps per run and zero overlaps, spins or sustained gait reports. The tested pool motion dependency is 323fab6b: swimmers wait clear of the shared steps; active water motion retains pair-collision checks; Continue preserves the low camera. Performance warnings against older scene baselines remain in the reports; this pass does not raise budgets or claim a performance improvement. All failed and passing reports are preserved under `game3d/shots/day3-rebuild/`. The separate archive QA's transient Tama collision remains recorded in `game3d/shots/dialogue-archive/validation-scope.json` for follow-up.
