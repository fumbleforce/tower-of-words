# Requests from the writer

The new premise is wired (FORMAT.md, "Eric, Mio, phrases and overheard Japanese"). Thank you. Two small things are open:

1. **story-check and `give:*:mio` in the office.** It reports "no person 'mio' here" for `give:coffee:mio` and `give:*:mio`, although `talk:mio` in the same file passes. If Mio can be given things in the office, the checker needs to know; if she can't yet, she needs to (the afternoon gift moment includes her).
2. **Hide Emi, Aoi and Rei in the office and Aoi at the gate.** The office schedule hides Emi, Aoi and Rei with `'*': { hide: true }`. At the gate, Aoi isn't in today's story; please hide her there.

外人 needs no word id: Mio's first line glosses it by hand, and after that it's plain text.
3. **Say button pointer.** The first time Eric has to use the Say button, the story runs `{ do: 'hint', what: 'say', text: '...' }` (train.js, right after Mio has him greet the cat). Please point at the Say button when `what: 'say'` is given; `text` still shows as the normal hint until then.
4. **Commuters queue at the jam.** While the gate is jammed with `rush` on, new commuters stop spawning, so no queue forms behind Hamada. Please let them keep arriving and line up behind the readers until the gate opens (the story mentions people waiting). Until then gate.js doesn't mention a queue.
5. **The guard on the phone.** gate.js used to say the guard was on hold to the gate company, but nothing on screen shows it, so it's cut. If you add a hook like `phone` `who`, `state: 'on'|'off'` (handset at his ear, faint hold music), the joke can come back.


6. **The first kotodama: the train doors (train.js, `arrival`).** Jørgen couldn't tell anything special happened when the doors held. The beat now needs two things from the engine:
   - `{ do: 'doorsClose', to: 0.35, ms: 20000 }`: the doors slide steadily from where they are to `to` (1 = open, 0 = shut) over `ms`, then wait there, with the door sound. No `to` means shut, as now. This lets them keep creeping shut through Mio's two lines and Eric's typing, so they are visibly still moving when he finishes the word. Nothing should stop them before that.
   - `{ do: 'doorsHold', kotodama: true }`: the doors freeze dead at the exact point they've reached, and it has to look and sound wrong: the closing chime cuts off mid-note, a faint shimmer runs along the door edges, the car lights dip and hum for a second or two, and a low tone plays. Then everything stays still, doors part-open, until the player leaves the car. The sleeping man wakes on the next step, so the effect can be what wakes him.
   Without these, the scene still runs (the doors shut in about two seconds and `doorsHold` pops them back to 0.45), but it won't read as magic. If you'd rather make the effect a general hook for later (the copier, the gate), `{ do: 'kotodama', target: 'doors' }` is fine too: tell me and I'll swap the step.

## Open

- (done) `bow`, plus `gesture`, `headphones` and train `bag`; the builder has already swapped the narrated bows, the nine fingers, the shrug, the finger to the lips, the ski jump, the headphones and the sliding bag for these steps. (`headphones` has since been removed: Mio has no headphones prop; the hook does nothing.)

## Done (builder, 2026-09-28, second batch)
6. `doorsClose` takes `to` and `ms`: a steady slide over `ms` with a soft door sound, and the closing chime repeats while they move. It also lifts the camera a little so the doors stay above the text box. `doorsHold` with `kotodama: true` freezes them exactly where they are and plays the kotodama effect: the chime cuts off mid-note, a cold shimmer runs along the door edges, the lights dip and hum, a low tone swells, and the text box clears while it happens (about 2.6 s). The doors stay part-open until the doors open again. The effect is also a general hook: `{ do: 'kotodama', target: 'doors' }`, and places can name more targets later (copier, gate). `gesture` `point` does nothing on Mio (her model has no arm rig for it); on chibi people it works.

## Done (builder, 2026-09-28)
3. `{ do: 'hint', what: 'say', text }` points at the Say button with `text` (and it pulses). The button is also taught automatically the first time Eric learns a word, and lights up whenever a goal answers to a word he knows.
4. Commuters keep arriving while the gate is shut or jammed and wait to the left of the readers with their phones out; they flow again once the gate opens. Three commuters in all.
5. Hook `phone` `who: 'guard'`, `state: 'on'|'off'`: handset at his ear and a faint hold-music blip.
6. `type` accepts `from`.
Also new: `type` (the typing prompt), `typing` (the guard's typing animation, renamed from `type`), `clear` entries now plain for that line only, and nothing counts as known until taught. See FORMAT.md.
