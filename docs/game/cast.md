# Cast

Every person and their id: the Everyone table, then one section per person with age, work, home, routine, who they know, how they talk and their approved look (hair, eyes, 3D colours). Then the names shown on screen, what each person likes (for gifts), which portrait faces each has, and people in the code but in no storyline. Last checked against the game on 2026-09-29.

Elsewhere: which storylines each person is in is in each storyline's Cast line ([stories/](stories/)); where the game puts people at each time of day is in [places.md](places.md); how to write their lines is in game3d/story/VOICE.md, and their voice settings in game3d/story/VOICE-DIRECTION.md; art history and candidates are in the bible. The current requested character plans are under [Personal plots and bond milestones](#personal-plots-and-bond-milestones), marked to build. Older ideas in notes/walkthrough/ remain unapproved.

The tables are checked against the game by `node tools/facts/check.mjs`. Ids in backticks are the ids the story files use.

## Everyone

| Id | Name | Who they are |
|---|---|---|
| `eric` | Eric | The player. IT support engineer on a support contract, based on B2. |
| `mio` | Mio | B2's programmer. |
| `mori` | Mr. Mori | On the B2 team; used to be a manager. |
| `kenji` | Kenji | B2's newest engineer before Eric. |
| `emi` | Emi | B2's team lead. |
| `guard` | Mr. Ishibashi | The security guard at the head office gate. |
| `kuroda` | Mr. Hamada | Accounts, 12th floor. |
| `kuro` | Kuro | The receptionist in the head office lobby. |
| `aoi` | Aoi | A new hire. |
| `rei` | Rei | Sales. Not met on day 1. |
| `tama` | Tama | A calico cat. |
| `konbini_clerk` | Shop clerk | An unnamed adult at the konbini till; the existing generic apron body and approved sales2 voice. |
| `bakery_clerk` | Bakery clerk | An unnamed adult serving bread in the shop street bakery; the existing generic apron body and approved sales2 voice. |
| `ferry_staff` | Room attendant | An unnamed adult who keeps the harbour waiting room usable; existing generic body and approved sales2 voice. |
| `ferry_reader` | Reader | An unnamed adult reading a leaflet by the harbour window; existing generic body and approved sales1 voice. |
| `ferry_traveller` | Traveller | An unnamed adult resting with a bag, which he moves from a usable seat; existing generic body and approved reader voice. |
| `canteen_worker` | Canteen worker | An unnamed adult who works at the indoor service counter and closes the canteen terrace after work. |
| `station_worker` | Grounds worker | An unnamed adult tending the station south garden by day; the existing grey worker body and borrowed reader voice. |
| `canteen_shirt` | Diner in a shirt | The existing seated adult at the west table, with a work badge and curry; approved sales1 voice. |
| `canteen_cardigan` | Diner in a cardigan | The existing adult with her own rice container and a canteen side dish; approved sales2 voice. |
| `canteen_polo` | Diner with a water cup | The existing adult at the east table, taking an indoor break; approved reader voice. |
| `attendant` | Attendant | The gym's attendant on day 3: the desk by day, the pool's floats at the club's evening. An office worker's body, a borrowed voice. |
| `member` | Club member | A swimming club member on day 3's evening, with the equipment list; her goggles are on the pool's fence. An office worker's body, a borrowed voice. |
| `bun` | Woman with a bun | A monorail passenger. |
| `music` | Girl with headphones | A monorail passenger. |
| `stander` | Man with a bag | A monorail passenger. |
| `reader` | Man with a book | A monorail passenger. |
| `commuter` | Office worker | People coming in through the gate for work. |
| `worker_a` | Office worker | One of two office workers standing past the gate in the security room. |
| `worker_b` | Office worker | The other one. |
| `commuter_1` | Office worker | One of three commuters who walk in through the gate. |
| `commuter_2` | Office worker | The second. |
| `commuter_3` | Office worker | The third, carrying a cake box. |
| `sales1` | Man from Sales | Rides the lift to the 5th floor. |
| `sales2` | Woman from Sales | Rides the lift to the 5th floor. |
| `ann` | Announcement | The monorail's announcer (voice only). |
| `gatev` | The gate | The gate's recorded voice. |
| `miotext` | Mio | Mio's text messages on Eric's phone. |

The id `kuroda` is Mr. Hamada. The id is older than the name and stays so the voice files keep working.

## People

### Eric (`eric`)

- The default protagonist. Carina can play instead: a woman with the same bio and job, bisexual. The stable story id `eric` means the player whichever protagonist is chosen. Identity and asset selections come from game3d/data/mc/; see [Protagonists](systems.md#protagonists) for configuration and voice status.
- The player. From Norway. Age 37, with a lot of work experience (Jørgen, 2026-10-09).
- Work: IT support on B2, on a support contract to keep Amakawa's ancient systems running ([setting.md](setting.md)). Repair requests will take him all over the island.
- Home: moving to the island on day 1; his things were sent ahead. A company dorm room, the worst one, facing a concrete wall a couple of metres away (decided for the VN version, 2026-09-25): room 203 on 2F (built as `dorms`, [places.md](places.md)).
- Speaks English, and barely any Japanese: "arigatō" is about it. He can greet everyone from day 1 and learns greetings and simple phrases quickly; more Japanese opens up the other people (Jørgen, 2026-09-28). Tired, polite and dry.
- Kotodama works for him and nobody else ([setting.md](setting.md)).
- Look: approved portrait eric-ink-2001 (reviews/style-align-1): dark-blond hair in a short ponytail, stubble, silver rectangular glasses, grey hoodie under a navy blazer. Copies in art/approved/mc/.

### Mio (`mio`)

- Age 30 (Jørgen, 2026-10-09). B2's programmer. Of the people Eric works beside, the only one with English (loose, learned from work and the internet).
- Home: on the island. Her mother lives on the mainland; Mio stays over sometimes and comes back on the monorail with a bag of her mother's pickles ("My mother thinks island has no food").
- Job: hired as a programmer, never meant to work on the servers. Nobody else on B2 knew anything about the old machines, so she became the de facto expert. She forwarded the request for a dedicated hardware engineer to Emi, and it went up the chain until the company brought Eric to the island (Jørgen, 2026-10-09).
- Routine: looks after B2's old servers in the machine room, where she also eats lunch because "it's quiet, and nobody talks to me there". Hates bowing; that's why she's on B2. Anything reported broken goes on her list.
- Mio is an asocial gamer. She values her privacy and alone time. A few people are exceptions (Jørgen, 2026-10-09). She is dry, busy and low on energy. On the train she reluctantly gets Eric up to speed. She will not let a teammate embarrass B2 through lack of preparation. She calls him 外人 as she would say "the new guy". Mori corrects her to 外国の方.
- Knows: Mori (likes him), Kenji (barred him from the machine room).
- Look: approved portrait art/approved/mio/mio-after.webp. Hair dark green bordering on black, with lighter green underneath, as in the portrait (Jørgen). Eyes light tan, not brown; every expression keeps her exact glasses. Skin pale; she doesn't sunbathe (Jørgen, 2026-10-02: "she should not have a tan, she doesnt sunbathe, pretty pale"). 3D: Jørgen's Meshy model; game colours hair #13292f, underside and streaks #20a081, hoodie sampled from the portrait (approved, "yes this is sweet", commit df8f2f7). A remake made the way Kuro, Aoi and Emi were (Jørgen, 2026-10-05: "her design is falling behind in quality, it is not as accurate as the others") waits for his pick in reviews/mio-meshy-2 and loads only with `?mio=meshy2`.

### Mr. Mori (`mori`)

- Age 58. Used to be a manager; now on the B2 team. Formal and kind.
- Routine: makes the tea; has corn soup from a can every afternoon. Opened the B2 copier's repair request when he was new ([stories/copier.md](stories/copier.md)) and has said 動いて to it every morning since. Went to the Lillehammer Olympics in 1994 and does the ski jump with his hands.
- Speaks polite Japanese only. His warmth shows in what he does: bows, tea, making room.
- Knows: Mio (likes her; corrects her 外人 gently, the only time he interrupts).
- Look: approved portrait mori-new-713 (reviews/npc-base-1): neatly combed grey hair, dark grey suit, navy tie, empty hands. Copies in art/approved/mori/. In the 3D world a chibi figure in code; his Meshy model (loads with `?cast3d=mori`) is parked (Jørgen, 2026-09-29, review mori-3d: "none of these").

### Kenji (`kenji`)

- Age 21. Two months on the team, the newest before Eric. Kenji is mild, confused and somewhat clumsy (Jørgen, 2026-10-09). He is keen to help and easily distracted.
- Routine: lives on melon soda. His chair broke, so he borrowed Eric's and left it in the machine room.
- Speaks casual Japanese, and a little school English he likes to practise.
- Knows: Mori (likes him), Mio (owes her).
- Look: about 21, inexperienced, eager, easily distracted; varied looks but grounded, a junior IT support guy in work clothes (Jørgen, 2026-09-28). Approved portrait: h4, bedhead with an open smile (reviews/kenji-concept-3), redrawn toward Mio and Kuro as kenji-ink-2001 (reviews/style-align-1): soft pudgy build, white short-sleeved shirt, dark tie, empty hands. Round 1 (hobby costumes) was rejected as "way out of whacko land... he is at work".

### Emi (`emi`)

- Age 32. B2's team lead. Native British English.
- On day 1 she is upstairs at head office all day, arguing for B2's parts budget, and comes down at 17:40 ([`emi-budget`](stories/emi-budget.md)).
- Quick and complete sentences; says the good news first and the problem as an aside.
- A cast member like any other, with no special restrictions: romance and rewards apply to her as to the rest (Jørgen, 2026-09-27).
- Look: approved portrait emi-base-2001 (reviews/style-align-1), redrawn from round 3 RDBT seed 41 (art/approved/emi/emi-after.webp): reddish auburn bob, tortoiseshell glasses, curvy, charcoal blazer over a cream blouse. In the 3D world, the Meshy model emi-2 (reviews/emi-meshy-1, round 2, made after Jørgen's note on emi-1, 2026-10-05: "looking good, but for some discoloration, and the lanyard which becomes mangled. we should remove props when making the models."): the auburn bob, a black trouser suit over a cream blouse; no glasses or lanyard on the model ([art-and-sound.md](art-and-sound.md#people-in-the-world)).

### Mr. Ishibashi (`guard`)

- Age 64. The security guard at the head office gate. Strict and fair.
- Routine: at his desk by the gate every morning, greeting people with おはようございます. Feeds a cat that, he says, is not there.
- Speaks polite, clipped Japanese and no English. Speaks with his hands when he has to, precisely.
- Look: approved portrait guard-ink-2001 (reviews/style-align-1): bald, thin white moustache, glasses, navy security uniform, empty hands. His name plate, shoulder patch and collar pin carry no letters.

### Mr. Hamada (`kuroda`)

- Age 54. Accounts, 12th floor.
- Lives on the island. Falls asleep on the monorail every time he comes back from the mainland, and is late through every gate. Apologises constantly and talks to machines like animals.
- Speaks Japanese only.
- Knows: the guard (owes him; the guard gets him through every morning).
- Look: approved portrait hamada-new-743 (reviews/npc-base-1): thin, tired face, black hair going grey at the temples, navy suit, hands in his pockets. In the 3D world a chibi figure in code. "Hamada is fine" (Jørgen).

### Kuro (`kuro`)

- Kuro is aggressively flirtatious and domineering (Jørgen, 2026-10-09). Her low, unhurried delivery does not soften that personality.
- Age 38 (Jørgen, 2026-10-05). The receptionist in the head office lobby, behind the reception counter by the door (moved there from the station's visitor counter; Jørgen, 2026-09-30: "Then kuro should be there rather than at security"). Her name is written 玖路 and reads like 黒, black. Polite Japanese.
- She can handle a short reception exchange in English. Her first-day conversation is in [places.md](places.md#small-moments-2), with delivery in `story/VOICE.md` (Jørgen, 2026-10-04: "Kuro should have some more dialogue than good morning on the first day, maybe a tiny bit flirtatious").
- Look: approved portrait art/approved/kuro/kuro-after.webp, extended down to the waist as kuro-body-c-s11 (reviews/kuro-body-1) and shown 15% smaller than the others' framing, since at the same face height she looked "15% too large / zoomed in" (Jørgen, 2026-10-01). Clear-lensed glasses, never tinted. In the 3D world, Jørgen's approved Meshy model kuro-3 (reviews/kuro-meshy-orig-3, 2026-10-04: "Yes, very good"): black hair in a high bun with long side locks and a blunt fringe, dark eyes, a black trouser suit; no glasses or hair sticks on the model ([art-and-sound.md](art-and-sound.md#people-in-the-world)).

### Aoi (`aoi`)

- Age 24 (Jørgen, 2026-10-05). A new hire. Her assignment is decided today (day 1), and she's telling someone on the phone it can be anywhere but the basement. Japanese only.
- Assignment (#226, to build): Facilities scheduling, with her first weeks at the east-lane training centre. At their first real meeting she tells Eric she got a room upstairs, then learns he works on B2. She checks whether he heard her train call and starts again with her name; the awkwardness is brief. Her work concerns room bookings, not engineering.
- Look: approved portrait aoi-base-2001 (reviews/style-align-1), with the cream edge on her left side redrawn as fill-d65-s1 (reviews/aoi-edge-2); redrawn from gallery B-aoi (art/approved/aoi/aoi-after.webp): pink bob with dark roots, winking grin, green varsity jacket with a pink star patch. In the 3D world, the Meshy model aoi-2 (reviews/aoi-meshy-1, round 2, made after Jørgen's note on aoi-1, 2026-10-05: "her face is a tiny bit too large and her hands are larger than the others. but it is very very close id say"): pink hair with teal underneath, a dark teal track jacket with a pink star over a white top, dark trousers; her hands are shown at 0.75 of Meshy's size ([art-and-sound.md](art-and-sound.md#people-in-the-world)).

### Rei (`rei`)

- Rei is a brusque, abrasive leader with strong weaknesses, which she never discloses or shows openly (Jørgen, 2026-10-09). She holds a management role in Sales, not head of sales yet; she ranks above Eric in the hierarchy without being his direct supervisor (Jørgen, 2026-10-09).
- Age 41 (Jørgen, 2026-10-05). Sales. Built in the game (figures on the train, at the gate and in the office) but hidden all day and in no storyline. Her first authored meeting is planned at tennis (#226, to build).
- Language (#226): native Japanese; conversational English used with overseas customers. She can make plans, explain a practical problem and tease in short complete sentences. Idioms and abstract conversation take effort. She knows English tennis jargon better than Eric does, so a failed explanation is about the jargon, not his inability to understand any English. She can demonstrate or rephrase; she is not another general translator.
- Look: dialogue portrait rei-i65-2102 (reviews/rei-portrait-1, Jørgen: "65-2102"), an img2img of art/approved/rei/rei-after.webp with a sly confident look: silver-grey high ponytail, steel-grey eyes, gold hoops, light grey suit over a black high-neck top. Extended down to the waist with Jørgen's pick a-s11 (reviews/rei-body-1), its seam blended as attempt b did, which is the file b-s11.

### Tama (`tama`)

- A calico cat who rides the monorail and gets off wherever she likes. Turns up on the train, by the guard's desk and asleep on Eric's chair in the B2 machine room. Her story: [`tama`](stories/tama.md).
- Look and movement: a small faceted cat, white with orange and black patches and a black tail tip, rigged in code (game3d/js/creatures/cat.js). She washes, eats from her bowl, sits, and sleeps curled with her head on her paws and her tail round her; she breathes, sways her tail, flicks an ear and blinks. She walks on four legs in a cat's walk, tail up, her steps keeping to the ground she covers; she steps round when she turns on the spot, gets up before she sets off, sits down when she stops, and hops on and off seats.

### The others

The passengers, the office workers, the two from Sales, the announcer and the gate's voice are people with a day of their own; none of them know they're in Eric's story. They speak Japanese, which Eric hears as overheard speech ([systems.md](systems.md)).

The B2 team is Eric, Mio, Mori and Kenji, with Emi as team lead. Goro is a late-game character and not on day 1 (Jørgen).

## Personal plots and bond milestones

#226, to build. These are the current character plans requested on 2026-10-05, awaiting Claude's story read. They replace older walkthrough ideas for these people; Only the explicitly built scenes below are playable; the remaining rows are plans. The [days 3–5 outline](../../notes/days3-5-outline.md) owns those days' shared scenes and period-by-period placements. This section owns each person's plot, club affiliation, repeat meeting and milestones. Future scene scripts should link back here rather than copy the plan into another document.

Use [the existing bond rules](systems.md#bonds). Steps 0 and 1 describe the first meeting; step 2's moment is a possible expression of friendship, not another gate beyond its points. Steps 3–5 require the scenes below, in order, with the existing thresholds and daily cap. Their completion flags use the existing names `bond3_<id>`, `bond4_<id>` and `bond5_<id>`; the scene sets its flag only at the completed turn. These are proposed flags, not implemented ones. Step 2 has no scene: the engine sets `bond2_<id>` when the person reaches it ([systems.md](systems.md#bonds)). An early conversation or day-3 club visit cannot jump a step. Existing first meetings carry over; never make a known person introduce themselves again.

Each later scene is offered at the listed recurring meeting once its bond requirement is ready. Walking past or leaving early keeps it available next time. A scene can recall a ticket, gift or command actually used, but none requires a particular optional repair or magic demonstration. Club milestones need that club's board slip; place-based threads need no membership. Completion produces the stated memory and changes the next encounter; repeated visits cannot award the same milestone again.

The women below each have a friendship ending and an optional romantic invitation at step 5. Eric chooses whether to ask for a date; the scene supplies a clear mutual answer. Either ending completes the same step and retains the continuing friendship. Nothing in points, gifts, club attendance or a work favour silently selects romance. Public scenes end with plans to meet again. Mori, Kenji, Ishibashi and Hamada have friendship endings; Tama's last step is familiarity with a cat.

Eric is the player, so has no bond with himself. This covers all ten named non-player characters in Everyone. Unnamed workers/passengers, voice aliases, removed speakers and undeveloped wider-cast placeholders such as Goro and Kanae do not gain invented routes here.

### Mio: leaving a working server alone

Revision needed under #357. The built scenes below remain an account of the game. The unbuilt plan predates her current personality in [People](#mio-mio). Rewrite it before adding scenes. Her desire for privacy and time to play games must matter.

Route: B2 machine room, then the sea terrace; no club. She wants an afternoon away without leaving a fault for someone else. Her habit of carrying every failure onto her own list keeps her close to Eric at work and hard to meet elsewhere. Continue [Mio notices](stories/mio-notices.md); the shared reveal's witnesses and timing belong to the days 3–5 outline. Her route never investigates the magic's origin.

Built repeat meeting: weekday lunch in B2 from day five until step 3 is complete; later weekday lunches place her at an east-coast bench. Sunday terrace visits and steps 4–5 remain plans, with no new promise in the playable lunch scenes.

| Step | Milestone and consequence |
|---|---|
| 0 | A woman on the train protecting her laptop and lunch bag. Eric has not introduced himself. |
| 1 | Their train introduction, or a later B2 greeting if needed. She remembers whether he caught the bag. |
| 2 | At lunch she leaves a space beside the server rack and lets him stay while she eats. Repeated gifts do not manufacture a new lunch scene. |
| 3 | Built: the player can check the visible front intake while Mio goes out to eat. She hands over her checklist, returns for the marked row and accepts the help. This is one ordinary intake check, not a repair or resolution of the held sender record. |
| 4 | On the terrace her work phone rings. The call is a routine request; Eric can wait while she redirects it or offer to head back with her. She redirects it herself and stays. Her later terrace visits stop opening with a server report. |
| 5 | She invites him back with food from her mother and asks what he actually wants to do with their afternoon. They choose an outing as friends or explicitly call it a date. She brings enough for two on subsequent invitations. |

The built step-2 and step-3 offers use B2’s ordinary Talk action at weekday lunch. “Another time” preserves the opportunity and the period. Step 2 uses the existing Friendly threshold; step 3 uses the existing Trusted readiness gate and does not require seeing step 2 first. Completion records its memory and moves to the afternoon once, without adding bond points. Continue replays the current scene from its saved entry staging; the completion, relationship gate and post-period world are saved together. Shared Chat remains available afterward.

### Mori: something he can leave unfinished

Route: art club in `dorm_commons`, with B2 lunches as early contact. He wants to draw the mainland ski jump he remembers, but turns every art session into sharpening pencils and making tea for everyone else. The old manager has kept the habit of making himself useful before taking a seat.

Repeat meeting: Tuesday evening art club. His first reference is his own 1994 photograph; seeing it here establishes it before any later callback. It is a scene prop, not an album collectible. The common-room first-page and later tea/shared-pencil scenes now play at the existing friendship gates; repeated visits preserve his progress and let the player continue their own drawing. Later milestones remain authored plans.

| Step | Milestone and consequence |
|---|---|
| 0 | The older colleague beside B2's copier. |
| 1 | His B2 welcome and introduction; he makes room for Eric at the desk. |
| 2 | He shows Eric the photograph while trying to fit the slope onto a page. Eric can recognise the place or ask him to demonstrate the jump again. |
| 3 | Everyone has a sharp pencil and his own page is still blank. Eric offers to pour the next tea or sits beside him to draw. Mori starts the jump's outline and leaves the cups for someone else. |
| 4 | The club asks which work to hang. Mori reaches for somebody else's finished picture; Eric asks about his unfinished slope. Mori chooses to hang it with the empty foreground visible and signs his own name. |
| 5 | He brings two sheets to a coastal sketching meeting and gives Eric the better seat. They draw separately and compare what each left out. Later art sessions include Mori's own drawing alongside the tea. |

### Kenji: finishing the part he promised

Route: karaoke club, through the booth and B2. He wants to host an evening people enjoy, but keeps adding songs and equipment tricks before checking that anything works. His broken-chair history stays a personal debt, rather than becoming an endless series of rescue jobs.

Repeat meeting: Wednesday evening karaoke, with weekday B2 contact. The chair and melon-soda preferences remain in his People entry above. Kotodama knowledge only follows witnessed scenes; his relationship scenes work without the day-5 reveal.

| Step | Milestone and consequence |
|---|---|
| 0 | The junior colleague borrowing furniture. |
| 1 | He introduces himself at B2 and owns up to the borrowed chair. |
| 2 | He asks Eric to listen while he tries the opening of a song, then starts again in the right key. The player can listen without singing. |
| 3 | Kenji's growing queue has displaced another member's one request. Eric points out the missing song or offers to help put the queue back. Kenji deletes his own extras and asks the member to choose again. |
| 4 | At the next hosting evening, a microphone cuts out. Eric can offer the spare or wait. Kenji passes over the working microphone, keeps the evening going and labels the faulty one afterwards. The player is no longer required to finish his hosting work. |
| 5 | Kenji chooses a song with an easy shared chorus and asks Eric to join or just sit beside him. Both choices finish the friendship scene. Later he leaves one open slot in his queue for Eric without selecting for him. |

### Emi: joining without running it

Route: swimming club at the seasonal pool session, then the gym's winter meetings. She wants a regular evening with people who can see her without bringing a budget request. She is good at organising, so people keep letting her do it, including herself.

Repeat meeting: Saturday evening swimming club; weekdays at B2 for brief contact. Winter milestones concern the club's next-season plans and conditioning; actual lengths wait for the pool's next opening. None requires catching the one October swim.

| Step | Milestone and consequence |
|---|---|
| 0 | The absent team lead whose parts meeting is keeping her upstairs. |
| 1 | Her B2 introduction after the budget meeting. |
| 2 | At a club meeting she asks Eric to sit beside her while someone else explains the plan. She leaves her work bag under the bench. |
| 3 | The group hands her the winter booking sheet by habit. Eric can offer to ask another member or ask which exercise she wanted to join. She names a volunteer, hands over the sheet and joins the session. |
| 4 | The volunteer chooses a different session order. Emi starts correcting it, then asks for the spare mat instead. Eric can join her or watch; she finishes a session somebody else arranged. |
| 5 | She asks him to get supper after the meeting, with their work phones put away. They settle whether this is their regular meal as friends or a date. Later invitations come from her as a member, without a club job attached. |

### Ishibashi: someone to sit with on a break

Route: Honsha station desk and the sheltered bench outside; no club. He wants his short break undisturbed but keeps finding reasons to check the entrance. Eric becomes someone with whom he can sit without converting the visit into another inspection.

Repeat meeting: station lunch break. The station attendant covers the desk during these scenes; Eric never takes security duty. The cat may be elsewhere, so her presence cannot be a scene prerequisite.

| Step | Milestone and consequence |
|---|---|
| 0 | A guard behind a gate Eric cannot yet pass. |
| 1 | Eric greets him properly; the guard checks the card and introduces himself when Eric asks his name. |
| 2 | He leaves a clear place on the bench beside his lunch. Eric can sit; the guard's spare cat bowl stays under the bench. |
| 3 | He interrupts his own lunch to check an arrival already being handled by the attendant. Eric offers to wait. Ishibashi looks back, sees the attendant wave them through and sits down again. |
| 4 | Rain reaches the bench. He asks Eric to hold his lunch while he moves the cat bowl under cover, then invites Eric into the shelter. For once he directly names what the bowl is for. |
| 5 | He brings two cups for their break and tells Eric which seat stays dry. Later lunch visits begin with that seat available; Tama may or may not join them. |

### Hamada: keeping his own place in the evening

Route: karaoke club, with the bakery and station as early contacts. He wants to sing a particular long song to the end. He habitually offers his turn to somebody else, then apologises when the room booking ends. His accountancy is ordinary work; this is not a financial mystery.

Repeat meeting: Wednesday evening karaoke. He shares the venue with Kenji, but his milestone never requires Kenji's bond or hosting scene; another member can run the queue.

| Step | Milestone and consequence |
|---|---|
| 0 | A sleeping passenger Eric has not spoken to. |
| 1 | Eric wakes him on the train or greets him later at the bakery; he supplies his name. |
| 2 | He shows Eric the song number he wrote on the back of a bakery receipt. Their next greeting can recall that song. |
| 3 | His turn comes and he offers it away again. Eric can ask to hear his song or point to his number on the screen. Hamada keeps the microphone and starts. |
| 4 | A late arrival interrupts the instrumental break to ask for another song. Eric can wait or indicate that Hamada is still singing. Hamada asks the newcomer to wait, then finishes the last verse. |
| 5 | He books another evening and asks Eric which song should follow his. Eric may choose or just listen. Later Hamada keeps his turn and leaves a seat for Eric. |

### Kuro: being recognised away from the counter

Superseded proposal under #357. This route predates her current personality in [People](#kuro-kuro). Do not build these milestones. Rewrite them around her aggressive flirting and desire to take charge.

Route: swimming club, with reception as first contact. She wants an evening where people remember what she enjoys without asking her to find somebody or hold a bag. Her even courtesy stays; trust means letting Eric hear a direct preference without wrapping it as a service offer.

Repeat meeting: Saturday club, pool in season and gym in winter. She attends as a member and does not become the club's receptionist. Her short English exchanges remain within the language limits in her People entry.

| Step | Milestone and consequence |
|---|---|
| 0 | The receptionist Eric passes in the lobby. |
| 1 | Their reception exchange, or her club introduction if he never stopped at the counter. |
| 2 | She remembers his name at the club and asks which seat he wants while keeping her own beside the window. |
| 3 | A member asks her to sort the spare equipment while she is choosing an activity. Eric can point them to the store cupboard or wait for her reply. Kuro tells them where it is and joins the activity she chose. |
| 4 | Someone offers to book everyone into the same session next week. She tells Eric privately that she dislikes it, then voices her own choice to the group. Eric can join her choice or keep his; both preserve their plans to talk afterwards. |
| 5 | She invites him for a walk after club and asks him to choose a place that is open after her shift. They make a friendship plan or a date. Her later greetings recall what they did outside reception. |

### Aoi: choosing an assignment she can stand behind

Route: tennis club, plus the training-centre frontage. Her assignment is in her People entry. She wants to be trusted to make a booking that someone else will actually use, while fearing that asking a basic question will confirm she is the newest person in the room.

Repeat meeting: Sunday evening tennis; weekday lunch at the plaza for short work follow-ups. Booking discussions stay at the frontage or board, so this route needs no training-office interior.

| Step | Milestone and consequence |
|---|---|
| 0 | Eric overheard a woman on her phone. This alone earns no introduction or bond. |
| 1 | At the board she gives her name, explains her assignment and takes the tennis slip. If missed, her first court greeting covers those facts. |
| 2 | She asks Eric to hit a few balls and keeps the racket between turns. She greets him as someone who plays with her. |
| 3 | She has agreed to book next week's practice but cannot tell which slot leaves time for beginners. Eric can read the posted durations with her or suggest asking Rei. Aoi asks the club directly and makes the booking herself. |
| 4 | Experienced members want to use the whole booking. Eric can stay beside her or take his place on court. Aoi keeps the beginner portion she promised and tells them when their game starts. |
| 5 | She books a slot because she wants to play and invites Eric first. He can accept as her regular practice friend or ask to go out afterwards as a date. Her next invitation names something she wants, with no assigned errand attached. |

### Rei: playing a game she could lose

Superseded proposal under #357. This route predates her current personality in [People](#rei-rei). Do not build these milestones. Rewrite them around her abrasive leadership and weaknesses that persist beyond the first disagreement.

Route: tennis club and the sea terrace. She enjoys competitive doubles and wants a partner who can disagree with her. At work she can steer an uncertain conversation toward an easy yes; on court she does the same by explaining every shot until the other person stops choosing.

Repeat meeting: Sunday evening tennis, with later terrace conversations immediately after the session. She keeps her other doubles partners and work commitments as Eric's bond grows.

| Step | Milestone and consequence |
|---|---|
| 0 | A player Eric can see practising. Hidden day-1 figures and hypothetical day-2 encounters count for nothing. |
| 1 | She introduces herself courtside and offers the spare racket. |
| 2 | She remembers whether Eric asked for a serve demonstration or played with Aoi. With neither history, she asks what he wants to try today. |
| 3 | She takes over Eric's side of a doubles drill after explaining it. He can ask for another try or ask her to cover only her half. She stays on her side and lets his return miss. Then she asks him where he wanted the next ball. |
| 4 | They disagree about the next play. Eric can propose his idea or ask hers; Rei gives him the deciding call and plays it. The staged rally can go badly without losing the milestone. Afterwards she asks to play with him again. |
| 5 | On the terrace she asks whether he wants another Sunday game or an evening together away from tennis. He can choose regular friendship or make the latter a date. Later practice retains her competitiveness while giving him room to choose. |

### Tama: a place she chooses to return to

Route: station bowl, dorm courtyard and B2 chair; no club. She wants warmth, food and a way out. Eric becomes familiar by making space and letting her leave. Her monorail trips continue; the route never turns her into Eric's possession or a magical informant. Continue [Tama](stories/tama.md).

Repeat meeting: station in the morning, dorm court in the evening. Later scenes use the cat's next eligible appearance, never a search across the map. Cat-specific authored interactions use the ordinary bond limits; there are no speech, gift or obedience requirements.

| Step | Milestone and consequence |
|---|---|
| 0 | A cat passing through. Seeing her does not make her Eric's acquaintance. |
| 1 | Eric crouches or pets her when offered; the guard supplies her name if he has not heard it. |
| 2 | She stays on the chair while he sits nearby. He can wait or use another seat. |
| 3 | At the dorm bench she approaches, then pauses at his bag. Eric moves it or moves himself; she jumps onto the space she chose. |
| 4 | During a shower she comes under the station shelter beside him. He leaves the exit clear; when the rain stops she leaves, then rubs against his leg on the way past. |
| 5 | At the dorm courtyard she joins him without food being offered and settles against his shoe. He can stay or gently get up. Later appearances may include her greeting him; she still leaves whenever she wants. |

## Names on screen

The name plate is the name above their lines; the label is the name over them in the world; the People panel is where people Eric has met are listed. "none" means there isn't one.

Kuro, Aoi and Rei join the People panel when their authored introductions complete. Older saves with those introduction flags recover their cards and met status on load, preserving their existing points.

Each People panel card has the name and one line about them, the same on every day, in every place and after a load (code: game3d/story/people.js, loaded with the game; #223).

| Id | Name plate | Label over them | People panel |
|---|---|---|---|
| `eric` | Eric | none | none |
| `mio` | Mio | Mio | Mio |
| `mori` | Mr. Mori | Mr. Mori | Mr. Mori |
| `kenji` | Kenji | Kenji | Kenji |
| `emi` | Emi | Emi | Emi |
| `guard` | Guard | Guard | The guard |
| `kuroda` | Man from the train | Man from the train | Mr. Hamada |
| `kuro` | Receptionist | Receptionist | Kuro |
| `aoi` | Aoi | Woman on her phone | Aoi |
| `rei` | Tennis player, then Rei after her introduction | Tennis player, then Rei | Rei |
| `tama` | none | Cat | none |
| `canteen_worker` | Canteen worker | Canteen worker | none |
| `station_worker` | Grounds worker | Grounds worker | none |
| `attendant` | Attendant | Attendant | none |
| `member` | Club member | Club member | none |
| `bun` | Woman with a bun | Woman with a bun | none |
| `music` | Girl with headphones | Girl with headphones | none |
| `stander` | Man with a bag | Man with a bag | none |
| `reader` | Man with a book | Man with a book | none |
| `commuter` | Office worker | none | none |
| `worker_a` | Office worker | Office worker | none |
| `worker_b` | Office worker | Office worker | none |
| `commuter_1` | Office worker | Office worker | none |
| `commuter_2` | Office worker | Office worker | none |
| `commuter_3` | Office worker | Office worker | none |
| `sales1` | Man from Sales | none | none |
| `sales2` | Woman from Sales | none | none |
| `ann` | Announcement | none | none |
| `gatev` | The gate | none | none |
| `miotext` | Mio | none | none |

### Where a name changes

| Id | Place | Name plate | Label over them |
|---|---|---|---|
| `mio` | train | Mio | Woman with a laptop (while `!mio_named`), else Mio |
| `kuroda` | train | Sleeping man | Sleeping man |
| `tama` | gate | none | Tama |

On the train Mio's lines are headed "Woman with a laptop" until she says her name.

Day 3: Kuro's name plate and label stay "Receptionist" until `d3_kuro_intro`; Aoi's stay "Woman from the train" until `d3_aoi_intro`. Their own names appear after they introduce themselves, including on later visits and Continue. Rei is "Tennis player" throughout day 3; her proper introduction belongs to day 4. The guard is "Guard", including on the platform, and ticket T-0003 calls him "The guard, Honsha station". These story introductions are independent of the engine's `met_*` flags.

## What they like

Gifts on day 1 are drinks from the vending machine ([systems.md](systems.md), Gifts). "Expects" is the Japanese they want from Eric: `casual` or `polite`. "Gets on with" is one way: `likes`, `owes` or `rivals`.

| Id | Likes | Dislikes | Expects | Gets on with |
|---|---|---|---|---|
| `mio` | coffee | cornsoup, tea | casual | mori (likes) |
| `mori` | cornsoup | none | polite | mio (likes) |
| `kenji` | melon | none | casual | mori (likes), mio (owes) |
| `guard` | none | none | polite | none |
| `kuroda` | none | none | polite | guard (owes) |
| `kuro` | none | none | polite | none |
| `emi` | none | none | none | none |

## Portraits

The faces each person can show beside the text box: `game3d/assets/portraits/<id>-<face>.webp`. Anyone not listed shows only a name plate. Which of these are approved: [art-and-sound.md](art-and-sound.md).

| Id | Faces |
|---|---|
| `eric` | neutral, surprised, tired |
| `mio` | neutral, smile, deadpan, surprised, embarrassed, tired, phone |
| `mori` | neutral, smile, flustered |
| `kenji` | neutral, grin, sheepish |
| `emi` | neutral |
| `guard` | neutral, stern, amused |
| `kuroda` | neutral, sleepy, panicked |
| `kuro` | neutral |
| `aoi` | neutral |
| `rei` | neutral |

Mio's `phone` face is her looking down at her phone, a dialogue portrait of its own (Jørgen asked for it instead of a timed phone icon). Approved 2026-09-29 (reviews/mio-phone-5).

## In the code, in no storyline

People the engine defines that no storyline uses.

| Id | What it is | Why it's there |
|---|---|---|
| `yui` | A speaker and a hidden figure at the B2 copier (to remove). | Left from before the B2 team was settled; the office no longer has them (game3d/story/REQUESTS.md, done). |
| `sota` | A speaker and a hidden figure at the B2 coffee machine (to remove). | Same. |
| `nao` | A speaker and a hidden figure at a B2 desk (to remove). | Same. |
| `hiro` | A speaker and a hidden figure at a B2 desk (to remove). | Same. |
| `kanae` | A speaker only. | Added for an earlier day-1 draft; nothing uses it now. Kanae is in the wider cast (bible). |
| `reitext` | A speaker only: Rei's text messages. | Added for an earlier day-1 draft; nothing uses it now. |

## Open questions for Jørgen

1. Nobody says the guard's or Mr. Hamada's name out loud. The game calls them "Guard" and "Man from the train" on screen, and "The guard" and "Mr. Hamada" in the People panel (Hamada's name is only on the crackers card and in Mori's 浜田さん). Should the player learn their names, and when?
2. The cat is labelled "Tama" at the gate and "Cat" on the train and in the office. Nobody tells Eric her name, though her name is the first in the visitor book.
3. In the office, Mio's afternoon spot is `emi_seat` and the game's `mio_seat` is the same chair: Mio and Emi share one desk. Is that meant?

## Everyday conversations

Shared Chat is available alongside the place’s story Talk for the nine named cast entries in `game3d/story/conversations/`. Ordinary subjects, optional known-word replies and repeat responses survive later weeks. Kuro, Aoi and Rei keep their canonical introduction boundaries; their names are not revealed by the engine’s earlier meeting flag. Working mornings can defer a chat without discarding it. These conversations record personal knowledge and preferences, but do not award unplayed activities or relationship milestones. The cross-character word connections and catch-up lessons are documented in [language progression](language-progression.md).
