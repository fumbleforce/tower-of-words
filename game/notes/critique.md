# Critique of the day-1 slice

Reviewer stance: second-language-acquisition research, Japanese teaching, and narrative direction. This is deliberately harsh. The slice has good bones (listen first, actions that prove comprehension, register with consequences), but several core systems currently measure the wrong thing or quietly teach reliance on English.

## 1. Learning effectiveness

**What works.**
- Comprehension proven by action. You show your ID, pick the right floor, pay the price Kaori said. That is the strongest idea in the slice: the learner has to understand in order to act, and the game can check it.
- Register as a consequence. Ishibashi frowning at casual speech teaches more than a rule would.
- Listen first. Hearing a line before reading it trains exactly the skill needed for anime.
- Session length. About 55 lines is roughly 10 to 15 minutes, which fits the commute.

**What does not work.**

*The "known" rule measures exposure, not memory.* A word becomes known after being seen twice in one day without a look-up (`main.js`, summary). That has three problems:
1. Seeing is not recalling. Nothing ever asks the player to retrieve the word, and retrieval practice is the single best-supported driver of retention.
2. It's massed, not spaced. Two sightings ten minutes apart in the same scene say nothing about next week. Spacing across days is what predicts long-term memory.
3. It rewards the crutch. A word shown with romaji above it will almost never be looked up, because the reading is already on screen. So the romaji words get promoted to "known" fastest, while the player never read the kanji at all.

*English is always one tap away, and choices show it outright.* Every reply option carries its English meaning underneath. The player will choose by reading the English, which turns every decision into an English decision. The T toggle and the English on notifications add to it. The research on translation dependence is clear: if the meaning arrives in the L1 first, the L2 form is processed shallowly or not at all.

*Romaji over kanji is a trade-off Jørgen asked for, but it has a cost.* His quiz showed about 70% of hiragana and weak katakana. Romaji ruby lets him read now, but it removes any reason to read kana, which is the skill that unlocks everything later. It is fine as a first stage, not as the steady state. A better progression, set per word:
1. First encounters: romaji ruby (what he asked for).
2. After a few successful encounters: kana ruby (furigana), which quietly trains kana reading.
3. Once recalled reliably: kanji alone.
4. On a slip: step back one stage.

Katakana words need the same treatment. Right now IDカード, ゲーム, リーダー, カレー, ロビー and サービス are not tagged at all, so his weakest script gets no support and no tracking.

*There is almost no output.* Every choice is recognition (pick one of three). The spell is a two-step multiple choice with a one-in-three guess. Output with feedback (Swain) needs the learner to produce the form: typing, assembling it from parts, or saying it. The free talk at the bar is the only real output, and it needs a server.

*Listening checks can be bypassed.* The monorail announcement is the listening test, but the subtitle un-blurs when the audio ends and English is one key away. For lines that exist as listening checks, keep the text hidden until the player acts, with a replay button instead.

**What should be measured.**
- Per word: exposures, look-ups, retrieval attempts and successes, and days since the last success. Schedule reviews with FSRS or similar.
- Per grammar pattern: correct productions in spells and replies.
- Listening: accuracy on audio-only checks, and replays needed.
- Reading: kana speed on katakana words; share of kanji read without a reading aid.
- Output: typed or assembled replies accepted without correction.
- A short fixed check-in every two weeks (the same 20 items) to show real progress.

## 2. Japanese quality

Mostly natural, with a handful of lines that are off in register, meaning or realism. The line-by-line list is at the end.

## 3. Progression and magic

The slice teaches a flat set of nouns (floors, food, prices) and one grammar point (the te-form request), which is a good day one. The problem is the magic, which should be the grammar curriculum and currently isn't:
- **The first spell is semantically wrong.** 手伝って means "help me". Using it to make Rei hand over a folder teaches that 手伝う means "give". The spell should be 渡して ("hand it over") or 貸して ("lend it to me"). Keep 手伝って for a later task where help is actually what you need.
- **Spells should climb the grammar ladder.** Each new spell unlocks a new form, and casting requires producing that form:
  - te-request (〜て)
  - negative request (〜ないで)
  - "let's" (volitional 〜よう)
  - conditional (〜たら)
  - reasons (〜から)
  - potential (〜られる)
  - finally keigo requests (〜ていただけますか), which unlock with rank, matching the design's casual-first rule
- **Spells need a cost.** Magic is free right now, so there's no decision in using it. Give it a limited daily charge that refills overnight, with suspicion rising when it's used in front of people. The choice then becomes "solve this with words or with magic?", and the words option is the learning.

**12-week spine mapped to story arcs.** A probation period is the natural frame: new hires in Japan often have a 試用期間 (trial period) of about three months, which matches the 12-week goal exactly.

| Weeks | Arc | Grammar focus | Vocabulary and reading |
|---|---|---|---|
| 1–2 | Arrival: probation starts, Planning Office 7 is told it may be closed | です/だ, te-requests, questions, likes and wants (〜たい) | Floors, times, prices, office objects; a katakana block every day |
| 3–4 | The team: winning over Mio and Emi, the first team project | ない-form, 〜ないで, casual past | Tools, food, dorm life; first kanji sets (人, 木, 日...) |
| 5–6 | The rival: a competition with Rei's Sales team | 〜ている, より/ほうが, 〜から/ので | Numbers, business words, katakana loanwords |
| 7–8 | The festival: the company summer event; romance routes deepen | volitional 〜よう, 〜たら, 〜と思う | Events, feelings, invitations |
| 9–10 | Politics: factions, an executive notices you | potential form, 〜なきゃ, first contact with polite speech | Company hierarchy words |
| 11–12 | The review: the probation verdict and the team's fate | Basic keigo requests; native-speed listening | Review of everything, full-speed scenes |

Each week: about 60–80 new words, 3–4 grammar patterns, and one small katakana or kanji set, with daily reviews woven into chat messages and spells.

## 4. Narrative

**Hook.** The opening is pleasant but has no question in it. Nothing tells the player what they want or what can go wrong. A slice-of-life story still needs a want and a threat. Proposal (no mystery, no detective work):
- **The want:** pass probation and keep the job, which for a foreigner in Japan is also the visa.
- **The threat:** Planning Office 7 is on a list to be closed at the end of the quarter. Emi knows, and the team doesn't yet.
- **The engine:** office politics and relationships. Sales wants Planning 7's budget, Rei is Sales' best weapon, and every task is a small battle in that war.

**The secret.** The magic currently causes one raised eyebrow. The tension should build in steps: Rei feels something happened; Mio notices the speed; Ishibashi notices the pattern; Yuzuki wants a story about the "miracle new hire". Each person who gets close is also a romance route, so the closer you get, the more you risk. That's a better engine than a mystery, because it grows out of characters.

**Character arcs (sketch).**
- **Mio:** a brilliant programmer hiding in the basement after a burnout. Romance through co-op gaming nights. Her arc is choosing to be seen.
- **Emi:** protecting the team from closure while pretending not to care. Romance is slow and adult, and needs care because she's your boss; best kept mutual and late, after the review.
- **Rei:** rival, then grudging respect, then attraction. She's the most dangerous person to your secret, which makes her the most interesting route.
- **Aoi:** the chaotic intern who makes everything funny. A friend first, and possibly a comedic romance.
- **Yuzuki:** the company's public face, exhausted. She wants a story about you, and exposing you would make her career. A romance where trust is the whole game.

**Why come back on day two.** It doesn't end on a pull right now; the summary just closes the day. End each day with one small hook: a late chat message (Rei: 「明日、ちょっと話がある。」 "We need to talk tomorrow."), Emi staying late looking at a closure memo, or Mio's game invite.

**Tone.** Good. Restrained and dry, and Rei's 「なんで渡したんだろう」 is exactly the right register of humour. Keep the English narration sparse; it's already the right length.

## 5. The ten most important problems, ranked

1. **"Known" measures exposure, not memory.** Fix: an FSRS schedule per word; retrieval moments in play (ruby hidden on due words, a tap to reveal counts as a miss); "known" only after unaided success on at least three separate days.
2. **English is the easy path.** Fix: no English under choices by default (a tap to reveal counts as a look-up); English only in the word gloss; keep the T toggle but log its use.
3. **Romaji is a permanent crutch and inflates "known".** Fix: per-word reading stages (romaji, then kana, then none); the same for katakana words.
4. **Almost no production.** Fix: at key replies, build the sentence from word tiles (phone) or type it (desktop); spells cast by producing the form (stem plus ending), not by picking it.
5. **The first spell teaches the wrong meaning.** Fix: make it 渡して or 貸して; save 手伝って for a real help situation.
6. **No stakes or goal.** Fix: the 12-week probation (試用期間) plus the Planning 7 closure threat, introduced by Emi on day one; a hook at the end of every day.
7. **Magic has no cost.** Fix: a daily charge plus suspicion when observed; make "solve it with words" the attractive option.
8. **Katakana is untracked, though it's his weakest script.** Fix: tag every katakana word, give it the same reading stages, and add a katakana reading moment per day (signs, menus, chat).
9. **Listening checks are bypassable.** Fix: key listening lines stay audio-only until the player acts, with a replay button; count replays.
10. **Nothing works offline on the train yet.** Fix: a phone mode built from chat messages, overheard monorail audio and spell preparation, all spaced repetition in disguise, fully offline; free talk stays a desktop feature.

## Line-by-line Japanese notes

Everything not listed below is natural and correctly read.

| Where | Line | Problem | Suggestion |
|---|---|---|---|
| gate | 「止まれ。」 | Very harsh even for a gruff guard; security staff address employees with at least a softened command. | 「ちょっと、止まって。」, or keep 止まれ as a deliberate sign of his character. |
| gate | 「……新人か。企画室7？　ああ、地下のね。」 | 「〜のね」 sounds soft, even feminine, from a rough older man. | 「……新人か。企画室7？　ああ、地下の連中か。」 |
| gate | 「……若いな。」 (reaction to casual speech) | "Young" doesn't carry the intended "cheeky". | 「……なれなれしいな。」 (over-familiar); it's advanced, so mark it level 3 (kana only). |
| office | 「いいね、それで。」 | Understandable, but the order is slightly off for "that's fine". | 「うん、それでいいよ。」 |
| sales | 「お願い、今ほしい。」 | Blunt and odd; sounds like asking for an object for yourself. | 「お願い、今もらえない？」 |
| sales | 「わかった。午後に来る。」 | Fine, but "again" is natural here. | 「わかった。じゃあ、午後にまた来る。」 |
| sales / spell | 手伝って used to obtain documents | Meaning mismatch (see §3). | 渡して (わたして), with forms 渡す / 渡して / 渡した. |
| office2 | 「うそだ。」 | A bit stiff from Mio. | 「うそでしょ。」 |
| canteen | 「多いよ。はい、おつり。」 | Paying with a larger coin is normal; a cashier wouldn't call it "too much". | 「はい、二百円のおつり。」, and don't treat overpaying as a mistake. |
| canteen | Coins of 500, 600 and 700 yen | There are no 600 or 700 yen coins. Real money is 100 and 500 yen coins and 1,000 yen notes. | Give the player a wallet (1,000円札 and 100円玉, 500円玉) and have them hand over enough; Kaori gives change. Better practice for real life in Japan. |
| canteen | 「あまりしない。」 | Fine, but in casual speech 「あんまり」 is more common. | 「あんまりしない。」 |
| rooftop | 「だいじょうぶ。」 as a refusal | Correct and very common, but it confuses learners. That's worth a gloss note ("no thanks"). | Keep it, and add a gloss note. |
| glossary | 初日 lv3 | Common, easy word; kana-only hides a good kanji. | lv 2. |
| glossary | 日替わり定食 lv3 | Kana-only produces a long unreadable string (ひがわりていしょく). | Split into 日替わり (lv 3) and 定食 (lv 2), or show furigana over the whole compound. |
| glossary | サービス: "on the house" | Only in this context; the base meaning is "service" and in shops "a freebie". | "freebie, on the house (in shops)". |
| glossary | 気 "mind, spirit" | Fine; add the set phrase 気にするな as its own entry for the gloss. | Separate entry: 気にするな "don't worry about it". |
| script | Katakana words untagged: IDカード, ゲーム, リーダー, カレー, ラーメン, ロビー, サービス, ミオ/エミ/レイ | Weakest script, no support, no tracking. | Tag them all; reading stages apply. |
| message | 「おはよう！九時に地下二階の企画室7に来てね。」 | Natural. 企画室7 should read きかくしつナナ; make sure the voice agrees. | No change; check the audio. |
