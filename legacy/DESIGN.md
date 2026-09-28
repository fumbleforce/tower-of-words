# Amakawa: design notes

A visual-novel RPG set in a giant Japanese conglomerate that is a city of its own, on a man-made island in Tokyo Bay. You are a new foreign hire with a secret: kotodama, words that make things happen. Everyone else just thinks you are unusually productive. The game teaches conversational Japanese by making Japanese the thing you play with.

## The day
- **Morning:** briefing from Emi (team lead, Planning Office 7) sets the day's tasks.
- **Work:** tasks are solved by talking to people. Magic replaces the tedious parts.
- **Lunch and evening:** choose where to go and who to spend time with (canteen, rooftop garden, bar, dorm). Relationships grow here.
- **Night:** summary of what you understood, who likes you more, unlocked rewards.
- **Weekly:** performance review. Promotion opens districts and characters, later subordinates.

## Conversations
- Lines are voiced and heard first; text appears after (or earlier if you ask).
- Replies mix: picking a line (content and register), filling a word or verb form, acting on what was said, casting a spell, and free input at key moments.
- Misunderstanding changes what happens next instead of showing an error.
- Casual speech dominates the first half of the game. Politeness layers (keigo) arrive with rank.

## Japanese in every decision
Not only dialogue: most choices go through Japanese.
- Navigation: floor directories, signs and door plates (食堂, 地下二階, 会議室). Choosing where to go means reading.
- Time: clocks, calendars and messages use Japanese times and days (午前九時, 月曜日). Misread the meeting time and you are late.
- Directions are spoken: following 「エレベーターで三階に行って、右に曲がって」 is a listening test with a real outcome.
- Menus, vending machines, printer errors, emails and chat messages are small reading moments with consequences.

## Word display rule
- Words above your level: kana only.
- Words you are learning: kanji with the reading above.
- Words you know: kanji alone.

## Magic (secret)
- Spells are casual Japanese phrases (手伝って, 待って, 大丈夫だよ, 開けて). Casting means using the right phrase in the right form for the situation.
- A good cast persuades, speeds up work or opens a door; a bad one backfires, usually comically.
- Casting openly raises suspicion (Ishibashi at the gate, Luna at night reception notice things), which feeds the story.

## Dynamic layer (desktop)
- A local LLM (e.g. Qwen3 8B or Gemma 3 12B, quantized, via llama.cpp or Ollama on the RTX 3080) plays characters in free conversations. OpenRouter as fallback.
- Generated daily requests from coworkers, pitched at the player's level and built from words due for review.
- Characters keep schedules; who you meet depends on where and when you go.
- Characters remember what you said and did.
- The main story stays hand-written.

## Two modes
- **Phone (train, offline):** company chat messages, overheard monorail conversations (listening), preparing spells (spaced repetition in disguise).
- **Desktop (home):** full story days, typing, free conversations.

## Progression
- Company rank and access; relationships and romance with reward scenes (hidden in discreet mode, which is on by default on the phone).
- Japanese skills as stats (listening, casual speech, reading, vocabulary), measured by what you actually get right.

## Cast (current)
Mio (gamer coworker), Emi (team lead), Rei (sales rival), Aoi (intern), Yuzuki (PR spokeswoman), Saki (legal, candidate), Kaori (canteen chef), Goro (rooftop gardener, friend), Jun (bartender, friend), Ishibashi (gate guard). Main character: a Nordic new hire (draft).

## Art pipeline
Anima (Nova Anime AM) locally via ComfyUI; structured prompts per art/PROMPTS.md. Voices: MiniMax Speech and Qwen3 designed voices, cloned per character for consistency.

## Day 1 (first slice)
Monorail arrival, stopped at the gate by Ishibashi, basement office with Mio and Emi, first task, first spell, lunch at Kaori's canteen, evening at the bar with Jun.
