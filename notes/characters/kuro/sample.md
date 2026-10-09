# Kuro sample: the booking

Proposed scene, not in the game. Day 2, evening, at the reception counter in the head office lobby, as Eric heads home. It assumes Kuro taught Eric 休み (yasumi) that morning, which happens in d2_kuro_work. Kuro's Japanese is overheard (blurred), with known words clear. The meaning in brackets is for writers and is not shown. Stage directions in square brackets become `do:` steps.

```
[Kuro looks up from the visitor book and faces Eric. The camera closes on her.]

KURO (overheard, polite): お疲れさまです。
    (Good work today.)

[She doesn't bow. She points at his sleeve.]

KURO (overheard, curious): その袖、どうしたんですか。
    (What happened to your sleeve?)

ERIC (tired): It's dust from the machine room. I don't think it comes off.

[Kuro leans across the counter and brushes his sleeve twice without asking.]

KURO (low): Please hold still.

ERIC (casual): You don't have to do that.

KURO (overheard, amused): 落ちませんね。
    (It won't come off.)

[She lets go of his sleeve.]

KURO (teasing): Yesterday's shirt was better. Wear that one tomorrow.

ERIC (dry): I'll see what's clean.

KURO (overheard, curious): エリックさん、明日は{yasumi}？
    (Are you off tomorrow, Eric?)  [休み is clear]

ERIC (polite): {yasumi}? No, I'm working tomorrow.

[Kuro points at herself.]

KURO (overheard, casual): 私は{yasumi}です。
    (I'm off.)

[She tears a sticky note off the pad and writes on it. Close on the note: 18:00 プール]

KURO (overheard, polite): 明日の六時、プールで。お二人様ですね。
    (Tomorrow at six, at the pool. That's for two, yes?)  [プール is clear]

KURO (polite): Six o'clock. Two people. You and me.

[She sticks the note on the back of his company phone and holds it out to him.]

CHOICE
  > "Six is fine. I'll be there."
      KURO (overheard, warm): はい。
      KURO (teasing): Good. I don't like waiting.
      set kuro_pool_promised

  > "I'll come if I finish in time. I can't promise."
      [Kuro looks at him for a moment longer than she needs to.]
      KURO (overheard, amused): ふうん。
      KURO (low): Then finish early.
      [She doesn't take the note back.]
      set kuro_pool_maybe

[The desk phone rings. Kuro picks it up without looking away from Eric.]

KURO (overheard, polite): はい、本社受付です。
    (Hello, head office reception.)

[She lifts two fingers off the receiver toward him and turns to her screen.]
```

For later (proposed): with kuro_pool_promised, if Eric doesn't reach the pool on day 3 evening, her next morning greeting is example line 7 in [voice.md](voice.md). With kuro_pool_maybe, she doesn't mention it if he skips, and if he comes she says he finished early after all.
