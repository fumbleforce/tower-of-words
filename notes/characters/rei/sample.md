# Rei: sample scene

A voice sample, not wired into the game. Day 3 (Saturday), afternoon, at the tennis courts (`sports`), where the outline already has Rei practising serves alone with the ball basket beside her. Her label is still "Tennis player". About 1 to 2 minutes.

Words Eric may know by now and will hear sharp: すみません (day 1), もう一度 and 大丈夫 (day 2). ボール is cleared for the line as a loanword. Everything else she says in Japanese is blurred, and he gets it from her pointing and from what happens. The English meaning in brackets is for the reader only.

If this replaced the current day-3 lines, she would give her name here, so `d4_rei_intro` would be set at the end and day 4 would skip her introduction.

---

`[talk:rei]` A serve goes long and rolls under the bench. Rei turns and sees Eric.

**rei** (overheard, clear ボール): すみません、そのボール、取ってください。
  (Excuse me, get that ball for me.)
`[rei points at the ball under the bench]`

**eric:** This one?

**rei** (overheard): はい、それ。こっちに投げて。
  (Yes, that one. Throw it here.)
`[rei beckons. Eric throws it. It lands short and rolls the rest of the way to her.]`

**rei:** You throw like an IT man. You're the new one from B2, aren't you? My team was talking about you on Thursday.

**rei:** Go and stand over there, at the T, and tell me if these go in. I just want in or out from you.

**eric:** The what?

**rei:** The T. Where the lines meet, by your left foot. There. Don't move from there.
`[rei walks back to the baseline before he can answer]`

**rei** (overheard): もう一度。
  (Once more.)
`[serve: in]`

**eric:** In.

**rei:** I know, I saw it. That's two in out of eleven, so don't look so pleased.

`[serve: long]`

**eric:** That one was out. It was long.

**rei:** It was on the line. You were watching me instead of the ball. I saw your head move.

**rei:** I've changed my toss, and it's a better toss. Watch the ball this time, not me.

`[serve: long]`
> She lands badly on her right foot and shifts off it.

**choice**
- "Out. That's two long in a row." → `out`
- "Is your ankle all right?" → `ankle`
- "In. Just about." → `kind`

**out**

**eric:** Out. That's two long in a row.

**rei:** The wind's coming off the sea today. The toss is fine, and I'm not changing it the day before a match. Stay where you are, I've still got half a basket.

**ankle**

**eric:** Is your ankle all right?

**rei** (overheard): 大丈夫です。
  (I'm fine.)
`[rei puts her right foot down carefully and walks two steps without limping]`

**rei:** I didn't ask you to look at my ankle. Watch the line.

**kind**

**eric:** In. Just about.

**rei:** It was out and you know it. If you're going to stand there, call it properly.

**eric:** I don't remember agreeing to stand here.

**rei:** And yet there you are.

**all branches**

`[rei walks to the basket, slowly, and spends a moment choosing a ball]`

**rei:** That's enough for today. I'm Rei. I run one of the teams in Sales.

**rei:** The club plays here tomorrow evening. Come at six and bring shoes you can actually run in. I'll find you something to do.

`[if kind]` **rei:** And tomorrow you call the lines honestly.

`[rei turns back to the baseline. Set d3_rei_call = out / ankle / kind, and d4_rei_intro.]`

**rei** (overheard): もう一度。

---

## What the choice changes

The flag only changes Rei's first line on day 4.

- `out`: "I'm keeping the new toss, so you're calling my serves again tonight."
- `ankle`: She doesn't look at him. She tells Aoi where to stand first, then him.
- `kind`: "Are you going to call them honestly today?"
