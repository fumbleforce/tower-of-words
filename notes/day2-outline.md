# Day 2 outline

Revised after C-0366 and Claude's [cold read](day2-outline-coldread.md), work #189. The full authored set and remaining build work are in [the day-2 handoff](../game3d/story/day2/README.md).

## What the day is about

Eric has to sign off yesterday's fault. His answer reaches Emi, who has finally obtained money for parts. By evening, B2 has arranged a small welcome party for him. Optional exploration stays open around the job and party.

Follow the live [day-1 ending](../docs/game/stories/mio-notices.md) and [Emi's promise](../docs/game/stories/emi-budget.md). The older ending and flags in [day2-replace.md](day2-replace.md) are obsolete. Neither lunch branch is required.

## Scenes and places

### 1. The morning job: room 203 to Honsha platform (`dorms`, `train`)

A brief message from Mio reminds Eric about the station. His room computer offers an optional repair-inbox check and a message home before he leaves. He walks there before going to B2. Mio meets him if `lunch_mio || mio_warm >= 2`, matching yesterday's offer. In person or by message, she explains that Emi can order a sensor once he confirms the fault. His card works; passing the guard costs no dialogue step.

The carriage is empty between runs. Two required actions: run the door check, then submit the ticket. The check cycles the doors and shows the sensor passing. The ticket offers “Confirm the sensor fault; order a replacement” or “Sensor passes; no replacement needed.” The first preserves Mio's explanation and spends the parts money; the second contradicts it. Emi reads this choice in scene 2. Neither answer reveals Eric's power.

“Try saying it again” is optional after the check. 待って (*matte*, “wait”) holds the doors against the running motor; 動いて (*ugoite*, “work, move”) releases them, both prompted and already learned. The experiment finishes before ticket submission; the carriage stays stationary. Mio sees him try or decline. Alone, Eric is testing in a staffed station. The power's origin stays unexplained.

### 2. A proper chat: B2 (`office`)

Eric brings Emi his result. She orders the replacement he recommended, or keeps the money for another repair: one conditional response.

She asks what else he can maintain. He answers about the unfamiliar old equipment, keeping the magic secret. Kenji invites him for food after work. Emi has another upstairs meeting and tells them to go ahead. Sitting at Eric's desk advances to after work. Kenji goes ahead to help collect the food and tells Eric to meet him by the izakaya's blue curtain, with the goal pin marking it.

### 3. Welcome food: arcade and promenade (`shotengai`)

Kenji walks ahead from the meeting point; Eric can follow or explore, with no escort timer. Mori and Mio have the food ready at the party spot described in the [place plan](../docs/game/places.md#day-2-party-plan-not-built). Mori chose the sea over a noisy room. Mio came because he asked her, and she has brought some of her mother's pickles. These reasons emerge briefly while they settle, without arrival speeches.

Mori worries that the takeaway is a poor welcome. He opens the boxes for Eric to choose; Kenji is already reaching for one. Eric taking what he actually wants resolves Mori's uncertainty without a speech about belonging. Keep the exchange around the food and what each person does with it. Kenji models the Japanese below; Mio gets to eat. Mori's speech uses clear audio and English subtitles, not the muffled overheard mode.

Eric can talk about home or ask what they do after work. With `lunch_mori`, Mori can pick up their existing Lillehammer conversation; otherwise it needs its own introduction. With `lunch_mio`, Mio greets Eric more easily. These are short line variations. The party remains four people including Eric.

“Head home” on Eric's seat ends the gathering with a brief goodnight. Exploration stays open; the goal points to room 203. Entering his room saves and ends day 2 with the existing summary format, labelled for the completed day.

## Japanese: one new pattern

Teach **～たい, wanting to do something yourself**, through 食べたい (*tabetai*, “I want to eat”). Adapt only this part of the [wants prototype](../game3d/minigames/README.md). Kenji models it naturally as the boxes open and explains the meaning in his brief English. Eric taps the food he wants, then types *tabetai* once as he takes it: two player actions. English, romaji and replayable pronunciation stay visible. No new nouns, particles, timer or score gate. Kenji can also teach 飲みたい (*nomitai*, “I want to drink”) if Eric asks about a drink. This is optional practice of the same pattern.

Keep ～てほしい, giving/receiving and comparing for later: each adds another distinction. Say treatment: propose the existing `phrase` kind, with contextual replies from people and no magical effect on machines. Claude checks that routing before integration.

## Optional walk home and build handoff

After the party, Mori pauses at `shotengai_back_alley` with the packed leftovers. Eric can keep him company briefly. He appears here only after the party ends. No task or reward. The shop street, east lane and east coast join the established route as the day’s outing area, open before and after work. The coast lookout offers a quiet optional stop. The north road and pool approach are closed for resurfacing, keeping sports and the western districts for later. Returning to room 203 stays available.

Claude owns the access and staging work from cold-read points 15–19: morning dorm exit, return trips through the security room to the empty stationary carriage, day-2 schedules and save state, evening trip rules, the visible door test, party seats/camera and the room's end action. The sensor display and motor sound require approved assets. Test the reduced activity alone, then stage the party at phone size before scene integration.

Follow [VOICE.md](../game3d/story/VOICE.md) and [GUIDE](../GUIDE.md): simple actions get clear moments, with specific lines in character.
