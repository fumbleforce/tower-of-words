# Staging note: expression faces for Mori, Kenji and Hamada (#688, Review expressions-men-1)

Brief (#688, from reviews mori-2, kenji-2 and hamada-2): new expression faces for the three new base portraits, the same set they had. The old faces were repaints of the old bases and left the game with them, so the story falls back to neutral, and Hamada looks awake and smiling while he is asleep on the train. Stay away from over-the-top anime reactions (GUIDE: he dislikes them).

The one thing each recipe does: repaint only the face of the approved base (face polygon below the hairline, inside the jaw line, feathered), with the scene words of that face. Everything outside the polygon is the installed neutral's own pixels and alpha. Scene words are the ones Jørgen picked in cast-faces-1 (the old faces), except Hamada's sleepy, which now has his eyes closed (the brief: dozing on the train). Denoise as the picked old faces: 0.7 for Mori and Hamada, 0.8 for Kenji. Seeds 1 to 4.

Camera and shot for every face, fixed by the base: head and shoulders, eye level, slight three-quarter turn, looking at the viewer unless the face says otherwise, plain light grey background, soft even studio light. Only the brows, eyes, nose, mouth and cheeks move. Physical sense: both eyes match in size and direction, irises stay dark brown, no second outline at the polygon edge, hair and jaw outline unchanged, adult faces of the base's age, no props.

## Mori (58), base m3-s2

- smile. Story: greets Eric (`おはよう…森と申します`), "やっぱり、だめですね" when the copier fails again, thanks him when it is fixed, tells him about Lillehammer, thanks him for the coffee (game3d/story/office.js). The base already has a mild smile, so this one is warmer and clearer at dialogue size: a kind closed-mouth smile, cheeks lifted, smile lines at the eyes. Not a grin, no teeth.
- flustered. Story: no line sets it yet; the `sweat` emote picks it (portraits.js EMOTE_FACE). The moment it fits is the cast note's: offered help after insisting he can manage. Mild: brows raised, a small awkward smile, a faint sweat drop. No blush (it was excluded on his old faces), no open mouth.

## Kenji (21), base n2-s2

- grin. Story: "あ！新しい人！", his joke about being senpai, "Melon soda! Thank you" (office.js). The base already has an open smile with teeth, so the grin is bigger: a wide happy grin showing his teeth, cheeks pushed up, bright open eyes at the viewer. No laughing with eyes shut.
- sheepish. Story: "冗談です、冗談です。 Joke. Sorry.", "Ah... chair. Your chair. Sorry.", "English... very little. Sorry.", the register line `えっ、僕に、ですか？`. A nervous apologetic smile, worried brows tilted up in the middle, a small sweat drop, looking at the viewer. No blush (Jørgen picked the no-blush takes last time), no tears.

## Hamada (54), base h2-s1

- sleepy. Story: asleep on the morning train; the `zzz` emote picks this face, and "すみません……あと五分。" is said in his sleep (game3d/story/train.js). Eyes fully closed, brows relaxed, a slack relaxed mouth, slightly open, no smile (the base smirks, which is what looks wrong now).
- panicked. Story: wakes as the doors close, "あっ！すみません、すみません！" (train.js); runs late into the gate, jams it, "すみません、通ります！", "あけて..." (gate.js). Alarmed, not screaming: eyes wide open with normal pupils, brows raised and drawn together, mouth open mid-word, a sweat drop at the temple. No smile.
