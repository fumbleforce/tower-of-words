# Gameplay review: day-1 slice

## 1. Diagnosis

**Where it is a game already**
- `sales`, the spell. You have a goal (get the folder before eleven), an obstacle (Rei says 午後), and a verb only you have. Choosing 手伝って over 待って is a real decision, and a wrong form produces a story beat (Rei freezes, suspicion rises) instead of a red X. This is the core of the whole game, and it happens once.
- `elevator1` and `elevator2`. Reading 地下二階 to get somewhere is comprehension used as movement, and the clock makes mistakes cost something. The 三階 detour where Rei catches you lost is the right idea: failure that creates a scene.
- `canteen`, menu and pay. Kaori says the price out loud and you pay it. Listening is the verb, and the result shows up straight away.

**Where it is still clicking through lines**
- `monorail`: the announcement and the chat message are read, then one trivial choice (右 or 左). Nothing you learn here is used later except 地下二階, and the task line on the HUD hands you that anyway. The HUD removes the reason to read the message.
- `gate`: the ID choice has one right answer and no cost for the wrong ones. The register choice with Ishibashi is good, but its effect (ishibashi -1) never comes back.
- `office`: seven lines in a row with two reply choices whose only consequence is a hidden number. Emi's task is spoken and then written on the HUD, so listening is optional.
- `office2`: Mio's "how did you do it?" is the best dramatic question of the day, and it resolves in one line.
- `bar`: a three-turn free talk with no goal beyond "tell Jun about your day". Nothing is at stake, and nothing it produces feeds back into the game.
- Across the day: relationship points, suspicion and time exist but never change what you can do. The summary is the first place you see them. There is no pressure you can feel while playing.

The pattern: every system is present, but none of them feeds another. Time never forces a choice, suspicion never closes a door, relationships never open one, and the words you learn never come back as tools.

## 2. Core loop

### One day
1. **Morning chat (phone, 3 to 4 messages).** Requests arrive as short casual messages from different people, each with a place, a time and a thing: 「十一時までに三階で黒田さんの書類。」 The phone does NOT rewrite them as tasks. You pin the ones you understood; a mistranslated pin sends you to the wrong place.
2. **Plan with the clock.** The day has about six time blocks (午前九時 to 午後六時). Each request, lunch spot and conversation costs a block or part of one. You can't do everything, which is the Persona pressure that makes choices mean something.
3. **Execute through Japanese.** Movement by floor panel and signs, people by conversation, obstacles by kotodama. Each request has a normal route (talk, persuade, wait for the afternoon) and a magic shortcut that is faster but raises suspicion.
4. **Evening: one person.** Choose who to spend the evening with. This is where relationship scenes and rewards live, and where free LLM conversation happens.
5. **Night report.** Emi's one-line verdict on your work, who noticed what, words that levelled up, and tomorrow's first message as a hook.

### Across days
- **A week is a chapter.** Friday is a performance review scored on requests done on time, how people describe you, and whether anyone is close to your secret. Promotion unlocks a floor, a spell and a register (polite speech with section chiefs from week three).
- **Suspicion is a slow clock with a face.** Ishibashi keeps notes, Mio keeps asking, and Luna at night reception has seen the lights in the basement. At thresholds, a scene triggers where someone confronts you, and your Japanese in that conversation decides the outcome.
- **Words are equipment.** A word you have understood several times without looking it up becomes usable in spells and in free replies. Looked-up words return in tomorrow's messages. The review targets the right words without ever calling itself review.
- **Replay value** comes from routes: who you spent evenings with, whether you used magic openly, and which requests you dropped.

## 3. Kotodama

**Grammar grows with the learner.** Each form is a school of magic, unlocked by promotion:
| Tier | Form | Effect | Example |
|---|---|---|---|
| 1 | te-form request | make someone do a small thing | 手伝って, 開けて, 待って |
| 1 | plain statement | make something true for a moment | 大丈夫だ (calms someone) |
| 2 | negative request | stop something | 言わないで, 見ないで |
| 2 | volitional | pull someone along with you | 行こう, 食べよう |
| 3 | ～たら conditional | a delayed trigger | 会議が始まったら、止まって |
| 4 | keigo request | works on superiors only | お待ちください |

**Costs and risks**
- **Voice.** Each cast spends breath; you get three per day, refilled by sleep or a good evening.
- **Witnesses.** Casting with others present adds suspicion by the number of people watching. The UI shows who is in the room.
- **Precision.** The right verb in the wrong form fizzles. The wrong verb works literally, which is where comedy and story come from: 待って freezes Rei in place, 見ないで makes her close her eyes in the middle of a meeting.
- **Combos.** Two short casts in a row can chain (待って, then 手伝って) at double the suspicion.

**Misuse creates story.** A backfire gets a callback. Rei remembers "the moment my body stopped", and on day three she asks you about it.

## 4. Japanese in every decision

- **The HUD stops translating.** The task line shows only what you pinned from the message, in the Japanese you pinned it in. If you pin the wrong floor, you go to the wrong floor.
- **The clock is only in Japanese** (午前十時半). A digital time appears after you have read it correctly three times.
- **Floor panels and door plates** use the display rule. Rooms you have not found yet show only their kanji.
- **Menus change daily.** 日替わり定食 is a different dish each day, described in one short line on the board.
- **Messages carry the plot.** Some arrive while you are elsewhere; missing or misreading one has a cost ("Where were you? I wrote 二時.").
- **Directions are spoken once.** 「エレベーターで三階。右に曲がって、奥の部屋。」 A replay costs a little time.
- **Signs as choices.** Where you can go at lunch or in the evening is a set of signs, not an English list.

## 5. Dynamic LLM layer

**Generate:**
- Morning requests from a template: person, place, time, object, and two to four target words from the review queue. The output is JSON validated against known floors, people and times.
- Reactions to what the player typed in free replies, in the character's voice.
- Gossip lines for the canteen and the bar that reference yesterday's events ("Kuroda handed a folder to a new guy for no reason, did you hear?").
- A short evening conversation with a goal the story sets ("find out why Jun left Osaka").

**Keep scripted:** the main story beats, spell outcomes, confrontation scenes, reward scenes, and every line that introduces a new word for the first time.

**Guardrails:**
- A system prompt per character: voice, speech style, what they know, and what they must not reveal.
- Level control: allow only words at or below the player's level plus the day's targets; reject and regenerate lines that use unknown kanji-heavy words.
- A strict JSON schema: `{ja, kana, en, mood, correction, rel_delta, flags}`. Validate it and fall back to scripted lines on failure.
- A hard cap of about 2 sentences per reply, and no English in `ja`.
- Characters never teach grammar. Corrections appear as a side note, not in dialogue.

## 6. Next iteration: 14 changes, in priority order

1. **Remove the HUD translation of tasks (small).** Show the raw message on the phone; the player pins the parts they understood by tapping them (the floor, the time, the name). The task line is built from the pins.
2. **Emi's task by voice only (small).** Drop the task step in `office`. After her line, ask the player to pin the details from memory: three quick picks (floor, person, time) drawn from similar options. Wrong picks carry through to the elevator.
3. **Make the deadline real (small).** Show the time in Japanese at every scene change. Arriving at `sales` after 十一時 makes Rei say 「もう遅いよ。会議、始まった。」 and removes the spell option.
4. **Witnesses on the spell (small).** In `sales`, put a second salesperson in the background. The spell choice shows 「見ている人：一人」 and costs one extra suspicion. Add a "wait until she leaves" option that costs 15 minutes.
5. **Use the wrong spell for story (small).** After a 待って backfire, set a flag. On the way out, Rei says 「さっきの、何だったの？」, with three replies that shift suspicion.
6. **Pay off Mio's question (medium).** In `office2`, if you answered ひみつ, add a short follow-up at lunch: 「ねえ、さっきの。本当のこと、教えて。」 Lying costs relationship, telling a half-truth costs suspicion, and changing the subject needs a casual phrase you have to type.
7. **Give Ishibashi a callback (small).** If you were casual with him at the gate, he stops you again on the way out in the evening: 「また君か。カード。」 Polite players walk straight past.
8. **One spell, two uses (medium).** Add a second obstacle that needs 待って: the elevator door closing on you with the folder (「待って！」 holds it open). This teaches that spells are ordinary words.
9. **Breath limit (small).** Three casts per day, shown as three small marks on the phone. The fizzle costs one.
10. **Lunch as a choice with a cost (small).** The canteen gives a Mio scene; the rooftop gives Goro plus a new spell hint, 大丈夫だよ (calming), which Goro says to his tomatoes. You can't do both.
11. **The bar talk with a goal (medium).** Jun asks one question the player must answer in Japanese: 「今日、一番大変だったのは何？」. The LLM checks whether the answer names a real event from the day, using the flags, and Jun reacts to that event specifically.
12. **Night report with consequences (medium).** Emi's verdict line depends on docs, time and lateness. Show tomorrow's first message as a teaser: 「明日、九時半に会議室。黒田さんも来るって。」
13. **Words as keys (medium).** A word met three times without a look-up is marked in the phone as 「使える」 (usable). Show one usable word turning into a new spell option at the end of the day.
14. **A short cold open (small).** Start on the platform with Emi's voice message playing before the title card. The first thing the player does is listen.

Rough effort: small is under an hour in the current engine; medium is two to four hours, mostly script and one new step type.
