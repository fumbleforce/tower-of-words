# Mio lines that drift from her voice

These are existing lines in game3d/story/ that don't match [voice.md](voice.md). Each row gives the file and node, the line number on 2026-10-09, the current text and a rewrite. The rewrites keep what each line does in the scene (the hint, the instruction, the flag it leads to). Lines not listed here are fine as they are. Nothing here has been applied yet.

The problems fall into four groups. Some later lines use British phrasing that Mio, who learned English from games and forums, doesn't use ("quite", "Mum", "playing up"). Some talk to Eric like a junior or a student, though he is 37 with years in the job and the engineer Mio asked for. Two day 1 lines need small changes for the new canon about her job. Some state a feeling outright. A few are tidy closers that sound written.

## Day 1

| Where | Now | Rewrite | Why |
|---|---|---|---|
| office.js `mio_opens` (233) | Okay, okay, I'm coming... Come in, but don't touch anything, okay? Especially the cables. | Okay, okay, I'm coming... Come in. You're the hardware person, so, okay, but ask me before you touch anything. They're weird in ways that aren't written down. | Eric is the experienced engineer she asked for. She still guards the machines she kept alive. |
| office.js `mio_b2` (370) | And the company won't buy new ones, ever. So now they pay you to babysit them with me. | And the company won't buy new ones, ever. I'm a programmer, actually, I just ended up knowing them. So now you're here, and maybe I can write code again. | He is the engineer B2 needed, not a babysitter beside her. That she asked for him stays hidden until a later reveal. |

## Day 2

| Where | Now | Rewrite | Why |
|---|---|---|---|
| day2/train.js `d2_platform` (23) | I told them it was the sensor, so, um... I'd quite like it to be the sensor. | I told them it was the sensor, so, um... it's the sensor. I hope. | "I'd quite like" is British and prim. |
| day2/office.js `d2_mio_work` (104) | I need to catch this before it restarts again. Can we talk at dinner? | Not now, I have to catch this before it restarts again. At dinner, maybe? | She is busy and slightly short, as when she is interrupted on day 1. |
| day2/office.js `d2_mio_job` (115) | They know when payroll rings me. I'd like to get it first today. | Payroll always rings me before I even know it's broken. Today I want to find it first. | "I'd like to" is too formal for her. |
| day2/izakaya.js `d2_after_work` (104) | I was going to do washing tonight. I can do it tomorrow also. | I was going to do washing tonight. Then I'll probably play until two, so... washing tomorrow also. | Kenji asks about games in the next line, and she says nothing about the thing she does every evening. |
| day2/izakaya.js `d2_mio_party` (179) | I wish you'd waited for me. | You tried it without me? ...Okay. Next time I want to see it. | She doesn't name feelings. She wants to see the magic work, so she says that. |
| day2/izakaya.js `d2_mio_party` (182) | Okay. You can tell me when you do. Pass the vegetables? | Mm. Okay, tell me when you know. ...Can you pass the vegetables? | Slightly tidy; this keeps the line and adds her "Mm". Minor. |

## Days 3 to 5

| Where | Now | Rewrite | Why |
|---|---|---|---|
| day4/east_coast.js `d4_mio_lunch` (7) | I brought a sandwich. Mum asked if I was eating properly, so I said there's tomato in it. | I brought a sandwich. My mother asked if I eat properly, so I said there's tomato in it. | She says "my mother" everywhere else. "Mum" is British. |
| day4/east_coast.js `d4_mio_lunch` (10) | I'm staying until I finish this. The wind keeps making it difficult. | I'm staying until I finish this, but the wind keeps taking the, um... the lettuce. | Flat and formal. This keeps the sandwich joke going. |
| day5/office.js `d5_mio` (48) and ongoing/office.js `ongoing_mio` (32) | I've nearly finished this. If the printer's playing up, Kenji is right beside it. | I'm almost done with this. If it's the printer, Kenji is right there, so... | "Playing up" is British. |
| day5/reveal.js `d5_delivery_prepare` (38) | Try Kenji's melon soda first. I'll help you say who it's for. | Do Kenji's melon soda first. He's been looking at that machine since six. | "I'll help you" is how a teacher talks to a student. The line still points at the soda. |
| day5/reveal.js `d5_first_reactions` (52) | He saw you weren't touching it. I know, Mori-san. I've seen it and I still don't understand. | He says you didn't touch anything. I know, Mori-san... I've seen it like five times now and I still don't get it. | Too tidy for her. |
| day5/reveal.js `d5_first_reactions` (53) | Can we keep this here for now? Please don't tell anyone upstairs. | Can this stay in B2? If upstairs hears about it, it goes on some list, and then it's my list. | Her reason is her list, as on the platform on day 1. |
| day5/reveal.js `d5_printer_lesson` (96) | He said {dashite}. It means "give it out". That sheet's finished, so it's safe to practise now. | He said {dashite}, like "give it out". The sheet's done already, so you can try it without printing forty more. | "It's safe to practise now" explains the game, not something she'd say. |
| day5/kotodama.js `launchedMio` (37) | {mc.name}, please put me down. | Okay, no. {mc.name}, put me down. | Too polite for someone who has just been lifted off the floor. |

## Ongoing days and Chat

| Where | Now | Rewrite | Why |
|---|---|---|---|
| ongoing/office.js `ongoing_mio_requests` (40) | The list keeps anything you haven't signed off. If someone's out, try them another time. You don't have to get it all done today. | Anything you haven't signed off stays on the list. If somebody's not there, just go another time. Some of mine are from March. | "You don't have to get it all done today" is how you reassure a junior, not a 37-year-old engineer. |
| ongoing/office.js `ongoing_mio_lunch` (46) | Please do. | Yeah, do that. Your phone also. | Prim. |
| ongoing/east_coast.js `ongoing_mio_coast` (22) | Hey. I thought I'd sit out here for a bit. | Ah, hi. I'm just sitting, it's not a work thing. | Bland, and she wouldn't be this easy about being found. |
| ongoing/east_coast.js `ongoing_mio_quiet` (31) | I hear people talking all morning. This is quite nice. | All morning somebody is talking at me. Out here it's just the water, so... | "Quite nice" is British. |
| ongoing/east_coast.js `ongoing_mio_quiet` (32) | I get enough people talking during the week. This is quite nice. | All week somebody is talking at me. Out here it's just the water, so... | As above. |
| conversations/mio.js `chat_mio_home_nice` | It is. I still have to carry it all on the train, though. | Mm, for one day it's nice. Then I carry it all home on the train like a delivery guy. | She doesn't agree that easily. |
| conversations/mio.js `chat_mio_lunch` | More than I used to. The bench by the water is quite good, when it's not windy. | More than before. The bench by the water is pretty good, when it's not windy. | "Quite good" is British. |
| conversations/mio.js `chat_mio_quiet` | Mm. You can hear the trains from there, but you don't have to be on one. | Mm. It's quiet, mostly. Sometimes a train goes past and that's it. | A quotable closer, not something she'd say. |
| conversations/mio.js `chat_mio_guess` | That was a good guess. Just ask if you're not sure, okay? | Mm, that's basically it. Not bad. | Teacherly. She talks to Eric as a colleague. |

## Age

Mio is 30 (cast.md, 2026-10-09). No line in game3d/story/ states or implies that she is in her mid-twenties. "Some of them are older than me" (train.js `sit`, 186) still holds, since the machines are from the early nineties. Two places outside the story files still describe her younger:

| Where | Now | Change |
|---|---|---|
| notes/character-backgrounds/mio.md, first sentence | Mio is twenty-five and spends most of her free time playing games. | Mio is thirty and spends most of her free time playing games. |
| game3d/story/VOICE-DIRECTION.md, `mio` row | Young woman, low and slightly husky... | Woman around thirty, low and slightly husky... (only if the voice clone is re-cast; the current clone can stay) |
