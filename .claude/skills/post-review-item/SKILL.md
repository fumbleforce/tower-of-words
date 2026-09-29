---
name: post-review-item
description: Posts a choice or a set of candidates to Jørgen's Review queue in the bible (reviews/<id>/review.json), and reads his answers back with tools/review.py. Use it whenever Jørgen has to pick, judge or comment on anything (art, voices, models, designs, options), instead of putting it in chat, and whenever you need to see what he answered.
---

# Post a Review item

Anything Jørgen picks or judges goes to the Review queue, never into chat (GUIDE: Reviews go in the bible). The format and the full field list are in reviews/README.md; read it before writing the first item in a session.

## Post

1. Choose the id (lower case, digits, hyphens). A new round gets a new id; set the old item's status to `superseded` with `python3 tools/review.py set-status <old-id> superseded`.
2. Put the files next to the work (e.g. art/candidates/portraits/<round>/), as webp or mp3, never raw PNGs or WAVs in git (the asset hook refuses binaries it doesn't expect).
3. Write reviews/<id>/review.json as reviews/README.md shows. Include:
   - every attempt, in the order made, including the ones you'd reject (GUIDE: Show every attempt), each with a `note` giving the prompt or settings, the seed and any measured numbers;
   - for animations and 3D models, a live viewer under `links`, not stills (reviews/README.md, step 2);
   - a `question` in one plain sentence, the way you'd ask it out loud.
4. Check it: `node tools/bible/check.mjs` (every path must resolve), then open http://127.0.0.1:8771/bible/#review/<id> headless if you need to see it. Never open it on Jørgen's screen.
5. Commit only the item's files (GUIDE: Definition of done), message ending `Facts: none` unless it changed what the game is.
6. Tell the caller the id in one line. No candidate dump in chat.

## Read answers

```
python3 tools/review.py list            # NEW marks unread feedback
python3 tools/review.py show <id>
python3 tools/review.py mark-read <id>  # after acting on it
python3 tools/review.py set-status <id> decided --decision "<his words>"
```

Pass his comments on as he wrote them (GUIDE: Relay feedback as given). When a side is named, state it as "her left (image right)" (GUIDE: Left and right on a character mean hers). Never edit feedback.json by hand.

When decided: move the approved files where they belong (reviews/README.md, last paragraph) and update docs/game/art-and-sound.md or the file that holds that fact.
