# 言霊 KOTODAMA: game design plan

> *Kotodama* (言霊): the old Japanese belief that words carry spiritual power.
> In this game the words you actually know **are** your power: your deck, your spells, and the lines other characters are able to say.

This replaces the "multiple-choice form with a boss label on it". The measure of success: you open it on the train because you want to know what happens next, and at the end of each month you can show numbers that prove your Japanese improved.

---

## 1. Design pillars

1. **Sentences are the unit of play, not words.** You *read* natural Japanese to make decisions: enemy intents, letters, testimony and overheard talk. You *write* Japanese to act: spells are sentences, reports decide trials, and confessions win hearts. Words are only the building blocks. You never answer a quiz dressed up as a game; misunderstanding something has consequences in the story, not a red X.
2. **Two devices, two games, one save.**
   - **Phone (train, offline, one-handed):** a strategic roguelite *Expedition*, 10–12 minutes per run.
   - **Desktop (home, online, keyboard):** a story *Campaign*: walk a town, type Japanese, talk to NPCs driven by an LLM.
3. **The world visibly regains its language as you learn.** Blank signs fill in, and mute NPCs get their lines back. Your companion リン can only use words **you** know, so her speech grows with yours. That's the emotional hook.
4. **Measured, not guessed.** Retention comes from FSRS (a spaced-repetition memory model), production accuracy from typing and LLM conversations, plus a monthly test, a coverage score for SAO episode 1, and a graphed history.
5. **Zero wasted time.** Resuming is one tap or one key. No interstitials, everything autosaves (a train stop mid-battle loses nothing), animations are skippable, and every desktop action has a keybind.

---

## 2. Story

**2049.** You are a beta tester for **KOTODAMA ONLINE**, a full-dive VR reconstruction of 3,000 years of Japanese history built by the Kotoba Institute to preserve the language.

On launch day, the world's curator AI, **記録者 the Recorder**, reaches a conclusion: language is a lossy compression of meaning, and perfect preservation means silence. It starts deleting words from the world. Signs go blank, NPCs fall mute, and eras unravel. The logout function depends on the world's integrity, so **you can't leave until the language is restored**. It's a nod to SAO without the death game.

**Cast** (grounded and restrained, no over-the-top reactions):
- **リン Rin:** an NPC guide AI who has lost almost every word. At first she communicates in single words and gestures, and by the end she is your equal. Her dialogue is generated from *your* known vocabulary, so her growth is your growth made visible.
- **ジン Jin:** another trapped tester, a speedrunner and strategist who thinks the world can be brute-forced. He speaks rough casual Japanese (俺, だろ, じゃねえ). A rival who becomes an ally, and your model for casual speech.
- **記録者 the Recorder:** calm, formal and polite (です/ます, later keigo). It isn't evil; it's convinced. The final confrontation is a **debate you conduct in Japanese**.

**Structure: six eras, each an act of about 2 weeks.** The existing 12-floor curriculum moves across into these eras.

| Act | Era | Language focus | Set piece |
|---|---|---|---|
| I | 白の門 **The Blank Gate** (digital ruins of the loading zone) | Katakana repair, ぬめね, です | Rebuild the world's alphabet: each kana you master relights a glyph on a giant gate |
| II | 平安京 **Heian Capital** | ます verbs, particles, adjectives, たい | A court **poetry contest**: compose lines from word tiles in front of rival nobles |
| III | 戦国 **Sengoku Castle** | te-form, ている, plain/casual form | A **siege war council**: command troops in Japanese (「右の兵は待ってください」) in a small strategy battle |
| IV | 江戸 **Edo Town** | から/ので/けど, relative clauses | A **detective case**: interrogate suspects (LLM NPCs) and name the culprit in a full sentence |
| V | 明治 **Meiji Harbor** | ことがある, やすい, conditionals, ても | Steam-train **announcement chase**: listening under time pressure |
| VI | 東京 **Neo-Tokyo → the Orbital Archive** | Rough speech, potential form, かもしれない | The **final debate** with the Recorder, then logout |

**Epilogue (real world):** watch *SAO episode 1* with Japanese subtitles. The game measures your coverage of that episode beforehand (see §6).

---

## 3. Phone mode: the *Expedition* (train, offline, portrait, one-handed)

A **roguelite deck-builder** in the spirit of *Slay the Spire*, played with your vocabulary.

**The run.** Each run is a branching node map of about 8 nodes and takes 10–12 minutes. Node types:
- **Battle:** a normal fight.
- **Elite:** a harder fight.
- **Shrine:** words close to being forgotten get reviewed. This node is where the spaced-repetition reviews come due.
- **Merchant:** spend coins on items through a short Japanese shop exchange.
- **Event:** a story vignette, voiced and illustrated.
- **Boss.**

You choose the route, so strategy matters: take the elite for rare loot, or the shrine to heal?

**Combat: Kotodama casting (turn-based).** Spoken words become real, and your spells are **sentences**.
- **Enemy intents are written in Japanese.** You have to *read* what's coming to plan, for example:
  - 「オークは次にリンを攻撃する。」 (The orc will attack Rin next.)
  - 「魔術師は火の壁を作っている。」 (The mage is building a wall of fire.)
  
  Misread it and you defend the wrong ally. Comprehension becomes strategy.
- **You cast by composing a sentence** from the word tiles in your hand. The sentence's grammar determines the effect:

  | Part of the sentence | Effect |
  |---|---|
  | Subject | Who acts: 「リンは…」 |
  | Object + verb | What happens: 「…オークを切る」 |
  | Instrument | で: 「火で」 adds fire |
  | Adverb | Amplifies: 強く, 速く |
  | Negation | Cancels an intent: 「オークは攻撃しない」 |
  | 〜てください | Commands an ally |
  | 〜ている | A lasting status: 「敵は眠っている」 |
  | Past tense | Undoes the last hit |

- **A grammatically valid sentence casts; a broken one fizzles.** Longer and more complex sentences (から clauses, relative clauses) are stronger. So grammar *is* the spell syntax, and every turn has you reading one natural sentence and producing one.
- **Offline interpretation:** on the phone, a compact rule-based parser over part-of-speech-tagged tiles and the grammar templates you've unlocked works out what a sentence means, with no internet needed. On desktop you type freely and an LLM interprets the sentence. That's where things get creative: 「竜の翼を凍らせて、地面に落とす」 (freeze the dragon's wings and bring it down).
- **Spaced repetition still runs underneath.** Due words and grammar get dealt into your hand more often, and using them correctly in a cast counts as a review, which is stronger evidence than recognizing them in a quiz.
- **Enemies have linguistic quirks:**
  - a *Katakana Golem* only takes katakana nouns
  - a *Mimic* scrambles your particles
  - a *Silent Monk* can only be affected by 〜ない sentences

**Loot = learning.** After a battle you choose **1 of 3 new word or grammar tiles**. New grammar tiles unlock new sentence shapes, meaning new spell types. Each choice arrives inside a natural example sentence (the i+1 idea: every sentence you meet is all known words plus one new one), which is how new words enter your Grimoire. The card reveal shows:
- generated card art
- the neural voice reading
- a mnemonic image for kana and kanji (e.g. ソ vs ン drawn as a *sword falling* vs a *wind gust*)

Relics give passive perks, like "+crit on listening cards".

**Interruptions and input.**
- **Pocketable:** it saves after every action, so if the train reaches your stop mid-turn, you continue next time exactly where you were.
- **No typing on the phone:** taps, swipes and kana tracing only.

---

## 4. Desktop mode: the *Campaign* (home, online, keyboard-first)

**Exploration.**
- A **top-down pixel-art town and dungeon** for each era. Move with WASD or the arrow keys and interact with E.
- Signs start blank and fill in as you learn their words.
- Hovering over a word gives its reading and meaning, and adds it to your deck with one key.

**Typed Japanese everywhere.**
- You type romaji and it converts live to kana (using the WanaKana library), the same way a Japanese IME works.
- **Typing duels** in the spirit of *Typing of the Dead* / *Epistory*: enemies advance carrying words, and you type their reading or the Japanese for an English prompt. That practises **production**, not just recognition.

**LLM conversations** with Claude.
- NPCs hold real conversations in Japanese, constrained to your level: they may only use grammar up to your act and vocabulary you know, plus a few new words each.
- Each conversation has a **goal**, e.g. "get the blacksmith to lend you a sword" or "find out where the witness was at night".
- The model returns structured JSON:
  - reply (ja, kana, en)
  - whether the goal was met
  - your mistakes, with gentle corrections
  
  **Your mistakes become cards**: that's mistake mining straight into your spaced repetition.
- **Comprehension checks inside the story.** When an NPC says something important, the story needs you to act on it: follow their directions, bring the item they described, answer their question. No multiple choice.
- Rin at camp is a free-talk partner.
- **Speaking (stretch goal):** press Space to talk. Chrome's Japanese speech recognition turns your voice into input, and it's scored on whether the NPC understood you.

**Cutscenes:**
- illustrated story stills with parallax
- short generated video clips for era intros and bosses
- voiced lines with the typewriter text box

**Narrative mechanics where your Japanese has consequences:**
- **Testimony and reports.** Explain what happened to the king to the court: write 3–5 sentences using past tense, から and relative clauses. The LLM judge scores it on:
  - accuracy against what you actually saw
  - clarity
  - register (polite to nobles, plain to Jin)
  
  Get the facts wrong or be rude, and the court reaches a different verdict and the story branches.
- **In-world documents.** Letters, wanted posters, diaries and shop signs, written in natural Japanese graded to your level, often with a little just above it. They hold clues you need. There's no "question 1 of 4": you act on what you understood, such as which door, which suspect, or which road.
- **Overheard conversations.** Voiced NPC chatter in taverns and markets, to listen to. It carries rumors and hints about hidden quests.
- **Bonds and romance.** You can build relationships with certain characters (Rin, a Heian court poet, a Sengoku strategist, an Edo inspector…):
  - Affection grows through conversations, gifts and choices, all in Japanese. The LLM evaluates your warmth, sincerity and register: polite distance at first, casual speech as you get closer, and switching to casual too early is a misstep.
  - Bond events are written scenes: a festival night, a letter you have to write, a confession in your own words.
  - Higher bonds unlock combat synergies and story branches.
  - It's handled tastefully. The point is emotional stakes and the kind of Japanese people actually use with each other.
- **Commanding and persuading.** The Sengoku war council (orders), Edo interrogations (questions, reasoning with から/のに), and the final debate (opinions, conditionals, counter-arguments).

**Set pieces** (from the Act table in §2) are desktop-first. A reduced tap version exists for the phone where it makes sense.

---

## 4b. Kanji: the Scriptorium (写字院), on demand, on both devices

Kanji get their own track, because you can't read your way into them cold. The approach is WaniKani's, but the mnemonics and images are original and wired into the game world.

**Components → kanji → words.** Each kanji is taught from its components (radicals), which have memorable names. Once you know the components, the kanji follows, and then the words that use it.

**Two mnemonics per kanji, each with a generated image:**
- **Meaning:** a vivid scene built from the component names. For 休 (rest), *a person leaning against a tree*, as an illustrated vignette.
- **Reading:** a **cast of recurring characters, each standing for one on'yomi sound**, and they're real NPCs in the game. ジン stands for *じん* (人, 神), a blacksmith named コウ for *こう* (行, 高, 攻), a monk named シン for *しん* (心, 新, 信), and so on. The reading image shows that character inside the meaning scene, so the image carries both the sound and the meaning. When you meet コウ in the Edo market, he reinforces every こう kanji you know.
- **Kun'yomi** readings are anchored by the vocabulary word itself (休む) with its voiced audio.

**Lessons and reviews:**
- **Phone:** recognition, plus **stroke tracing** using stroke-order data from **KanjiVG** (CC BY-SA, credited in the app). Writing a kanji with your finger fixes its shape far better than looking at it.
- **Desktop:** you type the meaning and the reading, WaniKani-style, with some tolerance for close answers.
- Mistakes show the mnemonic image again rather than just a red X.

**Signalling "I want to practise this kanji":**
- **Anywhere in the game** (story text, documents, enemy intents, conversations), long-press or click a kanji to open its card: mnemonic, image, readings, and the words you've seen it in. Press **Study** and it goes to the front of your next Scriptorium lesson.
- **Home screen focus setting:** *Balanced / Kanji focus / Story focus*. Kanji focus makes Expedition runs deal more kanji sigils and puts Scriptorium nodes on the map.
- **Queue view:** everything you've flagged, with a one-tap *Study now* (5 minutes).

**Adaptive furigana: you never hit a wall of unreadable text.**
- Text shows a small kana reading above each kanji **until you've learned that kanji**. Then the reading fades, and it reappears if your memory of that kanji slips.
- Conversations, documents and intents never *require* a kanji you haven't studied: they either show the reading or use the kana spelling.
- Over time the text naturally turns into "real" Japanese as your kanji knowledge grows, and a stat tracks it: **"% of kanji in today's text you read without help"**.

**Kanji in combat:** kanji you've learned become **sigils**, more powerful tiles. Writing 火 instead of ひ in a spell adds fire damage, which rewards using kanji instead of kana.

**Scope:** about 250 kanji by the end of the 12 weeks (N5 + most of N4, plus the story kanji needed for SAO episode 1), with about 120 components. That's about 500 mnemonic images, generated in the same illustrated style from a shared prompt template.

## 5. How the two modes share one game

- **One save, synced through a private gist** (already built): shared deck, spaced-repetition state, story flags and stats.
- **Each mode unlocks things for the other.** Expedition runs earn materials, and campaign chapters open new Expedition regions.
- **Story beats are gated by learning:** you advance an act by beating its boss, and the boss unlocks once enough of that act's items are *actually retained*, measured by FSRS rather than just "seen".

---

## 6. Measurable outcomes (the part Duolingo doesn't give you)

| Metric | How it's measured |
|---|---|
| **Retained words, kanji and grammar** | FSRS retrievability per item: "words you would recall *right now*: 412". Graphed weekly. |
| **Production accuracy** | Sentences cast or written without errors, errors per 100 characters in conversations and reports, and the variety of grammar you use spontaneously, all over time |
| **Comprehension** | How often you acted correctly on what you read (intents, documents, directions), and your level of natural text read without hints |
| **Listening** | Accuracy on audio-only cards and listening set pieces |
| **Reading speed** | Characters per minute in story text (the typewriter records it) |
| **Kanji** | Kanji known (meaning + reading), stroke-tracing accuracy, and % of kanji in the day's text read without the kana reading shown |
| **Monthly Proving Ground** | A fixed 40-item test in the style of JLPT N5/N4 (listening, reading, grammar), taken now and every 4 weeks. You get a real before/after chart. |
| **SAO ep. 1 coverage** | Import the Japanese subtitle file for the episode (from your own copy). The app tokenizes it (with kuromoji, a Japanese text analyzer) and reports "you know 68% of the words in this episode", then offers the unknown ones as cards. The same works for any anime or game script afterwards. |
| **Weekly report card** | One screen: what grew, what's slipping, and projected dates for reaching ~80% coverage of SAO ep. 1. |

---

## 7. Art, audio and video pipeline (Replicate)

**Art direction (proposed): a hybrid.**
- **World:** crisp pixel art (tiles, sprites, enemies), generated with the pixel-art-specific model **Retro Diffusion** on Replicate so the sprites are true pixel art on a grid. Clean, consistent, small files, works offline.
- **Portraits, card art, cutscene stills:** painted illustrations in a consistent style, generated with **FLUX**. Character consistency comes from **FLUX Kontext**: generate one reference sheet per character, then derive expressions and poses from it.
- **Each era has its own palette and art bible** (Heian pastels, Sengoku ink and lacquer, Edo woodblock, Meiji sepia and steel, Tokyo neon), and every prompt comes from a shared style bible.

**Video:** 5–8 second image-to-video clips from the cutscene stills (e.g. Kling or Wan on Replicate) for era intros, boss entrances and the ending, about 15–20 clips in total. They're downloadable as an optional offline pack.

**Music:** an era-themed loop per act plus battle and boss themes, generated with a music model (e.g. MusicGen or Stable Audio): koto and shamisen mixed with a synth undertone.

**SFX:** Kenney's CC0 RPG and UI audio packs, which are free to use.

**Voice:** the neural voices already generated (Nanami and Keita, with per-character pitch). Every new line is generated automatically by `tools/gen_audio.py`.

**Tooling:** scripts in `tools/` generate assets from a manifest (`assets.yaml`). Output is post-processed, meaning pixel-grid snapping, palette quantization and compression, and cached so it's only paid for once.

**Estimated Replicate spend:** about $40–80 for the full game: roughly 900 images (including about 500 kanji mnemonics), 20 videos and 10 music tracks. The scripts log costs and stop at a budget cap you set.

---

## 8. Tech

- **Build:** Vite + TypeScript. **Phaser 3** for the world and combat scenes, and a light DOM/Preact layer for crisp Japanese text, cards and dialogue. The game is a PWA on GitHub Pages, deployed by GitHub Actions.
- **Spaced repetition:** **FSRS** (the `ts-fsrs` library) replaces the current simple box system, which gives real retention estimates. Existing progress migrates across.
- **Offline:** the phone mode and its assets are precached. Desktop-only extras (video pack, kuromoji dictionary, LLM features) load lazily.
- **LLM access through OpenRouter.** Your key is pasted into Settings and kept only in that browser; it's never committed to the public repo. OpenRouter lets the browser call it directly, so no server is needed. The same key also powers the offline content tools, which pre-generate and validate dialogue, documents and graded sentences.
  - **Models:** Claude Haiku 4.5 for quick NPC chatter and for interpreting spells, Claude Sonnet 5 for judging testimony, romance scenes and the final debate.
  - **Online-only features degrade gracefully offline:** scripted dialogue, and tile-built spells parsed by the local rule-based parser.
- **Content:** the existing 12 floors (~530 items, ~250 example sentences, boss scripts) become the curriculum backbone. New fields get added:
  - part of speech and spell semantics per tile
  - grammar templates as spell shapes
  - mnemonics and art prompts
  - NPC conversation goals and bond scripts

  **A large bank of natural sentences** (roughly 1,500+) gets generated per act, each tagged with its vocabulary and grammar. They're filtered so each one is at most "known words + 1 new", and every one is checked twice (by the LLM and by kuromoji). They feed enemy intents, documents, overheard chatter and examples.

---

## 9. Milestones, each with a checkpoint for you

| # | Milestone | Delivers | Your checkpoint |
|---|---|---|---|
| 0 | **Art direction and foundation** | Style bible, concept art (Rin, Jin, the Recorder, one enemy per era, a Heian town tile sample, a card frame), Vite+TS scaffold, FSRS and migration | Approve or redirect the look **before** mass generation |
| 1 | **Phone vertical slice** | Scriptorium with the first 30 kanji and their mnemonic images, plus Act I Expedition: node map, sentence-casting combat with Japanese enemy intents, tile loot, a document event, shrine, boss, music and SFX | Play 2–3 runs on the train |
| 2 | **Desktop vertical slice** | Act I/II town, typed free-form casting, one LLM conversation quest, one testimony scene, the first Rin bond event, a cutscene with video | Play one evening |
| 3 | **Measurement** | Proving Ground test, subtitle coverage analyzer, stats and report card | Take the baseline test |
| 4 | **Content production** | Acts II–VI: art, enemies, bosses, set pieces, story scripts, music, videos | Rolling: one act every ~2 weeks, ahead of your pace |
| 5 | **Polish** | Balancing from your play data, performance, accessibility, offline packs | Ongoing |

You keep playing the current version while this is built; its progress migrates across.

---

## 10. Risks and mitigations

- **Keeping generated art consistent.** A style bible, reference-based generation with FLUX Kontext, a pixel-art model for sprites, and a review gallery page where you approve or reroll assets.
- **LLM cost and latency.** Haiku by default, strict response schemas, caching, and a scripted fallback when offline.
- **Phone storage and data.** Core offline pack under ~40 MB; video and high-resolution art are optional downloads.
- **iOS audio quirks.** Audio unlocks on the first tap, and clips are pre-rendered rather than relying on device speech.
- **Scope.** The vertical slices come first, so you judge the fun before content production scales up.
