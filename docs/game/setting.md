# Setting

Amakawa is a company island reached by monorail; everyone lives on it, so nobody commutes. Eric is a Norwegian IT support engineer on B2 keeping the company's ancient systems running, and under kotodama the island's old machines obey spoken Japanese commands, but only from him. Also here: what kind of game this is (game first, learning light) and what the story never does. The people are in [cast.md](cast.md), the places in [places.md](places.md), the storylines in [stories/](stories/).

## The island

- Amakawa is a company island. Everyone in the game lives on it permanently, and the company city has everything: dorms, a canteen, shops, a bar, a university. There is no commute. Nobody takes a train to work, nobody rides "every morning", and a day never starts with a commute.
- The island is reached by monorail from the mainland, across the bay. It stops at Honsha station (本社, head office), next to the head office building. People who ride it are coming back from the mainland: Mio from a night at her mother's, Mr. Hamada from wherever he sleeps through.
- Places on the island (Jørgen, island-places review, 2026-09-29), beyond head office and the station: a covered shotengai with one combined konbini, 100-yen shop and drugstore, plus a bakery; after-hours food, "just ramen and izakaya"; a sento and coin laundry by the dorms; one company clinic; a small company shrine on a headland; the company history hall and the founder's statue; a section of old buildings (disused factory, old power plant, early-90s server hall), "not too many, but a section on the island"; a karaoke box and a small game centre; a viewpoint park looking back at the mainland; a cherry-tree path and a summer matsuri stage; a harbour with the ferry and supply dock; the pool with its shower building, the onsen with separate men's and women's baths, and the beach. The sports field also hosts undokai and morning radio exercises. New-employee training is "probably part of one of the office building[s]". Utilities stay "mostly hidden in basements and out of the way, but still there. dont want a big utility building taking up space". Housing is "somewhat uniform, but with some more luxurious residences", with no named tiers. No post office or police box, and no footbath.
- Everyone on the island works for Amakawa and speaks Japanese. Mio: "Nobody speaks English. Even at the supermarket."
- The company is called Amakawa for now (Jørgen). An "everything company" name was considered; Zenbu Sangyō, Yorozu and Chigusa were rejected.

## The company and its machines

- Amakawa never replaces anything. The island's systems were installed in the nineties and are kept running; three companies looked at the B2 copier and all said to buy a new one.
- IT support sits on B2, the second basement of head office, with a small team ([cast.md](cast.md)). IT repair requests are why Eric ends up all over the island (to build: only B2 and the lobby exist so far).

## Eric's job

Eric is a Western IT support engineer from Norway, on a support contract to help keep the ancient systems running (Jørgen, 2026-09-28). It is not an upgrade or replacement job, which "sounds like the game becomes more lame over time". Day 1 is his first day, and the monorail ride is his arrival: he is moving to the island. He barely speaks Japanese.

## Kotodama

- The island's old machines answer to spoken commands, but only when Eric says them. Nobody knows why, Eric included, and nobody investigates. The origin stays a mystery.
- A command is a Japanese request form (待って, 動いて), taught by someone during a conversation. The first use of each is shown on screen and heard: the machine shimmers, the lights dip and hum, a low tone plays ([systems.md](systems.md), Kotodama effects). A machine takes the word literally.
- Other people saying the same word get nothing. Mori has said 動いて to the copier for thirty years.
- Eric keeps it quiet at first; the people who see it do too. How far that goes is the [`mio-notices`](stories/mio-notices.md) storyline.
- The range grows as he learns more ways to talk to the machines, and he comes back to the same machines with more to try (Jørgen, 2026-09-28).

## What kind of game

- Make it a game (Jørgen, 2026-09-28): "Let's make a game already." Three places in a row (the monorail, the lobby gate, the office), built in three.js in game3d/ ([places.md](places.md)).
- A 3D RPG first, learning second (Jørgen, 2026-09-28): "tone down the very hard focus on learning, the first priority is making a fun 3d rpg with compelling stories, characters and interaction." Commands come here and there in conversation and open up new things to do. Easy, common verbs first. English is always shown; there are no recall tests and no gates that need you to remember a word. When to fade the English is decided later. This overrides GUIDE's older Difficulty and Learning rules where they conflict.
- Casual Japanese comes first; polite forms and keigo come later (with rank, in the original plan). Day 1's greetings are polite set phrases, and people answer in their own register ([cast.md](cast.md)).
- A social sim to scale for an open world where long cohesive narratives aren't possible (Jørgen, 2026-09-28): a day clock, people with schedules and relationships with each other, bonds, likes and small gifts ([systems.md](systems.md)). No generic repeated menus, gift spam or grinding.
- One stable, full day that is fun comes before anything else. Procedural content is parked in TODO.md until then.
- Romance with several women in the cast, Emi included. Rewards for good play can include fan service up to implied nudity (steam, water, hair, angles; nothing explicit), always hidden in discreet mode on the phone and never on public pages. All characters are adults. (Private content rules: GUIDE and island/PRIVATE.md.)
- From the original premise (the VN version, 2026-09-25): a British and Nordic cast at a giant Japanese conglomerate that is a city of its own; coworkers only see someone amazingly productive; progression means rising in the company. Japanese belongs in most decisions (navigation, time, menus, money, messages, directions), not only in dialogue. How much of this carries into game3d after day 1 isn't decided.
- Free conversations with a local LLM playing a character, on desktop (Orion 26B-A4B via llama.cpp, port 8190; to build: planned in the VN version, not in game3d).

## What the story never does

- No shinigami, spirits or yokai; no mysteries or detective work; no ancient history; no far-fetched premises (the VR tower and the golems were rejected). Everyday life alone is too mundane: contemporary fantasy is the frame.
- No quirky stock tropes (GUIDE, Originality). People have their own day going on and don't exist to serve Eric's story.
