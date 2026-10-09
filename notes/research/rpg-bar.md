# The RPG bar: what makes Baldur's Gate 3 great to play, and where we stand

Jørgen asked (2026-10-09): "go research what makes a really, really good RPG on the level of baldurs gate 3, gameplay wise, and where we stand against that". This note answers that from developer talks, interviews and design write-ups, then scores our game against it from the code and the docs in docs/game/. The story is on hold while Jørgen decides what to do about the writing, so nothing here proposes rewriting it. Sources are at the end.

## What the great ones have in common

Larian's writers describe their job as running a table for a very unpredictable group. Swen Vincke said they "approached it as weird Dungeon Masters" who have to guess what players will try, and that they let you kill almost anyone because "you will want to kill someone". Their rule is to keep a working path when the player breaks the expected one. Shadowheart has at least 24 ways of handing over the artefact. The writing director's version is that the player's own story is the canonical story.

Disco Elysium makes conversation the place where the game is played. Its 24 skills speak up as voices in the hero's head, and its checks come in two kinds. A white check can be retried once you change something. A red check happens once, and the result stands. Kurvitz's rule is that failure never locks a player out of content. A failed check should instead make the scene more embarrassing, sadder or funnier, so you remember it.

BioWare's companions (Baldur's Gate 2, Dragon Age: Origins, Mass Effect) have their own wants, comment on what you do, banter with each other while you walk, and each get a personal quest. Mass Effect 2 was built around that idea: recruit a team, earn their loyalty, see who survives. The known weak spot is approval that can be bought. In Origins, a bottle or a necklace could patch up almost any offence, and critics say that made the relationships easy to sleepwalk through. Even Larian shipped its approval thresholds too low at launch.

Persona and Stardew show how a calendar works in a game like ours. In Persona, people are only around on some days and at some times, and every free evening spent on one person is an evening not spent on someone else. That small cost makes the choice matter. Hashino's stated aim for the bonds was that players understand each character's trouble and help with it. Stardew's heart events make up a small share of the game, but they are where its daily loops turn into a story.

Two smaller games matter most for a language game. In Chants of Sennaar, every word appears at least twice in two different situations, and the player is asked to guess and keep exploring instead of translating on the spot. In Heaven's Vault, the game never tells you whether your translation was right. People respond to what you decided the words meant, and over time you work out whether you were on the right track. Both make understanding the language the thing you play.

Making systems readable matters too. Baldur's Gate 3 shows conversation and lockpicking rolls large, with the bonuses that changed the odds, and pops up a note when a companion approves or disapproves. Disco Elysium shows your chance of success when you hover over an option. Players feel their choices land because the game tells them in the moment.

Finally, places tell stories when the player has to put them together. Harvey Smith and Matthias Worch's GDC talk on environmental storytelling is about letting the player work out "what happened here" from what is left behind. Smith adds that some things must be easy to miss, or finding them means nothing.

## Pillars, and our score

Scores run from 1 (missing) to 5 (BG3 level), judged on what is built and playable in game3d/ today. "Planned" in the docs doesn't count.

| # | Pillar | What great looks like | Us | Where we stand |
|---|---|---|---|---|
| 1 | Choices that come back | What you did shows up later in what people say and do. Most outcomes stay playable, so the story bends instead of breaking (Larian's n+1). | 2 | Day 1 has three real forks: the gate (magic or making friends with Hamada), lunch (Mio, Mori or alone) and day 2's door report (new sensor or keep the old). They change later lines, the evening and what day 2 and 3 start from, and people remember things in the People panel. Beyond those, most choices change a line or two. |
| 2 | More than one way through | A problem can be solved by talking, by your power, by hand or by going around it. The world reacts to what you actually tried. | 2 | Kotodama against a physical or social route exists at the gate and in some repair jobs. The Say menu lets you say any known word to anything, with 62 authored word-and-target reactions and a stock reply for the rest. Most tickets still have one solution, and Jørgen called the day-2 sensor job "a long walk to an automatic check". |
| 3 | Talking is the gameplay | Conversation is where the stakes are. You can fail, and failing goes somewhere interesting. Your skills have opinions. | 2 | This is our most original part. Speech you can't follow is blurred and muffled and clears as you learn words. You type or say words. Old remarks become readable later, and a heard remark plus a learned word opens a new topic in either order. There is no real check, though. Typing a word always succeeds in the end, and nothing depends on how well you spoke. The engine already records whether your last word to someone was in the register they expect, but no line in the story reacts to it. |
| 4 | Companions with their own lives | People want things that clash with what you want. They react to you in the moment, have a personal arc that you can help with, and talk to each other. | 2 | Ten named people have bonds, memories, likes, gifts and step-2 and step-3 scenes. Ambient two-person moments exist. Steps 4 and 5 aren't built. Points never go down, so nobody is ever put off by what Eric does, and you never see a reaction as it happens. Nobody comes along with you. |
| 5 | Encounters with a hook | Every big encounter has a fresh idea at its core and readable stakes, and gives you several tools. | 2 | Repair tickets are our encounters. The best ones (the copier, the booking terminal, the day-5 delivery) use the literal-minded machines well. Most play out as a fixed sequence with one right command. There are no stakes, by Jørgen's choice (no fail, no deadline), so what makes a job interesting has to come from what you can try. |
| 6 | Exploring pays | Off-path finds tell you something you didn't know, can be missed, and feed back into the rest of the game. | 3 | The places are big and full, with listed nooks, photos, twelve flavour objects, the notice board and crowds that follow the clock. The finds are mostly keepsakes. None of them opens a topic, teaches a word or changes how someone treats you. |
| 7 | A build you choose | You shape who your character is and what they're good at, and that changes how problems open up to you. | 1 | Words are the closest thing we have to a build: practice dots, "by heart", seven commands. But everyone learns the same words in the same order, and money has little to buy beyond food and drinks. Nothing is a choice about what kind of Eric to be. |
| 8 | Time, pacing and the week | Free time is limited and has to be shared out, so spending it says something. A weekly rhythm brings you back. | 3 | Periods, schedules, free weekend days, waiting at the clock, four weekly clubs, Sleep and a repeating week after day 5 are all built. Waiting and walking cost nothing and nothing is missed, so choosing is rarely a real choice yet. |
| 9 | Reading the systems | You can see why something happened: odds, reactions, what changed. | 3 | Goal line, Say button that lights up when a known word fits, clear kotodama effects, the ticket app, the People panel. Bond changes happen out of sight, and the People panel deliberately hides what the next step needs. |
| 10 | Reasons to play again | Different origins, companions and routes produce a noticeably different game. | 2 | Carina as a second protagonist, lunch routes and day histories exist. For a learning game this matters least: one long playthrough is better for remembering words than replays. |

The pattern is the same one notes/gameplay.md found in the VN version: the game has a lot of systems, and few of them feed each other. Finds don't open conversations. Bonds don't open ways to solve a job. How Eric speaks doesn't change how people treat him. Money has little to buy. BG3's systems are fun because each one touches the others.

## The gaps that matter most for a Japanese-learning RPG

Combat is the core of BG3. For us, that core is understanding people and being understood. So the gaps that count most are pillars 3, 7 and 1, in that order.

Talking is where we can be better than a normal RPG. A misunderstanding is a real event in a language game, and it is exactly the "failure makes the scene funnier" moment Disco Elysium builds on purpose. The kotodama already work this way with machines: they take the word literally, and that is where the comedy comes from. People don't work that way yet. Speaking too casually to Mori, using the wrong word to Rei or catching only half of what Kuro said currently changes nothing. Until it does, the Japanese is something you learn alongside the game.

The words should be the build. Disco Elysium's skills and Persona's social stats are both "what you've invested in decides what you can do and what you notice". Our version is natural: the words you know by heart, and the register you have practised with each person, decide which replies, which topics and which ways of solving a job are open to you. Most of the parts exist already (practice counts, register comparison, knowledge-gated topics). They aren't presented to the player as a build, and they rarely open anything.

Choices need to come back where the player can see them. Knowing that Mio remembers the lunch bag is nice. Hearing her bring it up when it matters is what makes a game feel like it was paying attention, which is how Hades and BG3 get praised.

Pillars 5 and 8 follow from these. A repair job gets a hook when your words and your bonds give you more than one way in. The week gets a pull once a free evening can actually be spent on a person who will remember it.

## Five moves, in order

Each move is small enough to start this week. Each reuses what exists, adds no new system to a day that already has one, and keeps Jørgen's rules: no fail states, no timers, no grinding, story beats started by the player. Anything that needs new lines waits for the story hold to lift and goes to Codex as usual. The mechanism can be built and tested first on lines that already exist.

1. Make people react to how Eric speaks. The `register_<person>` flag is set on every Say and nothing reads it. Wire it into the ordinary Talk entries of the ten named people as a short in-world reaction (a look, a correction, a pleased "oh, polite"). Add a small one-line notice when it changes a bond ("Mori noticed you said it his way."), in the People panel's existing memory list. This is the cheapest step towards pillars 3, 4 and 9, and it turns register into something the player cares about. It needs one reaction line per person per case, so the lines are the part that waits for the writers.

2. One spoken check per repair job, with failure that goes somewhere. Take one existing ticket (the day-4 desk fan T-0006 is small and self-contained) and give it two or three things the player can say, each with a visible literal result. A wrong or half-right command works like a Disco Elysium white check: the fan does something funny and literal, someone comments, and you can try again once you know a better word. Keep the physical fix as the fallback. No new words, no new system. If it plays well, it becomes the pattern for later tickets.

3. Let finds feed the conversation graph. Give two or three of the existing flavour objects or photos a heard-remark record of the kind the conversation layer already has (`heard-record.js`), so a found note plus a known word opens a question to the person it belongs to. That follows Chants of Sennaar's "every word twice in two situations" and Smith's "what happened here", and it makes exploring pay into pillars 3 and 4. The topic rows and routing exist, so this is data and a few authored replies.

4. Show the words as a build. In the Words panel, show next to each word what it has opened so far ("opened: Mori's trip question, the booking terminal") and, once known by heart, let it light up as an extra reply option in ordinary Talk where a line uses it. That is Disco Elysium's skills speaking up, done with vocabulary. It makes learning a word feel like gaining an ability and gives the player a reason to pick which words to practise.

5. Give the free week one real choice of time. Persona's lesson is that a slot matters when it could have gone elsewhere. Without adding deadlines or fail states, let a person's invitation name its evening on the notice board or in a message, and let the step-2 and step-3 scenes that already exist be offered on the same evening as a club session, so the player picks one and the other waits for a later week. Progression.md already allows an invitation to say when it ends, and bond scenes already wait when skipped. It needs scheduling data and no new system.

Moves 1 to 3 are the core. Move 4 is presentation on top of them. Move 5 only pays off once 1 and 4 make time with a person feel worth something.

## Sources

- PC Gamer, Jody Macgregor, 23 June 2024, on the BAFTA "An Evening with Baldur's Gate 3" (Vincke, Adam Smith, Chrystal Ding): https://malaysia.news.yahoo.com/larian-gave-baldurs-gate-3-022539159.html
- PC Gamer, Joshua Wolens, 27 March 2024, Vincke on n+1 and the 24 ways to get the artefact: https://tech.yahoo.com/baldurs-gate-3-least-24-160125347.html
- Game Developer, Bryant Francis, 9 August 2023, what works and doesn't in BG3's use of D&D systems (dice presentation, camp): https://www.gamedeveloper.com/design/what-works-and-doesn-t-work-about-baldur-s-gate-3-s-use-of-d-d-systems
- RPG Site interview with Larian combat designer Matt Holland (per-encounter difficulty, environmental "spice"): https://www.rpgsite.net/interview/9494-baldurs-gate-iii-interview-discussing-combat-and-gameplay-with-larian-studios-designer-matt-holland
- Larian combat designer job listing ("each with a novel, memorable challenge at its core"): https://jobs.lever.co/larian/1c88e8eb-2717-46ee-9133-b645a93eeaef
- GosuGamers, Vincke on approval thresholds shipped too low: https://www.gosugamers.net/news/69288-baldurs-gate-3s-thirsty-companions-were-a-bug-not-a-feature
- BG3 wiki, how approval works: https://bg3.wiki/wiki/Approval
- Disco Elysium dev blog, "Choose Your Own Misadventure, Part 2" (Kurvitz, translated from Canard PC), on failure never locking content: https://discoelysium.com/devblog/2019/07/23/choose-your-own-misadventure-part-2
- GDC Vault, "Disco Elysium: Meaningless Choices and Impractical Advice": https://gdcvault.com/play/1027160/contactUs
- GameSpot, the Thought Cabinet nearly sinking the project: https://gamespot.com/articles/how-the-feature-that-almost-sunk-disco-elysium-was/1100-6472676/
- Disco Elysium wiki, white and red checks: https://discoelysium.wiki.gg/wiki/Skills
- GDC Vault, Josh Sawyer, "Do (Say) The Right Thing: Choice Architecture, Player Expression, and Narrative Design in Fallout: New Vegas" (2012): https://gdcvault.com/play/1016166/Do-(Say)-The-Right-Thing
- GameSpot, Mass Effect 2 developers on the loyalty missions and the suicide mission: https://gamespot.com/articles/mass-effect-2-dev-talks-cut-characters-and-making-the-suicide-mission/1100-6487001/
- Shamus Young, Mass Effect retrospective on the suicide mission: https://www.shamusyoung.com/twentysidedtale/?p=30036
- GameBanshee, Dragon Age preview (party banter as walking conversation): https://gamebanshee.com/8pu
- Kotaku, BioWare developers on companions (James Ohlen, Mike Laidlaw): https://kotaku.com/bioware-developers-discuss-ideas-and-share-concept-art-5900794
- Destructoid, criticism of Dragon Age: Origins gift approval: https://www.destructoid.com/?p=76473
- Game Informer, Katsura Hashino on Persona 5's characters: https://gameinformer.com/b/features/archive/2015/12/09/persona-5-story-and-characters-interview-katsura-hashino
- Destructoid, Persona 5 aims for human relations a step above social links: https://destructoid.com/persona-5-aims-for-human-relations-a-step-above-social-links
- Mechanics of Magic, Stardew loops and arcs (heart events as a small share of play): https://mechanicsofmagic.com/2022/05/03/sketchnote-interaction-loops-arcs/
- PCGamesN on Stardew's map design: https://www.pcgamesn.com/stardew-valley/stardew-valley-map-design
- Kotaku, Eric Barone on writing the villagers: https://kotaku.com/the-past-present-and-future-of-stardew-valley-1766238624
- Game Developer, Chants of Sennaar's language design: https://www.gamedeveloper.com/design/immersing-players-in-the-culture-of-a-people-with-language-puzzler-chants-of-sennaar
- Emily Short on Heaven's Vault: https://emshort.blog/2019/07/23/heavens-vault-inkle/
- PCWorld, Heaven's Vault won't tell you if your translations are wrong: https://www.pcworld.com/article/406127/inkles-space-archaeologist-adventure-wont-tell-you-if-your-lost-language-translations-are-wrong.html
- GDC Vault, Harvey Smith and Matthias Worch, "What Happened Here? Environmental Storytelling" (2010): https://gdcvault.com/play/1012647/What-Happened-Here-Environmental
- Nieman Storyboard, Harvey Smith on environmental storytelling: https://niemanstoryboard.org/2011/01/14/harvey-smith-on-environmental-storytelling-and-embedding-narrative/
- Screenhub, Greg Kasavin on Hades' narrative: https://www.screenhub.com.au/news-article/features/digital/jini-maxwell/hades-greg-kasavin-breaks-down-supergiants-unique-approach-to-narrative-262459

Our side: docs/game/ (systems, progression, language-progression, words, controls-and-ui, setting), game3d/story/milestones/README.md, notes/gameplay.md, notes/day1-choice-review-codex.md, notes/playtests/cold-2026-09-30.md, and the code in game3d/js/sim.js (register flag), js/bonds/, js/narrative/heard-record.js, and the `say:` triggers across game3d/story/.
