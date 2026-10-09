# Kuro sample: effort first, then the booking

Proposed scenes, not in the game. Kuro's Japanese is overheard and blurred, with known words clear. The meaning in brackets is for writers and is not shown on screen. Stage directions in square brackets become `do:` steps.

## Words this needs

None of these exist in [words.md](../../../docs/game/words.md) yet. Each row is its own lesson, and all of them come before part 2.

| Word | Proposed id | Where it is taught first |
|---|---|---|
| 私 (watashi, I, me) | `watashi` | Day 2 morning at reception. In d2_kuro_work, Kuro says 明日は私、休みです and points at herself. |
| あなた (anata, you) | `anata` | Day 2 evening at reception, in part 1 below. |
| 〜時 (ji, o'clock) and 六 (roku, six), as one lesson | `ji`, `roku` | Day 3 at the plaza club board. The swimming club slip says 18時, and whoever is at the board reads it out as 六時. |
| 二人 (futari, two people) | `futari` | Day 3 lunch on the shotengai. The counter asks 何名様ですか and the person Eric is with answers 二人です, holding up two fingers. |

Words Eric already knows by day 2 and that come back here: `otsukare` (heard on day 1), `yasumi`, `daijoubu`. プール is a loanword he catches by ear, so it shows as `clear`.

## Part 1: day 2, evening, reception

Eric heads home through the head office lobby. Kuro is at the counter with the visitor book.

```
[Kuro looks up and faces Eric. The camera closes on her.]

KURO (overheard, polite): お疲れさまです。
    (Good work today.)

CHOICE
  > "Good evening. It's been a long day."          -> english
  > Say お疲れさまです back.             -> effort

english:
  [Kuro gives a small nod and looks back at the visitor book.]
  KURO (polite): Good evening.
  end

effort:
  ERIC (tired): お疲れさまです。
  [Kuro puts the pen down and smiles.]
  KURO (overheard, warm): はい、お疲れさまです。……その袖、どうしたんですか。
      (Yes, good work today. What happened to your sleeve?)
  [She leans over the counter and brushes the dust off his upper arm twice without asking.]
  ERIC (casual): Machine room dust. It doesn't come off.
  KURO (overheard, amused): 落ちませんね。
      (It won't come off.)
  [She points at herself.]
  KURO (overheard, casual): 私は、明日{yasumi}。
      (I'm off tomorrow.)
  [She points at him and waits.]
  KURO (slow): あなた。
  [Kuro taps his chest lightly with one finger.]
  KURO (overheard, curious): あなたは？
      (And you?)
  TYPE anata  (prompt: She's pointing at you. Try "you": anata.)
  ERIC (polite): あなた…… No. I'm working.
  [She laughs and shakes her head.]
  KURO (overheard, warm): 「あなた」じゃなくて、「私」。でも、上手。
      (Not "you", "me". But good.)
  [She goes back to the visitor book and lifts two fingers off the pen toward him as he leaves.]
  set kuro_tried_japanese
```

## Part 2: the booking

The first evening at reception once Eric knows `watashi`, `anata`, `ji`, `roku` and `futari`, so day 4 at the earliest, and only after part 1's effort branch.

```
[Kuro is at the counter. She points at the clock on the wall behind her.]

KURO (overheard, polite): 明日、{ji}……{roku}{ji}。
    (Tomorrow, at six.)  [taught as 六時; shows clear]

[She tears a sticky note off the pad and writes 18:00 プール, then holds up two fingers.]

KURO (overheard, polite): プールで。{futari}。……{watashi}と、{anata}。
    (At the pool. Two people. Me and you.)

[She points at herself, then at him, and holds the note out.]

CHOICE
  > Say 六時、大丈夫。 (Six is fine.)
      ERIC (polite): {roku}{ji}、{daijoubu}。
      [Kuro sticks the note on the back of his company phone and squeezes his arm once.]
      KURO (overheard, warm): はい。待ってますね。
          (Good. I'll be waiting.)
      set kuro_pool_six

  > Point at the seven on the clock. You're on B2 until half past six.
      [Eric points at the 7 on the clock and taps the note.]
      [Kuro looks at the clock, then at him, longer than she needs to.]
      KURO (overheard, amused): ふうん。七時？
          (Hm. Seven?)
      [She crosses out the 18 and writes 19, then sticks the note on his phone.]
      KURO (overheard, warm): じゃあ、七時。遅れないでくださいね。
          (Seven, then. Don't be late.)
      set kuro_pool_seven
```

For later (proposed): if Eric doesn't come at the agreed time, her next morning greeting is example line 7 in [voice.md](voice.md). If he took the seven o'clock branch and comes on time, she mentions at the pool that he picked the time and she came anyway.
