// Place 1: the monorail. Eric meets Mio, who gives him a quick lesson in three greetings. See STORY.md.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    mio: { name: 'Mio', role: 'programmer' },
    conductor: { name: 'Conductor' },
    kuroda: { name: 'Sleeping man' },
  },

  people: {
    mio: { name: 'Mio', about: 'Programmer, B2. The only one on the team with some English. Busy.', color: '#5fc6bf' },
  },

  start: 'intro',

  on: {
    'talk:mio': [{ if: '!sat', node: 'seat' }, { if: 'can_exit', node: 'mio_after' }],
    'talk:tama': 'tama',
    'talk:kuroda': 'hamada',
    'talk:aoi': 'phone_girl',
    'talk:reader': 'reader',
    'talk:window': 'window',
    'talk:poster': 'poster',
    'talk:plant': 'plant',
    'say:matte:tama': 'matte_tama',
    'event:arrived': 'arrival',
    'zone:door_zone': { if: 'can_exit', node: 'exit', once: true },
  },

  show: { mio: '!sat' },
  goal: { mio: '!sat', doors: 'can_exit' },
  labels: { mio: 'Woman with a laptop', kuroda: 'Sleeping man' },

  nodes: {
    intro: [
      { do: 'period', to: 'commute' },
      '> Thursday, 8:32. The monorail out to Amakawa Island.',
      "> First day. Three hours' sleep. Your Japanese is one word, ありがとう (arigatō, thank you), and you're not sure about the ending.",
      { do: 'goal', text: 'Find a seat.' },
      { do: 'hint', text: 'Tap the floor to walk. Tap people and things to look or talk.' },
    ],

    // ------------------------------------------------------------------ Mio
    seat: [
      { do: 'cam', on: 'mio', zoom: 1.6 },
      '> The only free seat is next to a young woman in a big hoodie, headphones round her neck, laptop open. A paper bag of food containers sits on the seat.',
      '> The train lurches. The bag tips.',
      { choice: [
        { text: 'Catch it', go: 'caught' },
        { text: 'Let it go', go: 'dropped' },
      ] },
    ],
    caught: [
      { inc: 'mio_warm' },
      '> You catch it. Something inside sloshes.',
      { say: 'mio', name: 'Woman with a laptop', text: "Thanks. My mother's pickles. She thinks island has no food." },
      { go: 'sit' },
    ],
    dropped: [
      '> It lands on its side. She rights it without looking up.',
      { say: 'mio', name: 'Woman with a laptop', text: "Pickles. My mother's. They survive everything." },
      { go: 'sit' },
    ],
    sit: [
      { do: 'sit', who: 'eric', at: 'seat_far_r' },
      { set: 'sat' },
      { do: 'goal', text: '' },
      '> She glances at the card on your lanyard, then looks again.',
      { say: 'mio', name: 'Woman with a laptop', text: 'B2. You are the contractor.' },
      'mio: Mio. Same team. Okay, {gaijin}.',
      { choice: [
        { text: '“It\'s Eric.”', go: 'its_eric' },
        { text: '“Your mother lives out here?”', go: 'family' },
        { text: 'Leave it', go: 'leave_it' },
      ] },
    ],
    its_eric: [
      'mio: I know.',
      '> She pulls one side of her headphones back over her ear.',
      { go: 'conductor' },
    ],
    family: [
      { inc: 'mio_warm' },
      'mio: Mm.',
      "> A long pause. You think that's the whole answer.",
      'mio: Mainland. She packs for war.',
      '> The headphones go back on. One side.',
      { go: 'conductor' },
    ],
    leave_it: [
      '> She pulls one side of her headphones back over her ear and goes back to her screen.',
      { go: 'conductor' },
    ],

    // ------------------------------------------------------------------ the lesson, as things happen
    conductor: [
      '> She takes the headphones off. A conductor is coming down the car, cap under his arm, greeting each row.',
      'mio: Japanese? You speak?',
      { choice: [
        { text: '“ありがとう (arigatō). That\'s it.”', go: 'cond_one' },
        { text: 'Shrug', go: 'cond_none' },
      ] },
    ],
    cond_one: ['mio: One word. Okay.', { go: 'cond2' }],
    cond_none: ['mio: Zero. Great.', { go: 'cond2' }],
    cond2: [
      'mio: Three words today. You get it wrong, B2 looks stupid.',
      'mio: Morning. The polite one, for anyone not your friend. {ohayo}.',
      '> The conductor reaches your row.',
      { offer: 'ohayo', line: 'mio: You. Now.' },
      { say: 'conductor', overheard: true, text: 'おはようございます！' },
      '> He beams at you as if you had given him something, and moves on to the woman with the pink hair.',
      '> She is new too, by her lanyard. She looks at you, nervous, the way you probably looked five minutes ago.',
      'mio: New people. {yoroshiku}. Small bow.',
      { choice: [
        { text: 'Say it to her, with a small bow', go: 'yoro_her' },
        { text: '“Later.”', go: 'yoro_later' },
      ] },
    ],
    yoro_her: [
      { inc: 'mio_warm' },
      { offer: 'yoroshiku', line: '> The woman with the pink hair.' },
      { say: 'aoi', overheard: true, text: 'あっ、よろしくお願いします！' },
      '> She bows back, relieved, and goes back to her phone smiling.',
      'mio: Okay. Not bad.',
      { go: 'with_me' },
    ],
    yoro_later: [
      { learn: 'yoroshiku', from: 'mio' },
      'mio: Later is today. Everyone at B2 is new people.',
      { go: 'with_me' },
    ],
    with_me: [
      { if: 'mio_warm >= 2', then: [
        '> She holds out the bag of pickles, without looking at you. You take one.',
        'mio: My mother made too many.',
      ] },
      { go: 'approach' },
    ],

    // ------------------------------------------------------------------ arrival: すみません, then 待って
    approach: [
      { do: 'cam', back: true },
      { do: 'arrive' },
      { do: 'announce', text: '{tsugiwa} {honsha}' },
      'ann: {tsugiwa} {honsha}.',
      'mio: Us.',
    ],
    arrival: [
      { do: 'doorsOpen' },
      { do: 'announce', text: '' },
      { do: 'stand', who: 'mio' },
      { do: 'stand', who: 'eric' },
      '> Everyone stands at once. The man with the Excel book is in the aisle between you and the door, reading.',
      'mio: Third. {sumimasen}. Say it, people move.',
      { offer: 'sumimasen', line: 'mio: Him.' },
      '> The man looks up and steps aside. You are moving.',
      { do: 'chime' },
      '> The door chime, early. Mio glances back: a man in a grey suit, company lanyard, still asleep on his briefcase. The doors start to close.',
      'mio: {matte}! ...Old system. Voice. Never works.',
      '> They keep closing.',
      { offer: 'matte', line: 'mio: Everyone tries once.' },
      { do: 'doorsHold' },
      '> The doors stop halfway, and stay there, humming.',
      { do: 'wake', who: 'kuroda' },
      { say: 'kuroda', text: 'あっ！すみません、すみません！', overheard: true },
      '> The sleeping man wakes and squeezes out sideways, briefcase first.',
      { do: 'walk', who: 'kuroda', to: 'door_l', wait: true },
      { do: 'hide', id: 'kuroda' },
      { set: 'held_doors' },
      '> Mio stays in the doorway a second, turns, and says it to the doors herself.',
      'mio: {matte}.',
      '> They start to close on her. She hops out onto the platform and stares at them.',
      { choice: [
        { text: '“Did I do that?”', go: 'did_i' },
        { text: 'Say nothing', go: 'did_quiet' },
      ] },
    ],
    did_i: [
      'mio: I do not know. That is worse.',
      { go: 'mio_tests' },
    ],
    did_quiet: [
      '> She waits for you to say something. You don\'t.',
      { go: 'mio_tests' },
    ],
    mio_tests: [
      "mio: ...Don't tell anyone. They'll make it a ticket.",
      '> Her phone buzzes. She reads it and hitches her bag up.',
      { if: 'mio_warm >= 2', then: [
        'mio: Server. I have to run. Your card works at nine. The guard: good morning first. Always.',
      ], else: [
        'mio: Server. I have to run. Your card works at nine, {gaijin}. The guard: good morning first. Always.',
      ] },
      { do: 'walk', who: 'mio', to: 'door_r', wait: false },
      { set: 'can_exit' },
      { do: 'goal', text: 'Follow the crowd to head office.' },
    ],
    mio_after: ['> She is already gone.'],
    exit: [
      { do: 'catTo', to: 'door_l' },
      '> A calico cat hops off ahead of you, tail up, lanyard-free.',
      { do: 'next' },
    ],

    // ------------------------------------------------------------------ things to poke
    tama: ['> A calico cat with a seat to herself, facing the door. She has somewhere to be.'],
    hamada: ['> A man in his fifties, asleep, hugging his briefcase. A sticky note on it: "12F 9:00!!"'],
    phone_girl: [
      '> A woman with pink hair, talking into her phone.',
      { say: 'aoi', text: 'だから今日、配属が決まるの！どこでもいいけど、地下はいや。', overheard: true, clear: [{ ja: '地下', ro: 'chika', en: 'basement' }] },
    ],
    reader: ['> He is reading "Excel for People Who Hate Excel". Page three. He has been on page three since you got on.'],
    window: ['> The bay, flat and silver. The monorail beam runs on ahead over the water.'],
    poster: ['> An ad: AMAKAWA, a skyline, and a family smiling at it. Everything else is in Japanese.'],
    plant: ['> A plastic plant. The soil is damp. Somebody waters it anyway.'],
    matte_tama: ['> The cat stops washing, one paw in the air, and looks at you properly. Then she goes on.'],
  },
};
