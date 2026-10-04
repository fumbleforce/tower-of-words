# Systems

Day 1 is Thursday 1 October in five periods, and only the story moves the clock. Also here: schedules, the crowd, ambient moments, bond steps, memory, gifts and their prices, typing a word and word practice, saying words to things, overheard Japanese, what a kotodama looks and sounds like, finds, repair tickets, and saving (an autosave, a quick save and twelve slots). Last checked against the game on 2026-09-29.

Elsewhere: the controls and screens for these are in [controls-and-ui.md](controls-and-ui.md); the words in [words.md](words.md); each person's tastes, register and relations in [cast.md](cast.md); the data keys a story file uses for all of this in game3d/story/FORMAT.md ("Sim data").

## Why these systems

Jørgen (2026-09-28): a day clock with periods, NPC schedules and NPC-to-NPC relationships, bonds that unlock scenes and commands taught by people who trust you, personal likes and small gifts. Built to scale for an open world where long cohesive narratives aren't possible. Day 1 uses a small part of it for onboarding, with one real who-to-spend-time-with choice ([`lunch`](stories/lunch.md)). No generic repeated menus, gift spam or grinding.

## The clock

- Day 1 is Thursday 1 October. A day has five periods: early morning, morning at work, lunch, afternoon, after work. The HUD shows the date and the period ("Thu 1 Oct · Morning at work").
- Only the story moves the clock. There are no real-time timers and no clock fail states; text never runs on a timer (GUIDE, Visual design).
- Day 2 is Friday 2 October and uses two periods: morning (it starts in Eric's room) and after work (from sitting at his B2 desk). Its story set, the places it opens and the ways between them are game3d/story/day2/ ([stories/day2](stories/day2/README.md)); game3d/js/days.js says which set a day plays and where it starts. A later day's own walks between places are the same in both periods.
- Later days after day 2, a sixth period (night) and the week are to build.

## Schedules

- Each place's story file says where each person is in each period ([places.md](places.md), Who's there when). When the period changes, people walk to their new spot or leave.
- A person's schedule across places, and their whole week, are to build (cast.md has the routines that are decided).

## The crowd

The island is well populated (Jørgen, 2026-10-02: "there should be plenty of people about ... dependent on the time of day ofc."). Every outdoor place has a crowd of islanders going about their day, set by the period (the dorm courtyard only a few residents after work): how many walk, sit, stand talking and wait in each place is in [places.md](places.md), at the end of each place's Who's there when.

- They walk the paths between the ends of the streets and the doors of open buildings (the head office, the station, the dorm hall), keeping to the middle of a path and a little to its right, sit on the benches, stand talking in pairs on open paving, and wait in a line at a shut door. Some carry a briefcase, a tote, groceries or a backpack; joggers run in sports clothes.
- No stream (Jørgen, 2026-10-02: "they come in waves and all walk the same way, it feels a bit artificial"). New walkers set off at random gaps, about as often as others leave, so there is no rush of them at once. In every period people walk every way: the commute is the biggest share, with others going against it (an errand, something forgotten, the konbini) and across it. Each walks at their own pace (older people slower), and they are a little taller or shorter each. Some stop once on the way where the path is wide, after a step to the side: a look at a phone, a shop window, bending to a shoe, and now and then someone stays a good while. Some walk in twos, side by side, and stop to talk. The shares per place and period are in places.md.
- They are background, not people to talk to: no pin, no name, no talk.
- They never stand in the way: walkers go round Eric and the story's people and never push them or slip through them, the story's people never wait for them, and anyone walking a set route that goes round nobody (Eric walking out of a place) sees them step aside, never into someone else (with no clear side they wait). Nobody stands or sits on the walking lines, by the things the story uses or where Eric comes in.
- Nobody appears or vanishes in view: a new walker comes in at a street's end out of view or steps out of a door, and leaves the same way. The clock moving while Eric is there changes only the people out of view.
- While a scene plays, nobody steps out of a door (new walkers come only from a street's end out of view), nobody stops on the way, walkers give Eric a wide berth and nobody heads for a door he is at, so the scene keeps its room.
- The numbers in places.md are for a desktop at high quality. The medium tier shows 85% of them and the low tier 70%; phones show 55, 75 or 90% (low, medium, high), with no sun shadows. There is a cap per place on how many are out at once: 22, 30 and 36 on a desktop, 14, 18 and 22 on a phone.
- They are the same chibi bodies as the lobby's office workers, built in game3d/js/crowd/looks.js, so a later character model replaces one file.

## Ambient moments

Two people talk to each other when Eric comes near, shown as captions he doesn't have to tap: Mio muttering at the train's Wi-Fi, Kenji asking Mori about the new guy in the afternoon. They need both people there, and can depend on a relation, a flag or the period. They play once unless the story says otherwise.

## Bonds

Every person has a bond with Eric, in steps:

| Step | Name | Needs |
|---|---|---|
| 0 | Stranger | |
| 1 | Known | Met: talked to, or introduced. They show up in the People panel. |
| 2 | Friendly | 6 points |
| 3 | Trusted | 14 points and their turn scene |
| 4 | Close | 24 points and their payoff scene |
| 5 | Partner or friend | Step 4 and their last scene |

Points come from:

| Source | Points | Limit |
|---|---|---|
| A first greeting | 1 | once per person |
| Talking, when they have something new | 1 | once a day |
| A gift | need 3, liked 1, anything else 0 | one gift per person per week counts |
| Answering a need they said out loud | 3 | once per need |
| A repair request for them or on their machine | 2 | |
| A hand with something that isn't a ticket | 1 | once a day |
| Doing it their way | 1 | once a day |
| Their word, in the register they use | 1 | once a day |
| An authored moment | 1 | once each |

- At most 3 points per person per day. Points never go down.
- The People panel shows each met person's step as hearts with a line on where things stand, never the points or what the next step needs ([controls-and-ui.md](controls-and-ui.md), People).
- While a step's scene hasn't played, points stop at its threshold, so nobody can be ground past it. Day 1 only reaches steps 1 and 2; the scenes for steps 3 to 5 are to build.
- How people get on with each other (`likes`, `owes`, `rivals`, one way) is data too, and can change in play. Ambient moments and lines can depend on it.
- The register each person expects ([cast.md](cast.md), What they like) is compared with the last word Eric said to them, so a line can react to too polite or too casual.

## Memory

People remember things Eric did ("You caught her lunch bag when the train lurched.") and he learns facts about them ("Has corn soup from a can every afternoon."). Both show in the People panel under that person. The texts are written for the player; day 1's are in game3d/js/bonds/day1.js.

## Gifts

Eric starts with ¥1000. On day 1 the only shop is the B2 vending machine. A drink goes into the Bag; stand next to someone and press Give. How each person takes each drink is in [cast.md](cast.md), What they like. On day 1 a second drink for the same person is turned down and stays in the Bag.

| Id | Name | Price |
|---|---|---|
| `coffee` | Canned coffee | ¥120 |
| `tea` | Royal milk tea | ¥130 |
| `melon` | Melon soda | ¥130 |
| `cornsoup` | Hot corn soup | ¥130 |

## Typing a word

Where a word is taught, Eric types its romaji. The prompt shows the Japanese, the romaji letter by letter and the English. The Japanese has the same play button as a taught word in a line: tapping the word or the button plays Mio saying it (Jørgen, 2026-10-02: "during the regular word writing interactions, the word should also be clickable here to hear the pronounciation"), and the answer field keeps its text and focus, so the phone keyboard stays up. A word without Mio's clip has no button. It forgives case, spaces, hyphens and long vowels (ō = ou = oo = o). Letters light up as they're typed; a wrong Enter shows the next letter, and after three tries the whole romaji. It works with the phone keyboard. On success Eric says the word (voiced) and it becomes known. With voice input on, the empty answer box reads "Type it in romaji or say it"; with it off, "Type it in romaji".

Voice input (Jørgen, 2026-09-28): he can say the word into the microphone instead, both at the prompt and when using it. It runs Whisper on the device by default (a one-time download of about 77 MB; nothing leaves the device), or the browser's recogniser, or off (Settings). The microphone is asked for only the first time he presses the mic.

## Word practice

A word has to be typed or said three times before the Say menu lets him just click it (Jørgen: "Up until you have written/said it a few times, you still have to type it / say it in the game, so it is not just clicking it"). The typing prompt where it was taught counts as the first. Below that, choosing it in the Say menu opens the small type-or-say prompt. It is never a gate: the prompt helps after a few tries and can be backed out of. The Words panel and the Say menu show dots for the tries, then "by heart". The number is a setting.

## Saying words to things

The Say menu speaks the chosen phrase or command to whoever or whatever is nearest. The story answers it if it has an answer for that word and that target; otherwise the engine has a small built-in reaction. Wrong words get an honest reaction, not silence. The Say button lights up when the current goal answers to a word Eric knows.

## Overheard Japanese

Lines Eric can't follow are shown as soft, shifting stand-in characters, with only the words he knows, people's names ([words.md](words.md)) and the loanwords a line makes clear readable. Their voice plays muffled; the known words come out clear in it (Jørgen: known words clear in the voice, unknown speech much more sound-blurred; "the text blur is good as it is"). Sounds like あっ or えっ stay readable; real words like はい or うん blur until taught. The point is that Japanese beyond his level looks and sounds like gibberish on purpose.

## Subtitled Japanese

Some Japanese is subtitled instead of overheard: its voice plays clear, in Japanese, and the English shows as the line, with "in Japanese" by the speaker's name. The Japanese itself isn't shown and nothing in it becomes known. For the small moments where the player should follow what someone says although Eric can't (the train passengers).

## Kotodama effects

When a command takes hold, the target shimmers at its edges, the command's Japanese (待って, 動いて) rises off it in faint light and fades, the lights dip and hum, a low tone plays, sounds that can be cut (the door chime) stop, and the text box clears. Then the machine does what it was told, literally. Targets on day 1: the train doors, the lobby gate, the machine room door, the copier, the server rack alarm, the kettle, the vending machine. Small reactions without the full effect: the clock, the fan, the coffee machine.

## Finds

Things Eric picks up and keeps on his phone (Jørgen, 2026-09-30: "how lame, a paper on the ground, and it is not a collectible photo?"). Day 1 has five photos, one in each of five places, lying on the floor off the main path, and one paper.

| Id | Kind | Where |
|---|---|---|
| `photo_gate` | photo | Security room, behind the cleaning cart by the drinks machine |
| `photo_forecourt` | photo | Forecourt, on the raked gravel court in the south garden, by the stone lantern |
| `photo_plaza` | photo | Plaza, by the north-west benches |
| `photo_office` | photo | B2 copy room floor, by the worktable |
| `photo_dorm` | photo | Dorm courtyard, in front of the drinks machines |
| `bakery_flyer` | paper | Mailbox 203 in the dorm hall, taken with Take mail |

- A photo is a small print lying face up with a pin; Pick up walks Eric to it. The print disappears, the picture comes up close with its title and "Added to Photos · 2 of 5", and a tap closes it.
- The Photos chip (top right, "Photos 2/5") appears with the first find. Its album shows the five frames in the day's order, the found ones as prints with their title and the rest as empty frames (no names, no hints), and under them the papers he has kept. Tapping one shows it up close again.
- The pictures are the ones Jørgen picked in Review photos-1 (2026-10-04), in game3d/assets/photos/: the early monorail, the cherry over the garden, pigeons at the fountain, the cat at the office, fireworks on a summer night. The album shows a small copy, the close look the large one (game3d/js/finds/prints.js). Titles, captions and the paper's text come from the story (game3d/story/finds.js). A found find is the flag `found_<id>`, so the save and Continue keep it.

## Tickets

Repair tickets are how the work reaches Eric (Jørgen, 2026-10-03: "the main storyline progression should perhaps revolve around the tickets and going to the office. But as this is not a super efficient company, you don't necessarily have to go to the office every day. You don't need to complete the ticket every day. You just use those as levers to progress the story."). Day 2 is the first glimpse: the company's in-house ticket system on his computers, with two tickets.

- A ticket has an id (T-0001), a subject, who sent it, a short description in plain English with a few Japanese words (shown with reading and English), and a status: New, In progress or Done. The words are the story's (game3d/story/tickets.js).
- The story adds tickets to his queue and closes them, by a scene or by a condition the ticket names. There are no deadlines, no penalties and no way to fail one (Jørgen, 2026-10-03: "There's no consequence for not completing the tickets. It's just you're not progressing in the story."): an open ticket only holds the story where it is, for as long as it stays open. In the app Eric reads them and can take a new one (it moves to In progress); he never closes one there.
- Eric is a contractor paid per task (Jørgen: "Maybe you could get paid by tickets ... Since you're a contractor ... You're paid per task."). Each ticket pays a set amount, once, when it closes: it goes into his yen (the same money as Gifts, saved with it), with a notice "Paid ¥5,000 for T-0002 · ...". The app shows what a ticket pays and what the closed ones have paid him. Spending it beyond the drinks is to build.

| Id | Subject | From | Pays |
|---|---|---|---|
| T-0001 | B2 copier eats paper | Mori | ¥3,000 |
| T-0002 | Train doors at Honsha | Honsha station, via Mio | ¥5,000 |
- The app opens only when the story puts him at a computer (Eric's room PC, his B2 desk); how it looks is in [controls-and-ui.md](controls-and-ui.md).
- Tickets are flags (`ticket_T0001`, and whether he has opened it), so the save, Continue and the next day keep them like everything else.

## Saving

The game saves by itself at every place change and at the end of the day: flags (the finds among them), bonds, memory, the period, the Bag, money, goals, the words and where they came from, which scenes have played, and the place.

Besides the autosave there is one quick slot (F5 and F9) and twelve manual slots (Jørgen agreed 2026-10-04). A quick or manual save is a copy of the game at that moment, with a picture of the world (320 × 200, JPEG), the day, period and place, the goal or line, and the real time. They are kept in the browser: the saves in localStorage (keys amakawa-slot-quick and amakawa-slot-1 to 12; the three slots of older builds are slots 1 to 3 and keep their saves), the pictures in IndexedDB (database amakawa-saves), where a dozen of them don't crowd localStorage. On the first start of this build a picture an older build kept inside its slot moves to IndexedDB, and is dropped from the slot only once IndexedDB has it; without IndexedDB pictures stay in the slot as before. A save the browser refuses (storage full or off) says so and keeps the old one. Loading a slot makes it the autosave and restarts the page into it, the way Continue plays. Loading in play asks first only when the game has progress no quick or manual slot holds ([controls-and-ui.md](controls-and-ui.md), Load confirm). Code: game3d/js/saves/ (store.js the slots, actions.js saving and loading, view.js the screen).

Continuing a save (the title's Continue, or Load from a slot) resumes exactly where it was made: same place, period, flags, bonds, words, Bag and money; Eric appears at a safe spot in that place; the place's doors, gate and props are as they were; no scene that already played replays, and nothing resets to morning. Starting the game never overwrites a save before the player chooses (fixed 2026-09-29; the old build always sent Continue back to the train). If a save is made in the middle of a scene, only that scene restarts from its beginning: the room is put back as it was when the scene started, scenes it already finished stay finished, and purchases, relationship changes and typed lessons are kept. If a saved scene no longer matches the story (the story changed since the save) or a scene fails while loading, the game keeps the previous save untouched and shows a Return to title dialog instead of playing on; nothing in play can overwrite that save until the player chooses. The day ends when Eric gets home to his room after work ([`mio-notices`](stories/mio-notices.md); day 2: [visits](stories/day2/visits.md)); its end ("Day one", "Day two") shows the places, the people met and the words he can use now, with no quiz and no score; day one's also shows the repair request and its closing line.

The next day starts from the end of day one: its end has Start day two beside Back to title. That makes day 2's opening save from the finished day (every flag, word, bond, find, the Bag and money carry over; the place's state, a running scene, a trip and one-off triggers are cleared) and continues into it, in room 203 in the morning; a Continue on a finished day shows its end again with the same choice. The title's Continue card says the day after day 1 ("Day 2 · Eric's room · Morning at work"). On a later day, a Continue runs the place's opening again after rebuilding it (its people and props are put where the story has got to; it only sets things up and points the way, so nothing replays), and a way out Eric arrives standing in waits until he steps out of it. For testing, `?day=2` starts day 2 at once from the player's own finished day 1 if the autosave is one, else from a plain finished day 1 (the magic way through the gate, lunch with Mio); `&history=mori` takes lunch with Mori instead, `&history=cold` lunch alone and no promise from Mio. It skips the title and saves over the autosave.
