// Place 1: the monorail. Eric sits next to Mio, who teaches him the greetings on the way in. See STORY.md and VOICE.md.
// Each new word ends with Eric typing it ({ do: 'type' }); the cat is where he first uses the Say button.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    mio: { name: 'Mio', role: 'programmer' },
    kuroda: { name: 'Sleeping man' },
    reader: { name: 'Man with a book' },
  },

  people: {
    mio: { name: 'Mio', about: 'Programmer, B2. The only one on the team with some English. Busy.', color: '#5fc6bf' },
  },

  start: 'intro',

  on: {
    'talk:mio': [{ if: '!sat', node: 'seat' }, { if: 'cat_task', node: 'cat_nudge' }, { if: 'can_exit', node: 'mio_after' }],
    'talk:tama': 'tama',
    'talk:kuroda': 'hamada',
    'talk:aoi': 'phone_girl',
    'talk:reader': 'reader',
    'say:matte:tama': 'matte_tama',
    'say:ohayo:tama': [{ if: 'cat_task', node: 'ohayo_cat' }, 'ohayo_tama'],
    'say:ohayo:mio': { if: 'cat_task', node: 'ohayo_mio_again' },
    'say:ohayo:aoi': 'ohayo_aoi',
    'say:ohayo:reader': 'ohayo_reader',
    'say:ohayo:kuroda': 'asleep',
    'say:yoroshiku:kuroda': 'asleep',
    'say:sumimasen:kuroda': 'asleep',
    'event:arrived': 'arrival',
    'zone:door_zone': { if: 'can_exit', node: 'exit', once: true },
  },

  show: { mio: '!sat' },
  goal: { mio: '!sat', tama: 'cat_task', doors: 'can_exit' },
  labels: { mio: ['Woman with a laptop', '!mio_named'], kuroda: 'Sleeping man' },

  nodes: {
    intro: [
      { do: 'period', to: 'commute' },
      { do: 'goal', text: 'Find a seat.' },
      { do: 'hint', text: 'Tap the floor to walk. Tap people and things to look or talk.' },
    ],

    // ------------------------------------------------------------------ Mio
    seat: [
      { do: 'cam', on: 'mio', zoom: 1.6 },
      '> The train lurches.',
      { do: 'bag', state: 'slide' },
      { choice: [
        { text: 'Catch it', go: 'caught' },
        { text: 'Let it fall', go: 'dropped' },
      ] },
    ],
    caught: [
      { do: 'bag', state: 'caught' },
      { inc: 'mio_warm' },
      { say: 'mio', name: 'Woman with a laptop', text: 'Ah, sorry, sorry. Thank you.' },
      { say: 'mio', name: 'Woman with a laptop', text: "It's pickles. My mother thinks island has no food, so... every time I visit." },
      { go: 'sit' },
    ],
    dropped: [
      { do: 'bag', state: 'dropped' },
      { say: 'mio', name: 'Woman with a laptop', text: "...Okay. I think nothing broke. It's my mother's pickles." },
      { go: 'sit' },
    ],
    sit: [
      { do: 'sit', who: 'eric', at: 'seat_far_r' },
      { set: 'sat' },
      { do: 'goal', text: '' },
      { say: 'mio', name: 'Woman with a laptop', face: 'surprised', text: "Eh... B2? You're going to B2?" },
      { say: 'eric', face: 'tired', text: "Yeah, IT support. I'm the contractor, it's my first day." },
      { say: 'mio', face: 'deadpan', text: "Ahh, the IT upgrade. Mori-san said a {gaijin} is coming to fix everything. That's you?" },
      { say: 'mio', face: 'neutral', text: "I'm Mio. I'm also B2, so... same team, I guess." },
      { set: 'mio_named' },
      { choice: [
        { text: '“I\'m Eric.”', go: 'its_eric' },
        { text: '“Were you visiting your mum?”', go: 'family' },
        { text: 'Just nod', go: 'leave_it' },
      ] },
    ],
    its_eric: [
      "mio: Mm, I know. It's on your card.",
      { go: 'lesson' },
    ],
    family: [
      { inc: 'mio_warm' },
      'mio: Mm. I stayed at her place last night, on the mainland.',
      { say: 'mio', face: 'tired', text: "She always packs too much. Like I'm moving to another country." },
      { go: 'lesson' },
    ],
    leave_it: [
      { go: 'lesson' },
    ],

    // ------------------------------------------------------------------ the lesson
    lesson: [
      'mio: Ne... sorry. Where are you from?',
      'eric: Norway.',
      { say: 'mio', face: 'neutral', text: "Norway... okay. And Japanese? You speak it, like, at all?" },
      { choice: [
        { text: '“ありがとう (arigatō). That\'s about it.”', go: 'jp_one' },
        { text: '“Not really.”', go: 'jp_none' },
      ] },
    ],
    jp_one: ["mio: Okay, arigatō is good. You'll use that one a lot.", { go: 'lesson2' }],
    jp_none: [{ say: 'mio', face: 'deadpan', text: "Ah... okay. Wow." }, { go: 'lesson2' }],
    lesson2: [
      "mio: You know it's all Amakawa people on the island, right? Nobody speaks English. Even at the supermarket.",
      { say: 'mio', face: 'smile', text: "And Mori-san is going to be so polite with you, and you'll just stand there." },
      { say: 'mio', face: 'neutral', text: "えっと, okay. First one, {ohayo}. You say it to everybody in the morning. The guard at the gate is really strict about it." },
      { do: 'type', word: 'ohayo', from: 'mio', prompt: "mio: Say it to me, it's fine." },
      { say: 'mio', face: 'smile', text: "{ohayo}. Mm, okay, not bad." },
      "mio: Try the cat, over there. She rides this train every morning, she won't judge you.",
      { set: 'cat_task' },
      { do: 'goal', text: 'Say good morning to the cat.' },
      { do: 'hint', what: 'say', text: 'Tap Say, then pick the word.' },
    ],
    cat_nudge: ["mio: The cat. Go on, she won't bite."],
    ohayo_mio_again: ['mio: I heard it already. The cat.'],
    ohayo_cat: [
      { unset: 'cat_task' },
      { do: 'goal', text: '' },
      '> A slow blink.',
      { say: 'mio', face: 'smile', text: "See? She's fine with it." },
      { do: 'emote', who: 'kuroda', kind: 'zzz' },
      "mio: She's more awake than that guy, anyway. He's on this train every morning too, asleep the whole way, and like once a month he misses our stop and ends up back on the mainland.",
      { say: 'mio', face: 'neutral', text: "Anyway, when you meet someone new, it's {yoroshiku}. Like “nice to meet you”, but more like “please be nice to me”." },
      { do: 'type', word: 'yoroshiku', from: 'mio', prompt: 'mio: We just met, so... say it to me.' },
      'mio: {yoroshiku}.',
      'mio: With Mori-san, bow a little when you say it. He likes that.',
      { if: 'mio_warm >= 2', then: [
        { say: 'mio', face: 'embarrassed', text: "Here, take a pickle. My mother made, like, way too many." },
      ] },
      { go: 'approach' },
    ],

    // ------------------------------------------------------------------ arrival: すみません, then 待って
    approach: [
      { do: 'cam', back: true },
      { do: 'arrive' },
      { do: 'announce', text: '{tsugiwa} {honsha}' },
      'ann: {tsugiwa} {honsha}.',
      'mio: Oh, this is us.',
    ],
    arrival: [
      { do: 'doorsOpen' },
      { do: 'announce', text: '' },
      { do: 'stand', who: 'mio' },
      { do: 'stand', who: 'eric' },
      { do: 'walk', who: 'aoi', to: 'aisle', wait: true },
      { do: 'face', who: 'mio', to: 'aoi' },
      "mio: Ah, she's in the way... okay, one more. {sumimasen}. It means excuse me, and also sorry.",
      "mio: You'll get lost today, everybody does. Just say it and point at things. Honestly it works for almost everything.",
      { do: 'type', word: 'sumimasen', from: 'mio', prompt: 'mio: Go on, say it to her.' },
      { do: 'face', who: 'aoi', to: 'eric' },
      { say: 'aoi', overheard: true, text: 'あ、{sumimasen}！' },
      { do: 'walk', who: 'aoi', to: 'door_l', wait: true },
      { do: 'hide', id: 'aoi' },
      // the first kotodama: the doors creep shut on the sleeping man, Mio yells at them for nothing, Eric's word freezes them
      { do: 'sound', name: 'chime' },
      { do: 'doorsClose', to: 0.35, ms: 20000 },
      { do: 'face', who: 'mio', to: 'kuroda' },
      { do: 'emote', who: 'kuroda', kind: 'zzz' },
      { say: 'mio', face: 'surprised', text: "Ah, no, he's still asleep..." },
      { do: 'face', who: 'mio', to: 'door_l' },
      { do: 'gesture', who: 'mio', kind: 'point' },
      'mio: {matte}! Hey, {matte}!',
      { do: 'type', word: 'matte', from: 'mio', prompt: 'mio: Ha, okay. Your turn to look stupid.' },
      { do: 'doorsHold', kotodama: true },
      { wait: 1200 },
      { do: 'wake', who: 'kuroda' },
      { do: 'emote', who: 'kuroda', kind: '!' },
      { say: 'kuroda', face: 'panicked', text: 'あっ！{sumimasen}、{sumimasen}！', overheard: true },
      { do: 'stand', who: 'kuroda' },
      { do: 'cam', back: true },
      { do: 'walk', who: 'kuroda', to: 'door_l', wait: true },
      { do: 'hide', id: 'kuroda' },
      { set: 'held_doors' },
      { do: 'face', who: 'mio', to: 'door_l' },
      { wait: 700 },
      { say: 'mio', face: 'surprised', text: "...Doors don't do that. They stop for a bag or something, but yelling does nothing, I've tried like a hundred times." },
      { do: 'face', who: 'mio', to: 'eric' },
      { choice: [
        { text: '“Did I do that?”', go: 'did_i' },
        { text: 'Say nothing', go: 'did_quiet' },
      ] },
    ],
    did_i: [
      { say: 'mio', face: 'neutral', text: "I don't know. I said it too and nothing happened, so..." },
      { go: 'mio_tests' },
    ],
    did_quiet: [{ go: 'mio_tests' }],
    mio_tests: [
      { say: 'mio', face: 'embarrassed', text: "Um, don't tell anyone, okay? If someone makes a ticket for it, it comes to me." },
      { do: 'sound', name: 'beep' },
      "mio: あー, no, no... Sorry, a server is down, I have to run. Your card won't work until nine, I think, so you'll have to talk to the guard.",
      { if: 'mio_warm >= 2', then: [
        { say: 'mio', face: 'smile', text: "Remember, {ohayo} first. Okay, see you downstairs." },
      ], else: [
        'mio: {ohayo} first, okay? Bye, {gaijin}.',
      ] },
      { do: 'walk', who: 'mio', to: 'door_r', wait: true },
      { do: 'walk', who: 'mio', to: 'platform', wait: false },
      { set: 'can_exit' },
      { do: 'goal', text: 'Follow the crowd to head office.' },
    ],
    mio_after: ['mio: Sorry, I really have to go!'],
    exit: [
      { do: 'catTo', to: 'door_l' },
      { do: 'next' },
    ],

    // ------------------------------------------------------------------ things to poke
    tama: ['> She lets you scratch behind one ear, then goes back to watching the door.'],
    ohayo_tama: ['> A slow blink.'],
    ohayo_aoi: ['> She gives you a quick nod without taking the phone from her ear.'],
    ohayo_reader: ['> He nods, still reading.'],
    asleep: ['> He is fast asleep.'],
    matte_tama: ['> She stops washing, one paw in the air, and stares at you. Then she carries on.'],
    hamada: ['> A sticky note on his briefcase says "12F 9:00!!"'],
    phone_girl: [
      { say: 'aoi', text: 'だから今日、配属が決まるの！どこでもいいけど、地下はいや。', overheard: true },
    ],
    reader: ['> The book is called "Excel for People Who Hate Excel".'],
  },
};
