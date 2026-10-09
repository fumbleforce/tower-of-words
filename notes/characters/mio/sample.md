# Sample scene: Mio on the sea terrace

Day 3, Saturday afternoon, `east_coast`. The outline already puts Mio on the sea terrace with her laptop at this time. She is on the bench with the laptop on her knees and her headphones around her neck. Eric walks up and talks to her. This is a writing sample for her voice. It is not in game3d/ and would replace the short `d3_mio` lines if it were built.

New word: `ojama`, お邪魔します (ojama shimasu), "sorry to intrude", said when you enter someone's home or space. It would need a REQUESTS.md entry and clips. Known words used: `yasumi` (day 2, optional) and `mitai` (day 2, optional), each behind its `know_` flag.

Lines read `speaker (emo): text`. Stage directions are in square brackets.

## d3_mio_terrace

[mio closes the laptop as Eric arrives]

> She shuts the laptop before you can see the screen.

mio (dry): Ah. Hi. ...Did somebody send you, or you're just walking?

eric (casual): Just walking. I didn't know you'd be out here.

mio (casual): Mm. Nobody knows, that's kind of why I come here. B2 is empty on Saturday, but somebody always thinks, oh, Mio is there, I can ask her about the printer.

[if know_yasumi]
mio (dry): It's {yasumi}. So no printer.

eric (casual): Should I go?

mio (dry): No, it's fine. But, um... when you come into somebody's place, you say {ojama}. Like "sorry, I'm in your way."

mio (slow): {ojama}...

[type: ojama, prompt: "mio: It's my bench today. So... go on."]

mio (amused): Mm, okay. Now you can sit. You could sit anyway, it's not really my bench.

mio (tired): I've got, like, eleven percent. There's no socket out here, so I'm only staying until it dies.

[choice]
- "{mitai}. What were you working on?" (if know_mitai) → ask
- "What were you working on? You closed it pretty fast." (if !know_mitai) → ask
- Sit at the other end of the bench → quiet

## ask

mio (deadpan): Logs. From the timesheet thing. Very exciting. You want to read them?

eric (dry): I'll pass.

mio (dry): Mm, I thought so.

[mio puts her headphones on and opens the laptop, angled away from Eric]

[wait 2000]

[mio's laptop chimes. She looks at the corner of the screen]

mio (tired): Okay, that's ten. I'm going home before it dies on the stairs.

[set d3_mio_asked. mio stands and walks toward east_lane]

## quiet

[eric sits at the far end of the bench. wait 2000]

mio (casual): You know new people don't come here on Saturday, right? They go to the shotengai and buy towels and things.

eric (casual): I already have towels.

mio (amused): Okay, so you're ahead.

[wait 1500]

mio (low): I wasn't working, by the way. On the laptop. It's a game I'm making... only the fighting part works, the rest is grey squares where the pictures go.

eric (curious): What kind of game?

mio (casual): Tactics. Little units on a grid and everybody takes turns, and if you put your healer in front she dies, and it's your fault. I keep changing the archers, because every time I finish them they're too strong, and then I play it and get annoyed.

mio (dry): Anyway. You can't see it. Nobody's seen it.

eric (casual): Okay.

[mio's laptop chimes]

mio (tired): Ah, ten percent. That's it for today.

[mio stands]

mio (hesitant): If you come here next Saturday, um... message first. Then I can say yes.

[set d3_mio_game_told, remember mio: "She is making a tactics game and hasn't shown it to anyone." mio walks toward east_lane]
