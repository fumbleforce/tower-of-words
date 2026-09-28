// Place 3: IT support on B2. Mori, Kenji, Mio, the copier ticket, the lunch choice, one gift, and Mio's question.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    mio: { name: 'Mio', role: 'programmer' },
    mori: { name: 'Mr. Mori', role: 'IT support' },
    kenji: { name: 'Kenji', role: 'IT support' },
  },

  people: {
    mio: { name: 'Mio', about: 'Programmer. The only one with English. Hates bowing. Drinks black canned coffee.', color: '#5fc6bf' },
    mori: { name: 'Mr. Mori', about: 'Used to be a manager. Formal and kind. Makes the tea. Rinses his corn soup cans.', color: '#b9a3d3' },
    kenji: { name: 'Kenji', about: 'Engineer. Casual. Borrowed your chair. Lives on melon soda.', color: '#9fb6d8' },
  },

  schedule: {
    emi: { '*': { hide: true } },
    aoi: { '*': { hide: true } },
    rei: { '*': { hide: true } },
    mio: { morning: { at: 'machine_front' }, lunch: { at: 'racks' }, afternoon: { at: 'emi_seat' }, evening: { at: 'my_desk' } },
    mori: { lunch: { at: 'kitchen_table' }, afternoon: { at: 'chief_desk' }, evening: { hide: true } },
    kenji: { evening: { hide: true } },
  },

  ambient: [
    { id: 'kenji_mori', who: ['kenji', 'mori'], period: 'afternoon', lines: [
      { say: 'kenji', text: '森さん、新しい人、どうですか。', overheard: true },
      { say: 'mori', text: '礼儀正しい人ですよ。', overheard: true },
      '> Mori glances your way.',
    ] },
  ],

  bonds: {
    
  },

  start: 'office_in',

  on: {
    'talk:mori': [
      { if: '!greeted_mori', node: 'mori_wait' },
      { if: 'got_ticket && !copier_done', node: 'mori_copier_hint' },
      'mori_again',
    ],
    'talk:kenji': [{ if: '!met_kenji', node: 'kenji_first' }, 'kenji_again'],
    'talk:mio': [
      { if: 'evening_on', node: 'ending' },
      { if: '!got_ticket && chair_back', node: 'ticket' },
      { if: 'copier_done && !ticket_closed', node: 'ticket_done' },
      'mio_busy',
    ],
    'talk:machine_door': [{ if: '!met_kenji', node: 'kenji_first' },{ if: '!machine_open && knocked', node: 'mio_opens' }, { if: '!machine_open', node: 'machine_door' }, 'noop'],
    'zone:machine_room': { if: 'machine_open', node: 'machine_in', once: true },
    'talk:my_chair': [{ if: '!chair_back && found_chair', node: 'chair_push' }, 'noop'],
    'talk:copier': [{ if: 'got_ticket && !copier_done', node: 'copier' }, 'copier_look'],
    'zone:copy_room': { if: 'got_ticket && !copier_done', node: 'copier', once: true },
    'talk:my_desk': [
      { if: '!met_kenji', node: 'kenji_first' },
      { if: 'afternoon_on', node: 'work_afternoon' },
      'desk_look',
    ],
    'talk:vending': 'vending',
    'give:melon:kenji': [{ if: 'gifted_kenji', node: 'gift_again' }, 'gift_kenji_melon'],
    'give:*:kenji': [{ if: 'gifted_kenji', node: 'gift_again' }, 'gift_kenji_other'],
    'talk:inout_board': 'inout_board',
    'talk:covered': 'covered',
    'talk:stairs': 'stairs',

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

    // commands
    'say:akete:machine_door': [{ if: '!machine_open', node: 'akete_machine' }, 'noop'],
    'say:ugoite:copier': [{ if: 'got_ticket && !copier_done', node: 'copier' }, 'ugoite_copier_again'],
    'say:ugoite:coffee_machine': { node: 'ugoite_coffee', once: true },
    'say:matte:clock': 'matte_clock',
    'say:irete:kettle': 'irete_kettle',
    'say:tomatte:fan': 'tomatte_fan',

    // the gift moment
    'give:coffee:mio': [{ if: 'gifted_mio', node: 'gift_again' }, 'gift_mio_coffee'],
    'give:*:mio': [{ if: 'gifted_mio', node: 'gift_again' }, 'gift_mio_other'],
    'give:cornsoup:mori': [{ if: 'gifted_mori', node: 'gift_again' }, 'gift_mori_cornsoup'],
    'give:*:mori': [{ if: 'gifted_mori', node: 'gift_again' }, 'gift_mori_other'],
    
  },

  show: { mori: '!greeted_mori', mio: '(chair_back && !got_ticket) || (copier_done && !ticket_closed) || evening_on' },
  goal: {
    mori: '!greeted_mori',
    machine_door: 'met_kenji && !machine_open',
    my_chair: 'found_chair && !chair_back',
    copier: 'got_ticket && !copier_done',
    my_desk: 'afternoon_on',
  },
  labels: { my_chair: 'Your chair', my_desk: 'Your desk', vending: 'Vending machine', covered: 'A covered desk' },

  nodes: {
    noop: [],

    // ================================================================== MORNING
    office_in: [
      { do: 'period', to: 'morning' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { say: 'mori', text: '{ohayo}。森と申します。ITサポートへ、ようこそ。', overheard: true, clear: ['IT'] },
      { do: 'bow', who: 'mori', depth: 'deep' },
      '> He waits.',
      { do: 'goal', text: 'Greet him. Mio said something about new people.' },
    ],
    mori_wait: ['> He is still waiting.'],
    yoroshiku_mori: [
      { set: 'greeted_mori' },
      { do: 'meet', who: 'mori' },
      { do: 'bond', who: 'mori', add: 1 },
      { say: 'mori', text: 'こちらこそ、{yoroshiku}。', overheard: true },
      { do: 'bow', who: 'eric' },
      { do: 'bow', who: 'mori', depth: 'deep' },
      '> He looks very pleased.',
      { go: 'lead_in' },
    ],
    ohayo_mori: [
      { set: 'greeted_mori' },
      { do: 'meet', who: 'mori' },
      { say: 'mori', text: 'はい、{ohayo}。', overheard: true },
      '> He nods, and seems to wait a moment longer for something else. Then he lets it go.',
      { go: 'lead_in' },
    ],
    lead_in: [
      { do: 'cam', back: true },
      { do: 'walk', who: 'mori', to: 'chief_desk', wait: false },
      { do: 'goal', text: 'Find your desk.' },
    ],
    greet_again_mori: [{ do: 'bow', who: 'mori' }],
    sumimasen_mori: [
      { do: 'face', who: 'mori', to: 'eric' },
      '> He waits for you to point at something.',
      { if: 'got_ticket && !copier_done', then: ['> You point at the ticket on your screen. He points at the copy room.'] },
    ],
    mori_copier_hint: ['> He points at the copy room, and makes a small, sad chewing motion with one hand.'],
    mori_again: ['> Mori nods to you over his reading glasses.'],

    // ------------------------------------------------------------------ Kenji and the chair
    kenji_first: [
      { set: 'met_kenji' },
      { do: 'meet', who: 'kenji' },
      { say: 'kenji', text: 'あ、新しい人？ごめん、椅子借りてた。壊れちゃってさ、俺の。', overheard: true },
      { do: 'face', who: 'kenji', to: 'machine_door' },
      '> He points at your empty desk, then at the machine room door.',
      { do: 'goal', text: 'Get your chair back from the machine room.' },
    ],
    kenji_pat: [
      '> You pat the chair. Kenji pats it too, very seriously.',
    ],
    kenji_small: [
      '> He laughs, properly, and holds up a hand for a high five.',
      { set: 'kenji_laughed' },
    ],
    kenji_again: [
      { if: 'chair_back', then: [
        'kenji: Ah, sorry, sorry, the chair. My English is... very little.',
        { choice: [
          { text: '“Mine\'s worse. My Japanese, I mean.”', go: 'kenji_small' },
          { text: 'Pat the chair sympathetically', go: 'kenji_pat' },
        ] },
      ], else: [{ say: 'kenji', text: '椅子、あった？', overheard: true }] },
    ],
    ohayo_kenji: [
      { set: 'greeted_kenji' },
      { say: 'kenji', text: 'かたっ！おはよう、でいいよ。', overheard: true },
      '> He laughs, and says it again, shorter.',
      { say: 'kenji', text: 'おはよう。', overheard: true, clear: [{ ja: 'おはよう', ro: 'ohayō', en: 'morning (casual)' }] },
      { if: '!met_kenji', then: [{ go: 'kenji_first' }] },
    ],
    yoroshiku_kenji: [
      { set: 'greeted_kenji' },
      { say: 'kenji', text: 'よろしく！', overheard: true, clear: [{ ja: 'よろしく', ro: 'yoroshiku', en: 'nice to meet you (casual)' }] },
      '> He holds out a fist. You bump it.',
      { if: '!met_kenji', then: [{ go: 'kenji_first' }] },
    ],
    greet_again_kenji: ['> He gives you a thumbs-up without looking away from his screen.'],
    sumimasen_kenji: [{ say: 'kenji', text: 'え、何？大丈夫？', overheard: true }, { do: 'emote', who: 'kenji', kind: '?' }],

    machine_door: [
      "mio: One minute!",
      { set: 'knocked' },
    ],
    mio_opens: [
      { do: 'machineDoor', state: 'open' },
      "mio: Yes, yes, I'm coming. Come in, but don't touch anything, okay?",
      { set: 'machine_open' },
    ],
    akete_machine: [
      { do: 'machineDoor', state: 'open' },
      { do: 'emote', who: 'mio', kind: '…' },
      "mio: ...That door has a card reader, you know.",
      { set: 'machine_open' },
      { set: 'door_magic' },
    ],
    machine_in: [
      { set: 'found_chair' },
    ],
    chair_push: [
      { do: 'chairRoll', to: 'my_seat' },
      { set: 'chair_back' },
      "mio: Ah, you found your chair. The cat sleeps on it every day, she'll be sad.",
      'mio: Oh, and come here a second. I have a ticket for you.',
      { do: 'goal', text: 'Talk to Mio.' },
    ],

    // ------------------------------------------------------------------ the ticket and the copier (動いて)
    ticket: [
      { set: 'got_ticket' },
      { do: 'meet', who: 'mio' },
      "mio: Okay, your first ticket. I changed your screen to English, by the way.",
      '> TICKET #1. Copier, B2 copy room. Eats paper. Opened 1 April 1996.',
      'eric: Nineteen ninety-six?',
      "mio: Yeah. It's kind of a tradition now, nobody closes it. Mori-san knows the copier, he can show you.",
      { say: 'mio', text: '森さん、{gaijin}にコピー機お願い。', overheard: true },
      { say: 'mori', text: '外国の方、ですよ。', overheard: true },
      "mio: He says I should say gaikoku no kata. It's more polite. ...Anyway, go.",
      { do: 'walk', who: 'mori', to: 'copier_front', wait: true },
      { do: 'goal', text: 'Ticket #1: the copier.' },
    ],
    mio_busy: [
      { if: 'afternoon_on', then: ["mio: Now people upstairs ask me about the copier. ...Sorry, I'm busy.", { end: true }] },
      "mio: Mm, sorry, I'm in the middle of something.",
    ],
    copier: [
      { set: 'copier_started' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { do: 'copier', state: 'jam' },
      { say: 'mori', text: 'また食べられました…', overheard: true },
      { do: 'face', who: 'mori', to: 'copier' },
      { do: 'bow', who: 'mori' },
      'mori: {ugoite}.',
      '> Nothing.',
      { do: 'gesture', who: 'mori', kind: 'shrug' },
      { do: 'type', word: 'ugoite', from: 'mori', prompt: '> Your turn.' },
      { do: 'copier', state: 'run' },
      { do: 'copier', state: 'idle' },
      { do: 'face', who: 'mori', to: 'eric' },
      { do: 'gesture', who: 'mori', kind: 'finger' },
      { do: 'bow', who: 'mori' },
      { set: 'copier_done' },
      { do: 'bond', who: 'mori', add: 1 },
      { do: 'cam', back: true },
      { do: 'walk', who: 'mori', to: 'chief_desk', wait: false },
      { do: 'goal', text: 'Tell Mio the ticket is done.' },
    ],
    copier_look: [],
    ugoite_copier_again: ['> The copier prints one blank sheet, very neatly, and hands it to you.'],
    ticket_done: [
      { set: 'ticket_closed' },
      "eric: The copier's fixed.",
      "mio: Eh? The B2 copier? It's older than me, nobody can fix that.",
      'eric: I asked it nicely.',
      { do: 'emote', who: 'mio', kind: '…' },
      "mio: ...Okay. Okay, I'll close it. Um. It's lunch anyway.",
      { go: 'lunch_start' },
    ],

    // ================================================================== LUNCH (the one choice)
    lunch_start: [
      { do: 'period', to: 'lunch' },
      { set: 'lunch_on' },
      '> 12:10.',
      { do: 'walk', who: 'mori', to: 'kitchen_table', wait: false },
      "mio: I usually eat in the machine room. It's quiet, and nobody talks to me there.",
      { choice: [
        { text: 'Lunch with Mio, in the machine room', go: 'lunch_mio' },
        { text: 'Lunch with Mori, in the kitchenette', go: 'lunch_mori' },
      ], prompt: 'Who do you have lunch with?' },
    ],

    lunch_mio: [
      { set: 'lunch_mio' },
      { do: 'walk', who: 'eric', to: 'machine_front', wait: true },
      { do: 'cam', on: 'mio', zoom: 1.6 },
      "mio: You can sit on the floor, it's warm from the servers.",
      { choice: [
        { text: '“Why B2?”', go: 'mio_b2' },
        { text: '“The doors this morning...”', go: 'mio_doors' },
        { text: 'Eat, and say nothing', go: 'mio_quiet' },
      ] },
    ],
    mio_b2: [
      "mio: Upstairs you have to bow to everybody all day, it's so tiring. Down here it's just me and these guys.",
      "mio: They're from the nineties. If I don't watch them, they just... die.",
      { go: 'mio_lunch_end' },
    ],
    mio_doors: [
      "mio: I don't know. Maybe the doors were just broken? I'll check the logs tonight, maybe.",
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
    mio_bond_gate: [],
    mio_bond: [
      { set: 'mio_bond_done' },
      { do: 'cam', on: 'mio', zoom: 1.6 },
      { do: 'rackAlarm', state: 'on' },
      { do: 'sound', name: 'beep' },
      "mio: No, no, not now...",
      { do: 'face', who: 'mio', to: 'eric' },
      "mio: Wait. You try it. {tomatte}, it means stop. ...I want to see something.",
      { do: 'type', word: 'tomatte', from: 'mio', prompt: 'mio: Go on.' },
      { do: 'rackAlarm', state: 'off' },
      { if: 'mio_warm >= 1', then: ['mio: ...Okay. You can eat here tomorrow also, if you want.'], else: ['mio: Huh. Okay.'] },
      { do: 'cam', back: true },
    ],

    lunch_mori: [
      { set: 'lunch_mori' },
      { do: 'walk', who: 'eric', to: 'coffee_front', wait: true },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { say: 'mori', text: 'ノルウェーから、ですね。私、1994年にリレハンメルへ行きました。', overheard: true, clear: [{ ja: 'ノルウェー', ro: 'noruwē', en: 'Norway' }, '1994', { ja: 'リレハンメル', ro: 'Rirehanmeru', en: 'Lillehammer' }] },
      { do: 'gesture', who: 'mori', kind: 'skijump' },
      { choice: [
        { text: 'Mime the landing', go: 'mori_landing' },
        { text: 'Pour his tea for him', go: 'mori_pour' },
      ] },
    ],
    mori_landing: [
      '> You stick the landing. He claps three small claps, and you both laugh.',
      { go: 'mori_cups' },
    ],
    mori_pour: [
      '> You fill his cup before your own. He notices.',
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
    mori_bond_gate: [],
    mori_bond: [
      { set: 'mori_bond_done' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      '> He holds a cup under the thermos pot and says one word to it, like a suggestion.',
      'mori: {irete}.',
      '> Nothing. He holds the cup out to you.',
      { do: 'type', word: 'irete', from: 'mori', prompt: '> He waits, cup ready.' },
      { do: 'kettle', state: 'pour' },
      '> It fills his cup, then yours, then all seven, the dusty ones too.',
      '> Mori looks at the seven cups for a while. Then he picks up a dusty one and starts to wash it.',
      { do: 'cam', back: true },
    ],

    lunch_end: [
      { unset: 'lunch_on' },
      { do: 'period', to: 'afternoon' },
      { set: 'afternoon_on' },
      '> 14:00.',
      { if: 'hamada_friend', then: [
        '> A box of rice crackers comes down from the twelfth floor, with a card in shaky capitals. TO B2 ERIC. THANK YOU. 12F HAMADA.',
        { say: 'mori', overheard: true, text: '経理の浜田さんから？珍しい。' },
        '> Mori hands the crackers round. Even Mio takes one.',
        { do: 'bond', who: 'mori', add: 1 },
      ] },
      { if: 'gate_magic', then: [
        { say: 'kenji', overheard: true, text: '朝、ゲートが勝手に開いたって。全部。', clear: [{ ja: 'ゲート', ro: 'gēto', en: 'gate' }] },
        '> Kenji says it to Mori, but he\'s looking at you.',
      ] },
      { do: 'hint', text: 'Buy a drink at the vending machine by the lift, stand next to someone and press Give. People like different things.' },
      { do: 'goal', text: 'Maybe get someone a drink. Then work at your desk.' },
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
    buy_coffee: [{ do: 'buy', item: 'coffee' }, '> Clunk.'],
    buy_tea: [{ do: 'buy', item: 'tea' }, '> Clunk.'],
    buy_melon: [{ do: 'buy', item: 'melon' }, '> Clunk.'],
    buy_cornsoup: [{ do: 'buy', item: 'cornsoup' }, '> Clunk.'],

    gift_mio_coffee: [
      { set: 'gifted_mio' }, { do: 'bond', who: 'mio', add: 1 },
      'mio: Oh, black. Nice, thank you.',
      '> She drinks half of it without looking away from her screen.',
    ],
    gift_mio_other: [
      { set: 'gifted_mio' },
      "mio: Ah... thanks. It's a bit sweet for me. I'll drink it later, maybe.",
    ],
    gift_mori_cornsoup: [
      { set: 'gifted_mori' }, { do: 'bond', who: 'mori', add: 1 },
      { say: 'mori', text: 'ああ、ちょうど飲みたかった。ありがとうございます。', overheard: true, clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
      '> Later, a cup of tea turns up next to your keyboard.',
    ],
    gift_mori_other: [
      { set: 'gifted_mori' },
      '> He takes it with a bow and puts it on his desk, square to the edge. You get the feeling he won\'t drink it.',
    ],
    gift_kenji_melon: [
      { set: 'gifted_kenji' },
      { say: 'kenji', text: 'マジで？神！', overheard: true },
      { do: 'emote', who: 'kenji', kind: 'heart' },
    ],
    gift_kenji_other: [
      { set: 'gifted_kenji' },
      { say: 'kenji', text: 'あ、ありがとう…', overheard: true, clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
      "> He puts it down and doesn't open it.",
    ],
    gift_again: ["> They've already had one from you."],

    work_afternoon: [
      { do: 'sitDown' },
      { do: 'period', to: 'evening' },
      { set: 'evening_on' },
      '> 18:05.',
      { do: 'goal', text: 'Talk to Mio.' },
    ],
    ending: [
      { do: 'cam', on: 'mio', zoom: 1.6 },
      "mio: Tomorrow, say {ohayo} to Mori-san first thing, okay? He'll be waiting at the lift again.",
      '> She turns to go, then stops.',
      { if: 'lunch_mio', then: ['mio: Um. Eric.'], else: ['mio: Hey, {gaijin}.'] },
      { if: 'gate_magic', then: ["mio: This morning, the train doors... then the copier. And Kenji says the gate opened by itself, everybody's talking about it."], else: ['mio: This morning, the train doors... and then the copier.'] },
      { if: 'door_magic', then: ['mio: My door too. I saw it.'] },
      { if: 'lunch_mio', then: ['mio: And the rack, at lunch.'] },
      "mio: How are you doing that?",
      { do: 'save' },
      { do: 'end' },
    ],

    // ------------------------------------------------------------------ greetings to Mio
    ohayo_mio: ["mio: Ha, too polite. I'm not your boss. Just おはよう (ohayō) is fine."],
    yoroshiku_mio: ['mio: We did that already, on the train.'],
    sumimasen_mio: ['mio: Hm? What is it?'],

    // ------------------------------------------------------------------ things to poke
    desk_look: ['> A name card in katakana. You hope it says Eric.'],
    irete_kettle: [{ do: 'kettle', state: 'pour' }, '> The pot pours you a cup of tea.'],
    inout_board: ['> Four names in Japanese, and one new magnet in capitals: ERIC.'],
    covered: ["> There's no dust on the name card in front of it. Somebody keeps it clean."],
    stairs: ['> In the dust on the steps, a line of small paw prints.'],
    ugoite_coffee: [{ do: 'coffee' }, '> Someone taped an OUT OF ORDER sign on it this morning.'],
    matte_clock: [{ do: 'clockStop', ms: 3000 }],
    tomatte_fan: [{ do: 'fan', state: 'off' }],
  },
};
