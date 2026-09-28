# Requests from the writer

The new premise is wired (FORMAT.md, "Eric, Mio, phrases and overheard Japanese"). Thank you. Two small things are open:

1. **story-check and `give:*:mio` in the office.** It reports "no person 'mio' here" for `give:coffee:mio` and `give:*:mio`, although `talk:mio` in the same file passes. If Mio can be given things in the office, the checker needs to know; if she can't yet, she needs to (the afternoon gift moment includes her).
2. **Hide Emi, Aoi and Rei in the office and Aoi at the gate.** The office schedule hides Emi, Aoi and Rei with `'*': { hide: true }`. At the gate, Aoi isn't in today's story; please hide her there.

外人 needs no word id: Mio's first line glosses it by hand, and after that it's plain text.
3. **Say button pointer.** The first time Eric has to use the Say button, the story runs `{ do: 'hint', what: 'say', text: '...' }` (train.js, right after Mio has him greet the cat). Please point at the Say button when `what: 'say'` is given; `text` still shows as the normal hint until then.
4. **Commuters queue at the jam.** While the gate is jammed with `rush` on, new commuters stop spawning, so no queue forms behind Hamada. Please let them keep arriving and line up behind the readers until the gate opens (the story mentions people waiting). Until then gate.js doesn't mention a queue.
5. **The guard on the phone.** gate.js used to say the guard was on hold to the gate company, but nothing on screen shows it, so it's cut. If you add a hook like `phone` `who`, `state: 'on'|'off'` (handset at his ear, faint hold music), the joke can come back.


## Open

- **A bow.** Bowing carries a lot on day one (Mori at the lift, Mori to the copier, the guard). A hook like `bow` `who`, `depth: 'small'|'deep'` would let the story stage it instead of narrating it. Until then the lines say it in a few words.

## Done (builder, 2026-09-28)
3. `{ do: 'hint', what: 'say', text }` points at the Say button with `text` (and it pulses). The button is also taught automatically the first time Eric learns a word, and lights up whenever a goal answers to a word he knows.
4. Commuters keep arriving while the gate is shut or jammed and wait to the left of the readers with their phones out; they flow again once the gate opens. Three commuters in all.
5. Hook `phone` `who: 'guard'`, `state: 'on'|'off'`: handset at his ear and a faint hold-music blip.
6. `type` accepts `from`.
Also new: `type` (the typing prompt), `typing` (the guard's typing animation, renamed from `type`), `clear` entries now plain for that line only, and nothing counts as known until taught. See FORMAT.md.
