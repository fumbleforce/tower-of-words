// Place 3: IT support on B2. Mori, Kenji, Mio, the copier ticket, the lunch choice, one gift, and Mio's question.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    mio: { name: 'Mio', role: 'IT support' },
    mori: { name: 'Mr. Mori', role: 'IT support' },
    kenji: { name: 'Kenji', role: 'IT support' },
  },

  people: {
    mio: { name: 'Mio', about: 'Programmer. The only one with English. Hates bowing.', color: '#5fc6bf' },
    mori: { name: 'Mr. Mori', about: 'Used to be a manager. Formal and kind. Makes the tea.', color: '#b9a3d3' },
    kenji: { name: 'Kenji', about: 'Engineer. Casual. Borrowed your chair.', color: '#9fb6d8' },
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
      '> Mori, answering Kenji, bows very slightly in your direction.',
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
    'talk:kettle': 'kettle',
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
      '> An older man in a cardigan is waiting by the lift, very straight. When the doors open he bows.',
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { say: 'mori', text: 'おはようございます。森と申します。ITサポートへ、ようこそ。', overheard: true, clear: ['おはようございます', 'IT'] },
      { if: 'late', then: ['> He glances, very politely, at the clock. It is 9:04.'] },
      '> He waits.',
      { do: 'goal', text: 'Greet him. Mio said something about new people.' },
    ],
    mori_wait: ['> He is still waiting, hands at his sides.'],
    yoroshiku_mori: [
      { set: 'greeted_mori' },
      { do: 'meet', who: 'mori' },
      { do: 'bond', who: 'mori', add: 1 },
      '> You bow. Not too far. You are not apologising.',
      { say: 'mori', text: 'こちらこそ、よろしくお願いいたします。', overheard: true, clear: ['よろしくお願い'] },
      '> He bows back, deeper, and for a moment he looks very pleased. Then he turns and leads you in.',
      { go: 'lead_in' },
    ],
    ohayo_mori: [
      { set: 'greeted_mori' },
      { do: 'meet', who: 'mori' },
      { say: 'mori', text: 'はい、おはようございます。', overheard: true, clear: ['おはようございます'] },
      '> He nods, still waiting a little, then decides that will do and leads you in.',
      { go: 'lead_in' },
    ],
    lead_in: [
      { do: 'cam', back: true },
      { do: 'walk', who: 'mori', to: 'chief_desk', wait: false },
      { do: 'goal', text: 'Find your desk.' },
    ],
    greet_again_mori: ['> He bows again anyway. He will bow as many times as you like.'],
    sumimasen_mori: [
      '> He is at your side at once, waiting for you to point at something.',
      { if: 'got_ticket && !copier_done', then: ['> You point at the ticket on your screen. He points at the copy room.'] },
    ],
    mori_copier_hint: ['> He points at the copy room, and makes a small, sad chewing motion with one hand.'],
    mori_again: ['> Mori nods to you over his reading glasses.'],

    // ------------------------------------------------------------------ Kenji and the chair
    kenji_first: [
      { set: 'met_kenji' },
      { do: 'meet', who: 'kenji' },
      '> The man at the next desk minimises a window very quickly.',
      { say: 'kenji', text: 'あ、新しい人？ごめん、椅子借りてた。壊れちゃってさ、俺の。', overheard: true },
      '> He points at your desk (no chair), at himself, at the machine room door, and mimes sleeping, head on his hands.',
      { do: 'goal', text: 'Get your chair back from the machine room.' },
    ],
    kenji_pat: [
      '> You pat the chair. It tips him slowly sideways anyway. He lets it.',
    ],
    kenji_small: [
      '> He laughs, properly, and holds up a hand for a high five.',
      { set: 'kenji_laughed' },
    ],
    kenji_again: [
      { if: 'chair_back', then: [
        '> He rolls over on his own broken chair, which lists to one side.',
        'kenji: Sorry. Chair. My English... small.',
        { choice: [
          { text: '“My Japanese is smaller.”', go: 'kenji_small' },
          { text: 'Pat the chair sympathetically', go: 'kenji_pat' },
        ] },
      ], else: [{ say: 'kenji', text: '椅子、あった？', overheard: true }] },
    ],
    ohayo_kenji: [
      { set: 'greeted_kenji' },
      { say: 'kenji', text: 'かたっ！おはよう、でいいよ。', overheard: true, clear: ['おはよう'] },
      '> He laughs, and says a shorter version, slowly, for you:',
      { say: 'kenji', text: 'おはよう。', overheard: true, clear: [{ ja: 'おはよう', ro: 'ohayō', en: 'morning (casual)' }] },
      { if: '!met_kenji', then: [{ go: 'kenji_first' }] },
    ],
    yoroshiku_kenji: [
      { set: 'greeted_kenji' },
      { say: 'kenji', text: 'よろしく！', overheard: true, clear: ['よろしく'] },
      '> He holds out a fist. You bump it. You both look relieved.',
      { if: '!met_kenji', then: [{ go: 'kenji_first' }] },
    ],
    greet_again_kenji: ['> He gives you a thumbs-up without looking away from his screen.'],
    sumimasen_kenji: [{ say: 'kenji', text: 'え、何？大丈夫？', overheard: true }, '> He looks genuinely worried for you.'],

    machine_door: [
      '> The machine room. A card reader, red. Through the little window: racks, blinking lights, and Mio, typing.',
      '> She holds up one finger without looking round. One minute.',
      { set: 'knocked' },
    ],
    mio_opens: [
      '> You knock again. Mio sighs, gets up and opens the door.',
      'mio: {gaijin}. Knocking is not a ticket.',
      { do: 'machineDoor', state: 'open' },
      { set: 'machine_open' },
    ],
    akete_machine: [
      { do: 'machineDoor', state: 'open' },
      '> The lock clunks and the door swings open on its own.',
      '> Mio turns round and looks at the door for a long time.',
      { set: 'machine_open' },
      { set: 'door_magic' },
    ],
    machine_in: [
      '> Warm, loud, blinking. Between two racks: your chair. On your chair, asleep: the calico cat from the train.',
      { set: 'found_chair' },
    ],
    chair_push: [
      { do: 'chairRoll', to: 'my_seat' },
      { set: 'chair_back' },
      '> You wheel it out. The cat rides the whole way to your desk and does not open her eyes.',
      'mio: She likes you. Or the chair. Come here. Ticket.',
      { do: 'goal', text: 'Talk to Mio.' },
    ],

    // ------------------------------------------------------------------ the ticket and the copier (動いて)
    ticket: [
      { set: 'got_ticket' },
      { do: 'meet', who: 'mio' },
      "mio: Your first ticket, {gaijin}. I switch your screen to English. You're welcome.",
      '> On your monitor: TICKET #1. Copier, B2 copy room. Eats paper. Opened: 1 April 1996.',
      'eric: Nineteen ninety-six.',
      'mio: Easy one. Mori-san knows it. Go.',
      { say: 'mio', text: '森さん、外人にコピー機お願い。', overheard: true, clear: [{ ja: '外人', ro: 'gaijin', en: 'foreigner' }] },
      { say: 'mori', text: '外国の方、ですよ。', overheard: true, clear: [{ ja: '外国の方', ro: 'gaikoku no kata', en: 'person from abroad (polite)' }] },
      '> She rolls her eyes.',
      { do: 'walk', who: 'mori', to: 'copier_front', wait: true },
      { do: 'goal', text: 'Ticket #1: the copier.' },
    ],
    mio_busy: [
      { if: 'afternoon_on', then: ['mio: Busy. The copier ticket: first one closed in two years. Go away.', { end: true }] },
      'mio: Busy.',
    ],
    copier: [
      { set: 'copier_started' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      { do: 'copier', state: 'jam' },
      '> Mori is at the copier, holding one corner of a crumpled sheet it will not give back.',
      { say: 'mori', text: 'また食べられました…', overheard: true },
      '> He bows to the machine, very slightly, and says one word to it, the way you would say please to a stranger.',
      'mori: {ugoite}.',
      '> Nothing. He shrugs at you. It never works for him.',
      { learn: 'ugoite', from: 'mori' },
      { offer: 'ugoite', line: '> He steps aside and nods at the copier: your turn.' },
      { do: 'copier', state: 'run' },
      '> The copier wakes with a roar, lets go of the page, smooths it out, and hands it back to Mori, warm.',
      { do: 'copier', state: 'idle' },
      '> Mori looks at the page. He looks at you. He puts one finger to his lips, and bows.',
      { set: 'copier_done' },
      { do: 'bond', who: 'mori', add: 1 },
      { do: 'cam', back: true },
      { do: 'walk', who: 'mori', to: 'chief_desk', wait: false },
      { do: 'goal', text: 'Tell Mio the ticket is done.' },
    ],
    copier_look: ['> A big grey copier. It looks like it has opinions.'],
    ugoite_copier_again: ['> The copier prints one blank sheet, very neatly, and hands it to you.'],
    ticket_done: [
      { set: 'ticket_closed' },
      'eric: Copier is fixed.',
      'mio: That copier is older than me. Nobody fixes it.',
      'eric: I asked nicely.',
      '> She stops typing.',
      'mio: Hm. I close it. Lunch.',
      { go: 'lunch_start' },
    ],

    // ================================================================== LUNCH (the one choice)
    lunch_start: [
      { do: 'period', to: 'lunch' },
      { set: 'lunch_on' },
      '> 12:10. Mori takes a cloth-wrapped bento to the kitchenette and looks back at you, once, politely.',
      'mio: I eat in the machine room. Servers are good company.',
      '> Mio has a black-coffee can in each hoodie pocket. Kenji is asleep at his desk behind a pyramid of melon soda cans. In Mori\'s bin, one corn soup can, rinsed.',
      { choice: [
        { text: 'Lunch with Mio, in the machine room', go: 'lunch_mio' },
        { text: 'Lunch with Mori, in the kitchenette', go: 'lunch_mori' },
      ], prompt: 'Who do you have lunch with?' },
    ],

    lunch_mio: [
      { set: 'lunch_mio' },
      { do: 'walk', who: 'eric', to: 'machine_front', wait: true },
      { do: 'cam', on: 'mio', zoom: 1.6 },
      '> Mio sits on the floor between the racks with a rice ball and the bag of pickles.',
      'mio: Sit. Floor is warm.',
      { choice: [
        { text: '“Why B2?”', go: 'mio_b2' },
        { text: '“The doors this morning...”', go: 'mio_doors' },
        { text: 'Eat, and say nothing', go: 'mio_quiet' },
      ] },
    ],
    mio_b2: [
      'mio: No windows. No visitors. Nobody asks me to bow.',
      'mio: And these.',
      '> She pats the nearest rack like a horse.',
      'mio: Old. Like the doors. I keep them alive.',
      { go: 'mio_lunch_end' },
    ],
    mio_doors: [
      '> She eats a pickle before she answers.',
      "mio: Maybe the doors were broken. Maybe the copier. I check logs tonight.",
      { go: 'mio_lunch_end' },
    ],
    mio_quiet: [
      { inc: 'mio_warm' },
      '> You eat. The racks hum. After a while she pushes the pickles toward you, and neither of you says anything about it.',
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
      '> One of the racks starts beeping, red and fast.',
      "mio: No, no. Not now.",
      '> She does not get up. She is watching you, not the rack.',
      'mio: {tomatte}. Stop. You say it.',
      { learn: 'tomatte', from: 'mio' },
      '> The rack keeps beeping. She waits.',
      { offer: 'tomatte', line: 'mio: Go on.' },
      { do: 'rackAlarm', state: 'off' },
      '> The beeping stops. The light goes green.',
      { if: 'mio_warm >= 1', then: ['mio: ...Okay. You can eat lunch here. Tomorrow also.'], else: ['mio: Okay. You can eat lunch here.'] },
      { do: 'cam', back: true },
    ],

    lunch_mori: [
      { set: 'lunch_mori' },
      { do: 'walk', who: 'eric', to: 'coffee_front', wait: true },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      '> Mori has laid out his bento on the kitchen table, chopsticks in their own case. He moves his tea an inch to make room. There was room.',
      { say: 'mori', text: 'ノルウェーから、ですね。私、1994年にリレハンメルへ行きました。', overheard: true, clear: [{ ja: 'ノルウェー', ro: 'noruwē', en: 'Norway' }, '1994', { ja: 'リレハンメル', ro: 'Rirehanmeru', en: 'Lillehammer' }] },
      '> Norway. 1994. Lillehammer. The Olympics. He bends his knees and mimes a ski jump, very carefully, in his cardigan.',
      { choice: [
        { text: 'Mime the landing', go: 'mori_landing' },
        { text: 'Pour his tea for him', go: 'mori_pour' },
      ] },
    ],
    mori_landing: [
      '> You stick the landing. He applauds, three small claps, and you both laugh.',
      { go: 'mori_cups' },
    ],
    mori_pour: [
      '> You fill his cup before your own. He notices. He bows from the chair, which is hard to do.',
      { go: 'mori_cups' },
    ],
    mori_cups: [
      '> On the counter behind him is a tray of seven cups. Four are clean. Three have dust in them.',
      { do: 'cam', back: true },
      { do: 'bond', who: 'mori', add: 3 },
      { call: 'mori_bond' },
      { go: 'lunch_end' },
    ],
    mori_bond_gate: [],
    mori_bond: [
      { set: 'mori_bond_done' },
      { do: 'cam', on: 'mori', zoom: 1.6 },
      '> Mori fills the thermos pot and waits for it. It plays a little tune.',
      '> He holds the first cup under the spout, looks at you, and says one word, as a suggestion.',
      'mori: {irete}.',
      { learn: 'irete', from: 'mori' },
      { offer: 'irete', line: '> Then he waits, cup ready, for you.' },
      { do: 'kettle', state: 'pour' },
      '> The pot pours. One cup, two, three, four. It does not stop. It fills all seven, the dusty ones too.',
      '> Mori looks at the seven cups. Then he picks up a dusty one and starts to wash it.',
      { do: 'cam', back: true },
    ],

    lunch_end: [
      { unset: 'lunch_on' },
      '> The hour goes.',
      '> Kenji wakes at 12:58 with the print of a soda can on his cheek.',
      { do: 'period', to: 'afternoon' },
      { set: 'afternoon_on' },
      '> 14:00. The afternoon is quiet. Everyone looks as if they could use a drink.',
      { do: 'hint', text: 'Buy a drink at the vending machine by the lift, stand next to someone and press Give. People like different things.' },
      { do: 'goal', text: 'Maybe get someone a drink. Then work at your desk.' },
    ],

    // ================================================================== AFTERNOON
    vending: [
      '> Canned coffee, royal milk tea, melon soda, corn soup. 130 yen each.',
      { choice: [
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
      'mio: Oh. The right one.',
      '> She opens it without looking away from her screen, and drinks half.',
      'mio: Okay. You are useful.',
    ],
    gift_mio_other: [
      { set: 'gifted_mio' },
      'mio: Too sweet. Coffee. Sugar is for users.',
      '> She keeps it anyway, next to the pickles.',
    ],
    gift_mori_cornsoup: [
      { set: 'gifted_mori' }, { do: 'bond', who: 'mori', add: 1 },
      '> Mori holds the corn soup in both hands, like a letter.',
      { say: 'mori', text: 'ああ、ちょうど飲みたかった。ありがとうございます。', overheard: true },
      '> Later, a clean cup of tea appears next to your keyboard.',
    ],
    gift_mori_other: [
      { set: 'gifted_mori' },
      '> He accepts it with a bow, and puts it on his desk, perfectly square to the edge. He will not drink it. He will keep it.',
    ],
    gift_kenji_melon: [
      { set: 'gifted_kenji' },
      { say: 'kenji', text: 'マジで？神！', overheard: true },
      '> He holds the can up like a trophy.',
    ],
    gift_kenji_other: [
      { set: 'gifted_kenji' },
      { say: 'kenji', text: 'あ、ありがとう…', overheard: true, clear: ['ありがとう'] },
      '> He looks at it the way you look at a present from a relative.',
    ],
    gift_again: ['> One was plenty. You get a polite look, the kind people give a man who might be trying to buy something.'],

    work_afternoon: [
      { do: 'sitDown' },
      '> You work. The racks hum, the clock ticks, the cat sleeps on your keyboard in shifts.',
      '> The afternoon goes.',
      { do: 'period', to: 'evening' },
      { set: 'evening_on' },
      '> 18:05. Mio has her hoodie zipped and the empty pickle bag folded under her arm. She stops at your desk.',
      { do: 'goal', text: 'Talk to Mio.' },
    ],
    ending: [
      { do: 'cam', on: 'mio', zoom: 1.6 },
      'mio: {ohayo} tomorrow. To Mori-san first. He waits at the lift.',
      '> She turns to go, then doesn\'t.',
      { if: 'lunch_mio', then: ['mio: Eric.'], else: ['mio: {gaijin}.'] },
      'mio: The doors this morning. The copier.',
      { if: 'door_magic', then: ['mio: My door.'] },
      { if: 'lunch_mio', then: ['mio: The rack.'] },
      { if: 'gifted_mio', then: ['> She lifts the empty coffee can, a small salute.'] },
      { if: 'lunch_mori', then: ['> Behind her, Mori is setting out seven clean cups for tomorrow.'] },
      'mio: How?',
      { do: 'save' },
      { do: 'end' },
    ],

    // ------------------------------------------------------------------ greetings to Mio
    ohayo_mio: ['mio: Too polite. I am not your boss. Just おはよう (ohayō).'],
    yoroshiku_mio: ['mio: We met. On the train. You caught my pickles.'],
    sumimasen_mio: ['mio: What. Point.'],

    // ------------------------------------------------------------------ things to poke
    desk_look: ['> Your desk. A name card in katakana that you hope says Eric.'],
    kettle: ['> An electric thermos pot. Next to it, a tray of seven cups.'],
    irete_kettle: [{ do: 'kettle', state: 'pour' }, '> The pot pours you a cup of tea.'],
    inout_board: ['> A whiteboard of magnets with names. Four in Japanese, and one new one, handwritten in capitals: ERIC.'],
    covered: ['> A monitor under a grey cloth. The name card in front of it has no dust on it. Somebody dusts it.'],
    stairs: ['> The stairwell. In the dust on the steps, a line of small paw prints.'],
    ugoite_coffee: [{ do: 'coffee' }, '> The coffee machine, which has an OUT OF ORDER sign on it, makes you a coffee.'],
    matte_clock: [{ do: 'clockStop', ms: 3000 }, '> The second hand stops. Then it jumps forward to catch up, as if nothing happened.'],
    tomatte_fan: [{ do: 'fan', state: 'off' }, '> The fan stops, mid-swing, pointing at Kenji.'],
  },
};
