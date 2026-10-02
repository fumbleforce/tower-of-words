# Day 2 outline

Proposal for Claude's cold read; no dialogue or implementation yet. Request: C-0357, work #185.

## What the day is about

Eric has to sign off the fault he caused yesterday. By evening, his colleagues have arranged a small welcome party by the sea. One service call, then an evening with B2; the walk to the party opens up the island.

Start in room 203. Follow the live [day-1 ending](../docs/game/stories/mio-notices.md) and [Emi's promise](../docs/game/stories/emi-budget.md). [day2-replace.md](day2-replace.md) is useful for avoiding repeats, but its Rei message, copy errand and older flags are obsolete. Neither lunch branch is required.

## Japanese: saying what Eric wants

One new pattern: **～たい, wanting to do something yourself**. Teach 食べたい (*tabetai*, “I want to eat”) as a useful chunk, with one short English explanation of the ending.

Adapt the self-want part of the [wants prototype](../game3d/minigames/README.md) to the party food. First Eric chooses in English what he would like. Mori offers it; Mio supplies the Japanese, with English and romaji still visible. One guided turn lets Eric say *tabetai* while pointing to it. Further practice is optional. No new nouns, particles, timer or score gate; this is a casual statement of appetite, not a polite restaurant order.

Keep ～てほしい for a later day. Giving/receiving adds viewpoint changes and several verbs; comparing adds new descriptions and sentence frames. Save those activities for later. The station reuses known words with prompts visible.

## Scenes and places

### 1. A proper chat — B2 office (`office`)

Eric walks from the dorm to work. Emi asks what he can actually maintain; the train-door ticket is already on his list. Let him answer confidently or admit that yesterday surprised him too. She needs a diagnosis before she orders a replacement sensor. Kenji mentions the welcome food after work, with a clear meeting place at the arcade's east mouth. End the scene with the station as the immediate goal.

### 2. Checking the sensor — Honsha platform (`train`, platform state)

A stationary, empty carriage is available for the maintenance check. The doors cycle normally and the sensor test passes. With Eric's prompted 待って (*matte*, “wait”), they halt halfway even though the beam is clear. Show stopped doors, a clear sensor and a motor still trying. Prompted 開けて (*akete*, “open”) opens them again; the carriage remains stationary throughout.

The player chooses the ticket wording: “Couldn't reproduce it with the controls” or “Works normally; keep an eye on it.” Both are honest, both avoid buying a useless sensor, and the job ends here. Mio accompanies him only on the route where she offered yesterday; otherwise she handles the result by phone. End with the practical result; the power’s origin stays unexplained.

### 3. Welcome food — arcade to seafront (`shotengai`)

After work, Kenji meets Eric at the stated entrance and walks with him down to the promenade. Use the shop signs and their English to make this a place he can find again, with no compulsory stops.

Mori and Mio already have the food at the promenade benches. Four people including Eric; the party is ready when he arrives. Mori has bought a mixture because he doesn't know what Eric eats. This creates the small *tabetai* activity above. Keep the conversation around choosing and sharing the food: Mori quietly making room, Kenji eating before everyone has chosen, Mio finally away from the server room. Eric can talk about home or ask what they do here after work. One short exchange follows his choice.

The player ends the evening when ready and walks back to room 203.

## Exploration and build scope

One optional encounter at the existing `shotengai_back_alley` nook: before the party, Mori is resting beside his shopping bag on the way to the benches. Eric can pause for company; neither needs to fill the silence. No task or reward. If skipped, Mori is simply at the party.

Use the existing platform, B2, arcade and promenade; shop interiors stay outside this outline. Build needs: the door test, food props and the reduced wants activity, tested alone before integration. Check four-person staging at phone size. Follow [VOICE.md](../game3d/story/VOICE.md); Mori speaks Japanese, with English carrying the player through it.

Checked against [GUIDE](../GUIDE.md): learning pace, setting, voices and story/screen agreement; and the contest feedback on too many steps and people. Cold reader: does the service call feel repetitive? Does the party give these people enough room beyond teaching? Cut before adding another scene.
