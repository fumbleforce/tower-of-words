// Place 3: IT support on B2. Mori, Kenji, Mio, the copier repair, the lunch choice, one gift, and Mio's question.
// The work day ends on a new repair request with Eric's name on it; then he takes the lift up and walks home. See STORY.md and VOICE.md.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    mio: { name: 'Mio', role: 'programmer' },
    mori: { name: 'Mr. Mori', role: 'IT support' },
    emi: { name: 'Emi', role: 'B2 team lead' },
    kenji: { name: 'Kenji', role: 'IT support' },
  },

  schedule: {
    // upstairs all day; after her 17:40 visit she stays at her desk in her office (scenes/office-emi.js)
    emi: { evening: { sit: 'emi_seat' }, '*': { hide: true } },
    aoi: { '*': { hide: true } },
    rei: { '*': { hide: true } },
    // morning: inside the machine room, behind its shut door (the door scene shouts through it), not in the corridor
    mio: { morning: { at: 'racks' }, lunch: { at: 'racks', if: 'machine_open' }, afternoon: { sit: 'mio_seat' }, evening: { at: 'mio_by_desk', if: '!going_home' } },
    mori: { lunch: { at: 'kitchen_table' }, afternoon: { at: 'chief_desk' }, evening: { hide: true } },
    kenji: { evening: { hide: true } },
  },

  ambient: [
    { id: 'kenji_mori', who: ['kenji', 'mori'], period: 'afternoon', lines: [
      { say: 'kenji', emo: 'curious', text: '森さん、新しい人、どうですか。', overheard: true },
      { say: 'mori', emo: 'warm', text: '礼儀正しい人ですよ。', overheard: true },
      { do: 'look', who: 'mori', at: 'eric' },
    ] },
  ],

  bonds: {},

  start: 'office_in',

  on: {
    'talk:mori': [
      { if: '!greeted_mori', node: 'mori_wait' },
      { if: 'lunch_mori && afternoon_on && !mori_echo', node: 'mori_irete_echo' },
      'mori_again',
    ],
    'talk:kenji': [{ if: '!kenji_intro', node: 'kenji_first' }, 'kenji_again'],
    'talk:mio': [
      { if: 'evening_on', node: 'ending' },
      { if: '!got_ticket && chair_back', node: 'ticket' },
      { if: 'copier_done && !ticket_closed', node: 'ticket_done' },
      { if: 'lunch_mio && afternoon_on && !mio_echo', node: 'mio_tomatte_echo' },
      { if: 'got_ticket && !copier_done', node: 'mio_copy_room' },
      'mio_busy',
    ],
    'talk:machine_door': [{ if: '!kenji_intro', node: 'kenji_first' }, { if: '!machine_open && knocked', node: 'mio_opens' }, { if: '!machine_open', node: 'machine_door' }, 'machine_walk_in'],
    'zone:machine_room': { if: 'machine_open', node: 'machine_in', once: true },
    'talk:my_chair': [{ if: '!chair_back && found_chair', node: 'chair_push' }, 'noop'],
    'talk:copier': [{ if: 'got_ticket && !copier_done', node: 'copier' }, 'copier_look'],
    'zone:copy_room': { if: 'got_ticket && !copier_done', node: 'copier', once: true },
    'talk:my_desk': [
      { if: '!kenji_intro', node: 'kenji_first' },
      { if: 'afternoon_on && !evening_on', node: 'work_afternoon' },
      'desk_look',
    ],
    // while the first can is stuck the machine takes no new order: 動いて gets the one already paid for
    'talk:vending': [{ if: 'vend_stuck', node: 'vend_still_stuck' }, 'vending'],
    // the cat moves the chair scene along: petting her sends the chair home with her on it (Jørgen, 2026-10-04: "make
    // the cat be the one that moves the scene along"); the chair's own Push still does the same
    'talk:tama': [{ if: '!chair_back && found_chair', node: 'chair_push' }, 'tama'],
    'talk:inout_board': 'inout_board',
    'talk:covered': 'covered',
    'talk:stairs': 'stairs',
    'talk:lift': { if: 'going_home', node: 'go_home' },

    // greetings
    'say:ohayo:mori': [{ if: '!greeted_mori', node: 'ohayo_mori' }, 'greet_again_mori'],
    'say:yoroshiku:mori': [{ if: '!greeted_mori', node: 'yoroshiku_mori' }, 'greet_again_mori'],
    'say:sumimasen:mori': 'sumimasen_mori',
    'say:ohayo:kenji': [{ if: '!greeted_kenji', node: 'ohayo_kenji' }, 'greet_again_kenji'],
    'say:yoroshiku:kenji': [{ if: '!greeted_kenji', node: 'yoroshiku_kenji' }, 'greet_again_kenji'],
    'say:sumimasen:kenji': 'sumimasen_kenji',
    'say:ohayo:mio': 'ohayo_mio',
    'say:yoroshiku:mio': 'yoroshiku_mio',
    'say:sumimasen:mio': 'sumimasen_mio',
    'say:ohayo:tama': 'tama_ohayo',

    // commands
    'say:akete:machine_door': [{ if: '!machine_open', node: 'akete_machine' }, 'akete_open_door'],
    'say:ugoite:copier': [{ if: 'got_ticket && !copier_done', node: 'copier' }, 'ugoite_copier_again'],
    'say:ugoite:vending': [{ if: 'vend_stuck', node: 'vend_ugoite' }, 'vend_ugoite_idle'],
    'say:ugoite:coffee_machine': { node: 'ugoite_coffee', once: true },
    'say:matte:clock': 'matte_clock',
    'say:irete:kettle': 'irete_kettle',
    'say:tomatte:fan': 'tomatte_fan',

    // the gift moment
    'give:coffee:mio': [{ if: 'gifted_mio', node: 'gift_again', keep: true }, 'gift_mio_coffee'],
    'give:*:mio': [{ if: 'gifted_mio', node: 'gift_again', keep: true }, 'gift_mio_other'],
    'give:cornsoup:mori': [{ if: 'gifted_mori', node: 'gift_again', keep: true }, 'gift_mori_cornsoup'],
    'give:*:mori': [{ if: 'gifted_mori', node: 'gift_again', keep: true }, 'gift_mori_other'],
    'give:melon:kenji': [{ if: 'gifted_kenji', node: 'gift_again', keep: true }, 'gift_kenji_melon'],
    'give:*:kenji': [{ if: 'gifted_kenji', node: 'gift_again', keep: true }, 'gift_kenji_other'],
  },

  // afternoon: both can be talked to and given a drink (cold playtest 2026-09-30: the soup for Mori had no way to him)
  show: { mori: '!greeted_mori || afternoon_on', mio: '(chair_back && !got_ticket) || (copier_done && !ticket_closed) || afternoon_on' },
  goal: {
    mio: '(chair_back && !got_ticket) || (copier_done && !ticket_closed)',
    mori: '!greeted_mori',
    kenji: 'greeted_mori && !kenji_intro',
    machine_door: 'kenji_intro && !machine_open',
    tama: 'found_chair && !chair_back',
    copier: 'got_ticket && !copier_done',
    vending: 'vend_stuck',
    my_desk: 'afternoon_on && !evening_on',
    lift: 'going_home',
  },
  labels: { my_chair: 'Your chair', my_desk: 'Your desk', vending: 'Vending machine', covered: 'A covered desk' },

  nodes: {
    noop: [],

    // ================================================================== MORNING
    office_in: [
      { do: 'hold', who: 'mori' },   // he stays with Mori until lead_in lets go
      { do: 'period', to: 'morning' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { say: 'mori', face: 'smile', emo: 'polite', text: '{ohayo}。森と申します。ITサポートへ、ようこそ。', overheard: true, clear: ['IT'] },
      { do: 'bow', who: 'mori', depth: 'deep' },
      { do: 'goal', text: 'Greet Mr. Mori.' },
    ],
    mori_wait: [{ do: 'bow', who: 'mori' }],
    yoroshiku_mori: [
      { set: 'greeted_mori' },
      { do: 'meet', who: 'mori' },
      { do: 'bond', who: 'mori', add: 1 },
      { say: 'mori', face: 'smile', emo: 'warm', text: 'こちらこそ、{yoroshiku}。', overheard: true },
      { do: 'bow', who: 'eric' },
      { do: 'bow', who: 'mori', depth: 'deep' },
      { do: 'emote', who: 'mori', kind: '♪' },
      { go: 'lead_in' },
    ],
    ohayo_mori: [
      { set: 'greeted_mori' },
      { do: 'meet', who: 'mori' },
      { say: 'mori', emo: 'polite', text: 'はい、{ohayo}。', overheard: true },
      { wait: 1400 },
      { do: 'emote', who: 'mori', kind: '…' },
      { do: 'bow', who: 'mori' },
      { go: 'lead_in' },
    ],
    // Mori shows him in: an open hand toward the office, and to the desk islands
    lead_in: [
      { do: 'cam', back: true },
      { do: 'gesture', who: 'mori', kind: 'point' },
      { do: 'face', who: 'mori', to: 'office_door' },
      { say: 'mori', emo: 'polite', text: 'どうぞ、こちらへ。', overheard: true },
      { do: 'walk', who: 'mori', to: 'chief_desk', wait: false },
      { do: 'hold' },
      { do: 'goal', text: 'Meet the man at the desks.' },
    ],
    greet_again_mori: [{ do: 'bow', who: 'mori' }],
    sumimasen_mori: [
      { do: 'face', who: 'mori', to: 'eric' },
      { if: 'got_ticket && !copier_done', then: [{ do: 'gesture', who: 'mori', kind: 'point' }, { do: 'face', who: 'mori', to: 'copier' }], else: [{ do: 'emote', who: 'mori', kind: '?' }] },
    ],
    mori_again: [{ do: 'face', who: 'mori', to: 'eric' }, { do: 'bow', who: 'mori' }],
    // after lunch with him, he tries the word on his own cup, and nothing happens
    mori_irete_echo: [
      { set: 'mori_echo' },
      { do: 'face', who: 'mori', to: 'cups' },
      { say: 'mori', emo: 'whisper', text: '…{irete}。', overheard: true },
      { wait: 900 },
      { do: 'face', who: 'mori', to: 'eric' },
      { say: 'mori', face: 'smile', emo: 'amused', text: 'やっぱり、だめですね。', overheard: true },
    ],

    // ------------------------------------------------------------------ Kenji and the chair
    kenji_first: [
      // from the machine-room door he'd be talking across the floor and through a wall: go over to him first
      { do: 'walk', who: 'eric', to: 'kenji_desk', wait: true },
      { set: 'kenji_intro' },
      { do: 'meet', who: 'kenji' },
      { do: 'face', who: 'kenji', to: 'eric' },
      { say: 'kenji', face: 'grin', emo: 'bright', text: 'あ！新しい人！', overheard: true },
      { say: 'kenji', face: 'grin', emo: 'excited', text: "{mc.name}-san? I am Kenji! Two months here, so now I am not the newest. Ah, sorry, your chair... I borrowed it. Mine is broken." },
      { do: 'gesture', who: 'kenji', kind: 'point' },
      { do: 'face', who: 'kenji', to: 'machine_door' },
      { say: 'kenji', face: 'grin', emo: 'bright', text: "I bring it back for you! It's in machine room, with the cat. Norway has the big forest cats, right? I see on YouTube, they are so big, like..." },
      { say: 'kenji', face: 'sheepish', emo: 'sheepish', text: "...Ah, no. Mio-san says I can't go in machine room anymore. Sorry! You go?" },
      { do: 'goal', text: 'Get your chair back from the machine room.' },
    ],
    kenji_again: [
      { if: 'chair_back && !kenji_talked', then: [
        { set: 'kenji_talked' },
        { say: 'kenji', face: 'sheepish', emo: 'sheepish', text: "Chair is okay? If you need anything, I help! Cables, printer, um... I know where is the good tape. My English is very little, but." },
        { choice: [
          { text: '“Mine\'s worse. My Japanese, I mean.”', go: 'kenji_small' },
          { text: 'Pat the chair', go: 'kenji_pat' },
        ] },
      ], else: [
        { if: 'chair_back', then: [{ do: 'emote', who: 'kenji', kind: '♪' }], else: [{ say: 'kenji', emo: 'sheepish', text: "Machine room. Chair. Cat. Sorry!" }] },
      ] },
    ],
    kenji_small: [
      { say: 'kenji', face: 'grin', emo: 'laugh', text: "Ha! Okay, okay. Then we practise together. Same team!" },
      { do: 'gesture', who: 'kenji', kind: 'highfive' },
      { set: 'kenji_laughed' },
    ],
    kenji_pat: [
      '> You pat the chair. Kenji pats his desk, very seriously.',
    ],
    ohayo_kenji: [
      { set: 'greeted_kenji' },
      { say: 'kenji', face: 'grin', emo: 'laugh', text: 'かたっ！おはよう、でいいよ。', overheard: true },
      { say: 'kenji', face: 'grin', emo: 'bright', text: 'おはよう。', overheard: true, clear: [{ ja: 'おはよう', ro: 'ohayō', en: 'morning (casual)' }] },
      { if: '!kenji_intro', then: [{ go: 'kenji_first' }] },
    ],
    yoroshiku_kenji: [
      { set: 'greeted_kenji' },
      { say: 'kenji', face: 'grin', emo: 'bright', text: 'よろしく！', overheard: true, clear: [{ ja: 'よろしく', ro: 'yoroshiku', en: 'nice to meet you (casual)' }] },
      { do: 'gesture', who: 'kenji', kind: 'fistbump' },
      { if: '!kenji_intro', then: [{ go: 'kenji_first' }] },
    ],
    greet_again_kenji: [{ do: 'emote', who: 'kenji', kind: '♪' }],
    sumimasen_kenji: [{ say: 'kenji', emo: 'curious', text: 'え、何？大丈夫？', overheard: true }, { do: 'emote', who: 'kenji', kind: '?' }],

    // one knock: she comes to the door, opens it, and he goes in (cold playtest 2026-09-30: she said she was coming
    // and never came, and nothing showed the way in)
    machine_door: [
      { say: 'mio', emo: 'shout', text: "Mm, one minute!" },
      { set: 'knocked' },
      { call: 'mio_opens' },
    ],
    mio_opens: [
      { do: 'walk', who: 'mio', to: [4.45, -0.55] }, // just inside the door, clear of its leaf
      { do: 'machineDoor', state: 'open' },
      { say: 'mio', emo: 'hurried', text: "Okay, okay, I'm coming... Come in. You're the hardware person, so, okay, but ask me before you touch anything. They're weird in ways that aren't written down." },
      { set: 'machine_open' },
      { do: 'walk', who: 'mio', to: 'racks', wait: false },
      { call: 'machine_walk_in' },
    ],
    machine_walk_in: [{ do: 'walk', who: 'eric', to: [5.0, -1.2] }], // a few steps into the machine room
    akete_open_door: ['> The door is already open.'],
    akete_machine: [
      { do: 'machineDoor', state: 'open' },
      { do: 'kotodama', target: 'machine_door' },
      { do: 'emote', who: 'mio', kind: '…' },
      { say: 'mio', face: 'deadpan', emo: 'deadpan', text: "...That door has a card reader, you know." },
      { set: 'machine_open' },
      { set: 'door_magic' },
      { call: 'machine_walk_in' },
    ],
    machine_in: [
      { set: 'found_chair' },
    ],
    chair_push: [
      { do: 'chairRoll', to: 'my_seat' },
      { set: 'chair_back' },
      { do: 'walk', who: 'mio', to: [0.75, -2.1] }, // beside Eric, clear of where the returned chair leaves him
      { do: 'face', who: 'mio', to: 'eric' },
      { do: 'face', who: 'eric', to: 'mio' },
      { do: 'cam', on: 'mio', zoom: 1.6 },
      { say: 'mio', face: 'deadpan', emo: 'dry', text: "Ah, that's your chair? Sorry. She comes with it, I think." },
      { go: 'ticket' },
    ],

    // ------------------------------------------------------------------ the ticket and the copier (動いて)
    ticket: [
      { set: 'got_ticket' },
      { do: 'meet', who: 'mio' },
      { say: 'mio', face: 'neutral', emo: 'casual', text: "Oh, and... I put your screen in English. Here, your first repair request." },
      '> REPAIR REQUEST #1. Copier, B2 copy room. Eats paper. Opened 1 April 1996.',
      { say: 'eric', face: 'surprised', emo: 'surprised', text: 'Nineteen ninety-six?' },
      { do: 'expression', who: 'eric', face: 'neutral' },
      { say: 'mio', emo: 'dry', text: "Yeah. Mori-san opened it when he was new here, I think. Nobody closes it, it's like... tradition. He can show you." },
      { say: 'mio', emo: 'shout', text: '森さん、{gaijin}にコピー機お願い。', overheard: true },
      { say: 'mori', emo: 'warm', text: '外国の方、ですよ。', overheard: true, clear: [{ ja: '外国の方', ro: 'gaikoku no kata', en: 'person from abroad, polite' }] },
      { say: 'mio', face: 'embarrassed', emo: 'embarrassed', text: "He says I should say gaikoku no kata. It's more polite. ...Anyway, go." },
      { do: 'walk', who: 'mori', to: 'copier_front', wait: false },
      { do: 'cam', back: true },
      { do: 'goal', text: 'Go to the copy room with Mr. Mori.' },
    ],
    mio_copy_room: [{ say: 'mio', face: 'neutral', emo: 'casual', text: "Copy room is across the corridor. Mori-san went ahead... probably bowing to the copier again." }],
    mio_busy: [
      { if: 'afternoon_on', then: [{ say: 'mio', face: 'tired', emo: 'tired', text: "Now people from upstairs come down to use our copier. ...Sorry, I'm busy." }, { end: true }] },
      { say: 'mio', face: 'tired', emo: 'low', text: "Mm, sorry, I'm in the middle of something." },
    ],
    // after lunch with her: her phone alarm won't stop for her
    mio_tomatte_echo: [
      { set: 'mio_echo' },
      { do: 'phone', who: 'mio', state: 'buzz' },
      { wait: 600 },
      { do: 'phone', who: 'mio', state: 'look' },
      { say: 'mio', face: 'phone', emo: 'deadpan', text: '{tomatte}. ...{tomatte}!' },
      { do: 'phone', who: 'mio', state: 'away' },
      { say: 'mio', face: 'tired', emo: 'tired', text: "Mm. Only for you, I guess." },
    ],
    copier: [
      { set: 'copier_started' },
      // the zone fires in the doorway, which is Mori's way in and out (past the paper boxes, x about -4): Eric steps
      // over to the fax, well off that line, and Mori finishes his walk to the copier (Jørgen: Mori got stuck on him
      // and walked out and back in)
      { do: 'walk', who: 'eric', to: 'fax' },
      { do: 'walk', who: 'mori', to: 'copier_front' },
      { do: 'face', who: 'eric', to: 'copier' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { do: 'copier', state: 'jam' },
      { say: 'mori', face: 'flustered', emo: 'sheepish', text: 'また食べられました…', overheard: true },
      { do: 'face', who: 'mori', to: 'copier' },
      { do: 'bow', who: 'mori' },
      { say: 'mori', emo: 'warm', text: '{ugoite}.' },
      { do: 'sound', name: 'no' },
      { do: 'gesture', who: 'mori', kind: 'shrug' },
      { do: 'face', who: 'mori', to: 'eric' },
      { say: 'mori', emo: 'slow', slow: true, text: '{ugoite}...' },
      { do: 'type', word: 'ugoite', from: 'mori', prompt: '> Mori rolls his hands like an engine turning. Try saying it to the copier.' },
      { do: 'kotodama', target: 'copier' },
      { do: 'emote', who: 'mori', kind: '!', ms: 2600 },
      { do: 'copier', state: 'run' },
      { do: 'copier', state: 'idle' },
      { do: 'face', who: 'mori', to: 'copier' },
      { say: 'mori', face: 'neutral', emo: 'whisper', text: '…三十年。', overheard: true, clear: [{ ja: '三十年', ro: 'sanjūnen', en: 'thirty years' }] },
      { do: 'face', who: 'mori', to: 'eric' },
      { do: 'gesture', who: 'mori', kind: 'finger' },
      { do: 'bow', who: 'mori' },
      { set: 'copier_done' },
      { do: 'bond', who: 'mori', add: 1 },
      { do: 'cam', back: true },
      // out through the doorway before Eric can follow into it, then on to his desk
      { do: 'walk', who: 'mori', to: 'corridor_w' },
      { do: 'walk', who: 'mori', to: 'chief_desk', wait: false },
      { do: 'goal', text: 'Tell Mio the copier is fixed.' },
    ],
    copier_look: [],
    ugoite_copier_again: [{ do: 'copier', state: 'run' }, '> It prints one blank sheet, very neatly.'],
    ticket_done: [
      { set: 'ticket_closed' },
      { say: 'eric', emo: 'tired', text: "The copier's fixed." },
      { say: 'mio', face: 'surprised', emo: 'surprised', text: "Eh? The B2 copier? Three companies came to look at it, and they all said buy a new one." },
      { say: 'eric', emo: 'dry', text: 'I asked it nicely.' },
      { do: 'emote', who: 'mio', kind: '…' },
      { say: 'mio', face: 'deadpan', emo: 'deadpan', text: "...Asked it nicely. Like the doors this morning? Okay, I'll close it. It's lunch anyway." },
      { go: 'lunch_start' },
    ],

    // ================================================================== LUNCH (the one choice)
    lunch_start: [
      { do: 'period', to: 'lunch' },
      { set: 'lunch_on' },
      '> 12:10.',
      { do: 'walk', who: 'mori', to: 'kitchen_table', wait: false },
      { say: 'mio', face: 'neutral', emo: 'casual', text: "I usually eat in the machine room. It's quiet, and nobody talks to me there." },
      { choice: [
        { text: 'Lunch with Mio, in the machine room', go: 'lunch_mio' },
        { text: 'Lunch with Mori, in the kitchenette', go: 'lunch_mori' },
      ], prompt: 'Who do you have lunch with?' },
    ],

    lunch_mio: [
      { set: 'lunch_mio' },
      // into the machine room and sat down with her, lunch in their laps (places/office.js lunchSit)
      { do: 'lunchSit', with: 'mio' },
      { do: 'cam', on: 'mio', zoom: 1.6 },
      { say: 'mio', emo: 'casual', text: "You can sit on the floor, it's warm from the servers." },
      { choice: [
        { text: '“Why B2?”', go: 'mio_b2' },
        { text: '“The doors this morning...”', go: 'mio_doors' },
        { text: 'Eat, and say nothing', go: 'mio_quiet' },
      ] },
    ],
    mio_b2: [
      { say: 'mio', face: 'tired', emo: 'tired', text: "Upstairs you have to bow to everybody all day, it's so tiring. Down here it's just me and the servers." },
      { say: 'mio', face: 'smile', emo: 'fond', text: "They're from the nineties. If I don't watch them, they just... die." },
      { say: 'mio', face: 'deadpan', emo: 'dry', text: "And the company won't buy new ones, ever. I'm a programmer, actually, I just ended up knowing them. So now you're here, and maybe I can write code again." },
      { go: 'mio_lunch_end' },
    ],
    mio_doors: [
      { say: 'mio', face: 'deadpan', emo: 'low', text: "Mm. The station asked me already, so I said it's the sensor." },
      { say: 'mio', emo: 'low', text: "It's probably the sensor." },
      { go: 'mio_lunch_end' },
    ],
    mio_quiet: [
      { inc: 'mio_warm' },
      '> After a while she pushes the pickles toward you, without looking.',
      { go: 'mio_lunch_end' },
    ],
    mio_lunch_end: [
      { do: 'cam', back: true },
      { do: 'bond', who: 'mio', add: 3 },
      { call: 'mio_bond' },
      { go: 'lunch_end' },
    ],
    mio_bond: [
      { set: 'mio_bond_done' },
      { do: 'cam', on: 'mio', zoom: 1.6 },
      { do: 'rackAlarm', state: 'on' },
      { do: 'sound', name: 'beep' },
      { say: 'mio', face: 'tired', emo: 'groan', text: "No, no, not now..." },
      { do: 'face', who: 'mio', to: 'eric' },
      { say: 'mio', face: 'neutral', emo: 'curious', text: "Wait. You try it. {tomatte}, it means stop. ...I want to see something." },
      { say: 'mio', emo: 'slow', slow: true, text: '{tomatte}...' },
      { do: 'type', word: 'tomatte', from: 'mio', prompt: '> Mio holds a flat palm over the rack alarm. Try saying it to the rack.' },
      { do: 'kotodama', target: 'racks' },
      { do: 'rackAlarm', state: 'off' },
      { if: 'mio_warm >= 1', then: [{ say: 'mio', face: 'embarrassed', emo: 'embarrassed', text: "...Okay. You can eat here tomorrow also, if you want." }], else: [{ say: 'mio', face: 'deadpan', emo: 'low', text: 'Huh. Okay.' }] },
      { do: 'cam', back: true },
    ],

    lunch_mori: [
      { set: 'lunch_mori' },
      // to the kitchenette table with him, lunch on the table (places/office.js lunchSit)
      { do: 'lunchSit', with: 'mori' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { say: 'mori', face: 'smile', emo: 'bright', text: 'ノルウェーから、ですね。私、1994年にリレハンメルへ行きました。', overheard: true, clear: [{ ja: 'ノルウェー', ro: 'noruwē', en: 'Norway' }, '1994', { ja: 'リレハンメル', ro: 'Rirehanmeru', en: 'Lillehammer' }] },
      { do: 'gesture', who: 'mori', kind: 'skijump' },
      { choice: [
        { text: 'Mime the ski-jump landing', go: 'mori_landing' },
        { text: 'Pour his tea for him', go: 'mori_pour' },
      ] },
    ],
    mori_landing: [
      '> You stick the landing. He claps three small claps, and you both laugh.',
      { go: 'mori_cups' },
    ],
    mori_pour: [
      '> You fill his cup before your own.',
      { do: 'bow', who: 'mori' },
      { go: 'mori_cups' },
    ],
    mori_cups: [
      '> There are seven cups on the tray behind him. Three of them are dusty.',
      { do: 'cam', back: true },
      { do: 'bond', who: 'mori', add: 3 },
      { call: 'mori_bond' },
      { go: 'lunch_end' },
    ],
    mori_bond: [
      { set: 'mori_bond_done' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { do: 'face', who: 'mori', to: 'kettle' },
      { say: 'mori', emo: 'warm', text: '{irete}.' },
      { do: 'sound', name: 'no' },
      { do: 'face', who: 'mori', to: 'eric' },
      { say: 'mori', emo: 'slow', slow: true, text: '{irete}...' },
      { do: 'type', word: 'irete', from: 'mori', prompt: '> Mori mimes pouring tea into his cup. Try saying it to the pot.' },
      { do: 'kotodama', target: 'kettle' },
      { do: 'kettle', state: 'pour' },
      '> It fills his cup, then yours, then all seven, the dusty ones too.',
      { wait: 900 },
      '> Mori looks at the seven cups for a while. Then he picks up a dusty one and starts to wash it.',
      { do: 'cam', back: true },
    ],

    lunch_end: [
      // the 14:00 cut: lunch packed away, everyone back on the office floor for the lines below
      { do: 'lunchOver' },
      { unset: 'lunch_on' },
      { do: 'period', to: 'afternoon' },
      { set: 'afternoon_on' },
      '> 14:00.',
      { if: 'hamada_friend', then: [
        '> A box of rice crackers comes down from the twelfth floor, with a card in shaky capitals. TO B2 {mc.name_caps}. THANK YOU. 12F HAMADA.',
        { say: 'mori', emo: 'warm', overheard: true, text: '経理の浜田さんから？珍しい。' },
        '> Mori hands the crackers round. Even Mio takes one.',
        { do: 'bond', who: 'mori', add: 1 },
      ] },
      { if: 'gate_magic', then: [
        { say: 'kenji', emo: 'casual', overheard: true, text: '朝、ゲートが勝手に開いたって。', clear: [{ ja: 'ゲート', ro: 'gēto', en: 'gate' }] },
        { do: 'look', who: 'kenji', at: 'eric' },
      ] },
      { say: 'mio', face: 'neutral', emo: 'casual', text: "Oh, if you go to the vending machine, Mori-san drinks corn soup. From a can, yes. Every afternoon." },
      { do: 'hint', text: 'Buy a drink at the vending machine by the lift, then stand next to someone and press Give.' },
      { do: 'goal', text: 'Get someone a drink, or get back to work at your desk.' },
    ],

    // ================================================================== AFTERNOON
    vending: [
      { prompt: '> 130 yen each.', choice: [
        { text: 'Canned coffee', go: 'buy_coffee' },
        { text: 'Royal milk tea', go: 'buy_tea' },
        { text: 'Melon soda', go: 'buy_melon' },
        { text: 'Corn soup', go: 'buy_cornsoup' },
        { text: 'Nothing', go: 'noop' },
      ] },
    ],
    // the first can sticks; 動いて shakes it loose
    buy_coffee: [{ if: '!vend_tried', then: [{ set: { vend_want: 1 } }, { go: 'vend_stuck' }] }, { do: 'buy', item: 'coffee' }, { do: 'vendingDrop' }],
    buy_tea: [{ if: '!vend_tried', then: [{ set: { vend_want: 2 } }, { go: 'vend_stuck' }] }, { do: 'buy', item: 'tea' }, { do: 'vendingDrop' }],
    buy_melon: [{ if: '!vend_tried', then: [{ set: { vend_want: 3 } }, { go: 'vend_stuck' }] }, { do: 'buy', item: 'melon' }, { do: 'vendingDrop' }],
    buy_cornsoup: [{ if: '!vend_tried', then: [{ set: { vend_want: 4 } }, { go: 'vend_stuck' }] }, { do: 'buy', item: 'cornsoup' }, { do: 'vendingDrop' }],
    vend_stuck: [
      { set: 'vend_tried' },
      { set: 'vend_stuck' },
      { do: 'sound', name: 'no' },
      '> Your coin goes in. Nothing comes out.',
      { do: 'goal', side: true, text: 'The vending machine is stuck.' },
    ],
    vend_ugoite: [
      { unset: 'vend_stuck' },
      { do: 'kotodama', target: 'vending' },
      { do: 'vendingDrop' },
      { if: 'vend_want == 1', then: [{ do: 'buy', item: 'coffee' }] },
      { if: 'vend_want == 2', then: [{ do: 'buy', item: 'tea' }] },
      { if: 'vend_want == 3', then: [{ do: 'buy', item: 'melon' }] },
      { if: 'vend_want == 4', then: [{ do: 'buy', item: 'cornsoup' }] },
      { say: 'eric', emo: 'dry', text: 'Thanks.' },
      { do: 'goal', side: true, text: '' },
    ],
    vend_ugoite_idle: [{ do: 'sound', name: 'beep' }],
    vend_still_stuck: [{ do: 'sound', name: 'no' }, "> Your drink still hasn't come out."],

    gift_mio_coffee: [
      { set: 'gifted_mio' }, { do: 'bond', who: 'mio', add: 1 },
      { say: 'mio', face: 'smile', emo: 'warm', text: "Oh, black. Nice, thank you." },
      '> She drinks half of it without looking away from her screen.',
    ],
    gift_mio_other: [
      { set: 'gifted_mio' },
      { say: 'mio', face: 'deadpan', emo: 'dry', text: "Ah... thanks. It's a bit sweet for me. I'll drink it later, maybe." },
    ],
    gift_mori_cornsoup: [
      { set: 'gifted_mori' }, { do: 'bond', who: 'mori', add: 1 },
      { say: 'mori', face: 'smile', emo: 'bright', text: 'ああ、ちょうど飲みたかった。ありがとうございます。', overheard: true, clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
      '> Later, a cup of tea turns up next to your keyboard.',
    ],
    gift_mori_other: [
      { set: 'gifted_mori' },
      { do: 'bow', who: 'mori' },
      '> He puts it on his desk, square to the edge, and leaves it there.',
    ],
    gift_kenji_melon: [
      { set: 'gifted_kenji' },
      { say: 'kenji', face: 'grin', emo: 'excited', text: 'マジで？神！', overheard: true },
      { say: 'kenji', face: 'grin', emo: 'excited', text: "Melon! You are genius. Now I owe you, I fix anything for you. Well... I try." },
      { do: 'emote', who: 'kenji', kind: 'heart' },
    ],
    gift_kenji_other: [
      { set: 'gifted_kenji' },
      { say: 'kenji', emo: 'dry', text: 'あ、ありがとう…', overheard: true, clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
      "> He puts it down and doesn't open it.",
    ],
    gift_again: ["> They've already had one from you."],

    work_afternoon: [
      { do: 'sitDown' },
      '> 17:40.',
      { call: 'emi_drops_in' },
      { do: 'period', to: 'evening' },
      { set: 'evening_on' },
      '> 18:05.',
      { do: 'walk', who: 'mio', to: 'mio_by_desk', wait: false },
      { wait: 1500 },
      { do: 'face', who: 'mio', to: 'eric' },
      { go: 'ending' },
    ],

    // Emi, the team lead, down from head office; afterwards she goes into her own office and stays at her desk
    emi_drops_in: [
      { do: 'liftOpen' },
      { do: 'show', id: 'emi' },
      { do: 'walk', who: 'emi', to: 'my_desk', wait: true },
      { do: 'liftClose' },
      { do: 'face', who: 'emi', to: 'eric' },
      { do: 'cam', on: 'emi', zoom: 1.6 },
      { do: 'meet', who: 'emi' },
      { say: 'emi', emo: 'bright', text: "You must be {mc.name}. Emi, I run this lot. Sorry I wasn't about, I've been upstairs since seven begging for money." },
      { say: 'eric', emo: 'tired', text: 'How did it go?' },
      { say: 'emi', emo: 'bright', text: "I got it. Well. I may have told them B2 can keep every machine on this island running for another ten years." },
      { say: 'emi', emo: 'bright', text: "With the right contractor, I said. So, welcome aboard. Tomorrow you and I should have a proper chat about what you can actually do." },
      { do: 'cam', back: true },
      { do: 'sit', who: 'emi', at: 'emi_seat' },
    ],

    // ================================================================== EVENING: her question, and a new repair request
    ending: [
      { do: 'cam', on: 'mio', zoom: 1.6 },
      { do: 'goal', text: '' },
      { if: 'lunch_mio', then: [{ say: 'mio', face: 'neutral', emo: 'hesitant', text: "Okay, I'm going home. Um... {mc.name}?" }], else: [{ say: 'mio', face: 'neutral', emo: 'hesitant', text: "Okay, I'm going home. Hey, {gaijin}." }] },
      { say: 'mio', emo: 'low', text: "On the train you said {matte} and the doors just stopped. And Mori-san says {ugoite} to that copier every morning for thirty years, and today it works for you." },
      { if: 'gate_magic', then: [{ say: 'mio', emo: 'low', text: "And now everybody upstairs is talking about the lobby gate. That was {akete}, I guess?" }] },
      { if: 'lunch_mio', then: [{ say: 'mio', emo: 'dry', text: "And the rack, {tomatte}. That one I asked you, so... that one is my fault." }] },
      { if: 'lunch_mori', then: [{ say: 'mio', emo: 'puzzled', text: "And Mori-san came back from lunch with seven clean cups. He won't tell me why, he just smiles." }] },
      { say: 'mio', face: 'surprised', emo: 'low', text: 'How are you doing that?' },
      { choice: [
        { text: '“I don\'t know.”', go: 'end_dunno' },
        { text: '“I asked nicely.”', go: 'end_nicely' },
        { text: 'Say nothing', go: 'end_quiet' },
      ] },
    ],
    end_dunno: [{ say: 'mio', face: 'neutral', emo: 'low', text: '...Yeah. Me neither.' }, { go: 'end_ticket' }],
    end_nicely: [{ say: 'mio', face: 'deadpan', emo: 'deadpan', text: 'Mm. Very funny.' }, { go: 'end_ticket' }],
    end_quiet: [{ do: 'emote', who: 'mio', kind: '…' }, { go: 'end_ticket' }],
    // the station sends B2 a repair request about the doors, and it lands on Eric
    end_ticket: [
      { do: 'phone', who: 'mio', state: 'buzz' },
      { wait: 700 },
      { do: 'phone', who: 'mio', state: 'look' },
      { say: 'mio', face: 'phone', emo: 'groan', text: "Ah... great. The station sent a repair request about the doors. I told them it's the sensor, so now they want B2 to check the sensor." },
      { say: 'mio', face: 'embarrassed', emo: 'low', text: "It was supposed to go on my list. ...Okay, I'm putting it on yours." },
      { do: 'phone', who: 'mio', state: 'away' },
      { do: 'sound', name: 'beep' },
      '> REPAIR REQUEST #2. Train doors, Honsha station. Assigned to: {mc.name_caps}.',
      { if: 'lunch_mio || mio_warm >= 2', then: [
        { say: 'mio', face: 'smile', emo: 'teasing', text: "Tomorrow morning you go down to the station, okay? I'll come too. I want to see how you, um... fix a sensor." },
      ], else: [
        { say: 'mio', face: 'deadpan', emo: 'dry', text: "It's the station, tomorrow morning. And if anybody asks, it was the sensor. Don't sleep through it, {gaijin}." },
      ] },
      { do: 'cam', back: true },
      { do: 'liftOpen' },
      { do: 'walk', who: 'mio', to: 'lift_out', wait: true },
      { do: 'hide', id: 'mio' },
      { do: 'liftClose' },
      { set: 'going_home' },
      { do: 'goal', text: 'Take the lift up and walk home to the dorms.' },
      { do: 'save' },
    ],
    // after work: up to the forecourt, and on home (the day ends in his room, story dorms.js)
    go_home: [{ do: 'trip', to: 'forecourt' }],

    // ------------------------------------------------------------------ greetings to Mio
    ohayo_mio: [{ say: 'mio', face: 'smile', emo: 'amused', text: "Ha, too polite. I'm not your boss. Just おはよう (ohayō) is fine." }],
    yoroshiku_mio: [{ say: 'mio', face: 'deadpan', emo: 'deadpan', text: "We did that already, on the train." }],
    sumimasen_mio: [{ say: 'mio', emo: 'low', text: 'Hm? What is it?' }],

    // ------------------------------------------------------------------ things to poke
    tama: ['> She opens one eye, and closes it again.'],
    tama_ohayo: [{ do: 'emote', who: 'tama', kind: 'heart' }],
    desk_look: ['> Your name card, in katakana. Someone has written {mc.name_caps} under it in pen, just in case.'],
    irete_kettle: [{ do: 'kettle', state: 'pour' }, '> The pot pours you a cup of tea.'],
    inout_board: ['> Four names in Japanese, and one new magnet in capitals: {mc.name_caps}.'],
    covered: ["> There's no dust on the name card in front of it."],
    stairs: ['> The stairs up. A line of small paw prints goes up them in the dust.'],
    ugoite_coffee: [{ do: 'coffee' }, '> It gurgles, then goes quiet again.'],
    matte_clock: [
      { do: 'clockStop', ms: 3000 },
      { do: 'look', who: 'mori', at: 'clock' },
      { do: 'emote', who: 'mori', kind: '?' },
      { say: 'mori', overheard: true, emo: 'puzzled', text: 'あれ、止まりました？' },
    ],
    tomatte_fan: [
      { do: 'fan', state: 'off' },
      { do: 'look', who: 'kenji', at: 'fan' },
      { say: 'kenji', emo: 'puzzled', text: 'あれ？', overheard: true },
    ],
  },
};
