---
name: post-review-item
description: Posts a choice or a set of candidates to Jørgen's Review queue in the bible (reviews/<id>/review.json), and reads his answers back with tools/review.py. Use it whenever Jørgen has to pick, judge or comment on anything (art, voices, models, designs, options), instead of putting it in chat, and whenever you need to see what he answered.
---

# Post a Review item

Anything Jørgen picks or judges goes to the Review queue, never into chat (GUIDE: Reviews go in the bible). The format and fields are in reviews/README.md; read it before your first item in a session.

## Post

1. Choose the id (lower case, digits, hyphens). A new round gets a new id; mark the old one `python3 tools/review.py set-status <old-id> superseded`.
2. Put the files next to the work (e.g. art/candidates/portraits/<round>/), as webp or mp3, never raw PNGs or WAVs.
3. Write reviews/<id>/review.json as reviews/README.md shows, with:
   - every attempt in order, rejected ones too (GUIDE: Show every attempt), each with a `note` giving the recipe or settings, the seed and any measured numbers;
   - a live viewer under `links` for animations and 3D models;
   - a `question` in one plain sentence, the way you'd ask it out loud.
4. Never touch `updated` on an item he has answered unless you add a new round to it: a later `updated` makes his answer look missing and the item waits for him again.
5. `node tools/bible/check.mjs` (every path must resolve); view http://127.0.0.1:8771/bible/#review/<id> headless if needed, never on his screen.
6. Commit only the item's files, `Facts: none` unless it changed what the game is.
7. Tell the caller the id in one line.

## Read answers

```
python3 tools/review.py list            # NEW marks unread feedback
python3 tools/review.py show <id>
python3 tools/review.py mark-read <id>  # after acting on it
python3 tools/review.py set-status <id> decided --decision "<his words>"
```

Pass his comments on as he wrote them (GUIDE: Relay feedback as given), sides as "her left (image right)". Never edit feedback.json by hand. When decided, move the approved files where they belong (reviews/README.md) and update the docs/game/ file that holds that fact.
