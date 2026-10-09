# Emi: sample scene

A voice sample, not wired into the game. Day 3 (Saturday), lunch, on the sea terrace (`east_coast`), where the outline already has Emi eating lunch. She sits on a terrace bench with half a sandwich, her work phone face up on her knee and a gym bag beside her. It would replace the short `d3_emi_lunch` lines. About a minute and a half.

Emi speaks English with Eric. Her one phone call is in Japanese and overheard. Eric knows 大丈夫 from day 2 and hears it sharp, and the rest is blurred. If Eric hasn't met her yet, her introduction from `emiHello` plays first, as now. The English in brackets is for the reader only.

---

`[talk:emi]` Emi looks up from her sandwich.

**emi:** Oh, hello. You've found my lunch spot. Nobody from upstairs walks this far on a Saturday, so I can usually finish a sandwich here.

`[emi's phone buzzes on her knee. She reads it and turns it face down]`

**emi:** That'll be about Monday. It can be about Monday on Monday.

**eric:** You're working on a Saturday?

**emi:** Not officially. I came in to sign one thing, and there was another thing under it, and you can see how the morning went.

**choice**
- "Have they asked about the ten years yet?" → `ten`
- "What's the gym bag for?" → `pool`

**ten**

**eric:** Have they asked about the ten years yet?

**emi:** Twice. They've stopped asking whether we can do it, which is the good news. Now they'd like it written down by the end of the month, so I'm going to need an afternoon of yours, I'm afraid.

**eric:** Ten years of what, exactly?

**emi:** That's the bit I was hoping you'd tell me. Not today, though. Monday, with coffee, and you can tell me which machine is going to die first.

**pool**

**eric:** What's the gym bag for?

**emi:** Swimming. The outdoor pool shuts for the winter after tonight, and I'd like one last length before it does.

**emi:** I'm also bringing the club's spare keys. I said yes to that before anyone had finished asking.

**all branches**

`[emi's phone buzzes again and keeps buzzing. She turns it over]`

**emi:** Sorry, it's Mori. I'd better take this, he never rings.

**emi** (overheard): はい、エミです。……あ、森さん。{daijoubu}です、どうぞ。
  (Yes, it's Emi. ...Oh, Mori-san. It's fine, go ahead.)
`[emi listens, pushes her glasses up and laughs once]`

**emi** (overheard): ありがとうございます。じゃあ、月曜日に。
  (Thank you. See you on Monday, then.)

**emi:** He popped down to B2 for his umbrella and found my desk lamp on, so he's switched it off. He also found the folder I spent all morning looking for. It was on my chair.

**emi:** Right. Six o'clock at the pool, if you fancy it. You don't have to swim. Most people sit on the edge and tell the rest of us it looks cold.

`[Set d3_emi_terrace = ten / pool. emi finishes her sandwich and puts the phone in the gym bag, at the bottom.]`

---

## What the choice changes

The flag changes her first line at the pool that evening.

- `ten`: "I've told nobody about the end of the month yet, so you didn't hear it from me. Are you getting in?"
- `pool`: She holds up the spare keys. "Delivered. That's me finished with keys for the year."
