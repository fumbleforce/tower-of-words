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
  },

  show: { mio: '!sat' },
  goal: { mio: '!sat', tama: 'cat_task' },
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
      { say: 'mio', emo: 'flustered', name: 'Woman with a laptop', text: 'Ah, sorry, sorry. Thank you.' },
      { say: 'mio', emo: 'sheepish', name: 'Woman with a laptop', text: "It's pickles. My mother thinks island has no food, so... every time I visit." },
      { go: 'sit' },
    ],
    dropped: [
      { do: 'bag', state: 'dropped' },
      { say: 'mio', emo: 'dry', name: 'Woman with a laptop', text: "...Okay. I think nothing broke. It's my mother's pickles." },
      { go: 'sit' },
    ],
    sit: [
      { do: 'sit', who: 'eric', at: 'seat_far_r' },
      { set: 'sat' },
      { do: 'goal', text: '' },
      { say: 'mio', emo: 'surprised', name: 'Woman with a laptop', face: 'surprised', text: "Eh... B2? You're going to B2?" },
      { say: 'eric', emo: 'tired', face: 'tired', text: "Yeah, IT support. I'm the contractor, it's my first day." },
      { say: 'mio', emo: 'dry', face: 'deadpan', text: "Ahh, you're the support contract? Mori-san said a {gaijin} is coming to help with the old machines. Amakawa never replaces anything, so, um... some of them are older than me." },
      { say: 'mio', emo: 'reluctant', face: 'neutral', text: "I'm Mio. I'm also B2, so... same team, I guess." },
      { set: 'mio_named' },
      { choice: [
        { text: '“I\'m Eric.”', go: 'its_eric' },
        { text: '“Were you visiting your mum?”', go: 'family' },
        { text: 'Just nod', go: 'leave_it' },
      ] },
    ],
    its_eric: [
      { say: 'mio', emo: 'deadpan', text: "Mm, I know. It's on your card." },
      { go: 'lesson' },
    ],
    family: [
      { inc: 'mio_warm' },
      { say: 'mio', emo: 'casual', text: "Mm. I stayed at her place last night, on the mainland." },
      { say: 'mio', emo: 'fond', face: 'tired', text: "She always packs too much. Like I'm moving to another country." },
      { go: 'lesson' },
    ],
    leave_it: [
      { go: 'lesson' },
    ],

    // ------------------------------------------------------------------ the lesson
    lesson: [
      { say: 'mio', emo: 'casual', text: "Ne... sorry. Where are you from?" },
      { say: 'eric', emo: 'tired', text: "Norway." },
      { say: 'mio', emo: 'dry', face: 'neutral', text: "Norway... okay. And Japanese? You speak it, like, at all?" },
      { choice: [
        { text: '“ありがとう (arigatō, thanks). That\'s about it.”', go: 'jp_one' },
        { text: '“Not really.”', go: 'jp_none' },
      ] },
    ],
    jp_one: [{ say: 'mio', emo: 'casual', text: "Okay, arigatō is good. You'll use that one a lot." }, { go: 'lesson2' }],
    jp_none: [{ say: 'mio', emo: 'deadpan', face: 'deadpan', text: "Ah... okay. Wow." }, { go: 'lesson2' }],
    lesson2: [
      { say: 'mio', emo: 'dry', text: "You know it's all Amakawa people on the island, right? Nobody speaks English. Even at the supermarket." },
      { say: 'mio', emo: 'amused', face: 'smile', text: "And Mori-san is going to be so polite with you, and you'll just stand there." },
      { say: 'mio', emo: 'teaching', face: 'neutral', text: "えっと, okay. First one, {ohayo}. You say it to everybody in the morning. The guard at the gate is really strict about it." },
      { do: 'type', word: 'ohayo', from: 'mio', prompt: "mio: Say it to me, it's fine." },
      { say: 'mio', emo: 'amused', face: 'smile', text: "{ohayo}. Mm, okay, not bad." },
      { say: 'mio', emo: 'amused', text: "Try the cat, over there. She rides this train every morning, she won't judge you." },
      { set: 'cat_task' },
      { do: 'goal', text: 'Say good morning to the cat.' },
      { do: 'hint', what: 'say', text: 'Tap Say, then pick the word.' },
    ],
    cat_nudge: [{ say: 'mio', emo: 'dry', text: "The cat. Go on, she won't bite." }],
    ohayo_mio_again: [{ say: 'mio', emo: 'deadpan', text: "I heard it already. The cat." }],
    ohayo_cat: [
      { unset: 'cat_task' },
      { do: 'goal', text: '' },
      '> A slow blink.',
      { say: 'mio', emo: 'amused', face: 'smile', text: "See? She's fine with it." },
      { do: 'emote', who: 'kuroda', kind: 'zzz' },
      { say: 'mio', emo: 'casual', text: "She's more awake than that guy, anyway. He's on this train every morning too, asleep the whole way, and like once a month he misses our stop and ends up back on the mainland." },
      { say: 'mio', emo: 'teaching', face: 'neutral', text: "Anyway, when you meet someone new, it's {yoroshiku}. Like “nice to meet you”, but more like “please be nice to me”." },
      { do: 'type', word: 'yoroshiku', from: 'mio', prompt: 'mio: We just met, so... say it to me.' },
      { say: 'mio', emo: 'teaching', text: "{yoroshiku}." },
      { say: 'mio', emo: 'casual', text: "With Mori-san, bow a little when you say it. He likes that." },
      { if: 'mio_warm >= 2', then: [
        { say: 'mio', emo: 'embarrassed', face: 'embarrassed', text: "Here, take a pickle. My mother made, like, way too many." },
      ] },
      { go: 'approach' },
    ],

    // ------------------------------------------------------------------ arrival: すみません, then 待って
    approach: [
      { do: 'cam', back: true },
      { do: 'arrive' },
      { do: 'announce', text: '{tsugiwa} {honsha}' },
      { say: 'ann', emo: 'announcer', text: "{tsugiwa} {honsha}." },
      { say: 'mio', emo: 'casual', text: "Oh, this is us." },
    ],
    arrival: [
      { do: 'doorsOpen' },
      { do: 'announce', text: '' },
      { do: 'stand', who: 'mio' },
      { do: 'stand', who: 'eric' },
      { do: 'walk', who: 'aoi', to: 'aisle', wait: true },
      { do: 'face', who: 'mio', to: 'aoi' },
      { say: 'mio', emo: 'dry', text: "Ah, she's in the way... okay, one more. {sumimasen}. It means excuse me, and also sorry." },
      { say: 'mio', emo: 'casual', text: "You'll get lost today, everybody does. Just say it and point at things. Honestly it works for almost everything." },
      { do: 'type', word: 'sumimasen', from: 'mio', prompt: 'mio: Go on, say it to her.' },
      { do: 'face', who: 'aoi', to: 'eric' },
      { say: 'aoi', overheard: true, emo: 'bright', text: 'あ、{sumimasen}！' },
      // 1. everyone gets off; the cat too
      { do: 'walk', who: 'aoi', to: 'door_l', wait: false },
      { do: 'alight', except: ['kuroda'] },
      { do: 'hide', id: 'aoi' },
      { do: 'catTo', to: [-3.0, 2.2] },
      { do: 'walk', who: 'mio', to: 'door_l', wait: false },
      { do: 'walk', who: 'eric', to: 'door_l', wait: true },
      { do: 'walk', who: 'mio', to: [-2.2, 2.25], wait: false },
      { do: 'walk', who: 'eric', to: [-3.0, 2.2], wait: true },
      // 2. from the platform: he's still in there, alone
      { do: 'face', who: 'mio', to: 'kuroda' },
      { do: 'cam', on: [-3.0, 0.6], zoom: 1.6 },
      { do: 'emote', who: 'kuroda', kind: 'zzz' },
      { say: 'mio', face: 'surprised', emo: 'surprised', text: "Ah... wait. The sleeping guy, he's still in there." },
      // 3. the announcement: the train goes back
      { say: 'ann', overheard: true, emo: 'announcer', text: 'この電車は、折り返し本土行きとなります。' },
      { say: 'mio', face: 'tired', emo: 'tired', text: "And now it goes back to the mainland. So today is the once a month, I guess." },
      // 4. the doors close in steps
      { do: 'chime' },
      { do: 'doorsClose', to: 0.7, ms: 1200 },
      { wait: 500 },
      { do: 'face', who: 'mio', to: 'door_l' },
      { say: 'mio', face: 'surprised', emo: 'shout', text: '{matte}! Hey, {matte}!' },
      { do: 'doorsClose', to: 0.45, ms: 1200 },
      { wait: 400 },
      { do: 'face', who: 'mio', to: 'eric' },
      { do: 'type', word: 'matte', from: 'mio', prompt: 'mio: Ha, okay. Your turn to look stupid.' },
      { do: 'doorsHold', kotodama: true },
      { wait: 1200 },
      // 5. he wakes and stumbles out; the doors wait for him, then shut, and the train goes
      { do: 'wake', who: 'kuroda' },
      { do: 'emote', who: 'kuroda', kind: '!' },
      { say: 'kuroda', face: 'panicked', overheard: true, emo: 'panicked', text: 'あっ！{sumimasen}、{sumimasen}！' },
      { do: 'stand', who: 'kuroda' },
      { do: 'walk', who: 'kuroda', to: 'door_l', wait: true },
      { do: 'walk', who: 'kuroda', to: [-3.9, 2.35], wait: true },
      { do: 'bow', who: 'kuroda', depth: 'deep' },
      { do: 'doorsClose', to: 0, ms: 900 },
      { do: 'depart' },
      { do: 'walk', who: 'kuroda', to: 'walkway', wait: false },
      { set: 'held_doors' },
      { do: 'face', who: 'mio', to: 'eric' },
      { wait: 700 },
      { say: 'mio', face: 'surprised', emo: 'baffled', text: "...Doors don't do that. They stop for a bag or something, but yelling does nothing, I've tried like a hundred times." },
      { choice: [
        { text: '“Did I do that?”', go: 'did_i' },
        { text: 'Say nothing', go: 'did_quiet' },
      ] },
    ],
    did_i: [
      { say: 'mio', face: 'neutral', emo: 'unsure', text: "I don't know. I said it too and nothing happened, so..." },
      { go: 'mio_tests' },
    ],
    did_quiet: [{ go: 'mio_tests' }],
    mio_tests: [
      { say: 'mio', face: 'embarrassed', emo: 'low', text: "Um, don't tell anyone, okay? If someone makes a ticket for it, it comes to me." },
      // her phone goes, she looks, then reacts
      { do: 'phone', who: 'mio', state: 'buzz' },
      { wait: 700 },
      { do: 'phone', who: 'mio', state: 'look' },
      { say: 'mio', face: 'tired', emo: 'groan', text: "あー, no, no... the server's down again. Sorry, I have to run." },
      { do: 'phone', who: 'mio', state: 'away' },
      { say: 'mio', emo: 'hurried', text: "Your card won't work until nine, I think, so you'll have to talk to the guard." },
      { if: 'mio_warm >= 2', then: [
        { say: 'mio', face: 'smile', emo: 'warm', text: "Remember, {ohayo} first. Okay, see you downstairs." },
      ], else: [
        { say: 'mio', emo: 'dry', text: '{ohayo} first, okay? Bye, {gaijin}.' },
      ] },
      { set: 'can_exit' },
      { do: 'walk', who: 'mio', to: 'walkway', wait: false },
      { do: 'cam', back: true },
      { do: 'next' },
    ],
    mio_after: [{ say: 'mio', emo: 'hurried', text: "Sorry, I really have to go!" }],

    // ------------------------------------------------------------------ things to poke
    tama: ['> She lets you scratch behind one ear, then goes back to watching the door.'],
    ohayo_tama: ['> A slow blink.'],
    ohayo_aoi: ['> She gives you a quick nod without taking the phone from her ear.'],
    ohayo_reader: ['> He nods, still reading.'],
    asleep: ['> He is fast asleep.'],
    matte_tama: ['> She stops washing, one paw in the air, and stares at you. Then she carries on.'],
    hamada: ['> A sticky note on his briefcase says "12F 9:00!!"'],
    phone_girl: [
      { say: 'aoi', emo: 'bright', text: 'だから今日、配属が決まるの！どこでもいいけど、地下はいや。', overheard: true },
    ],
    reader: ['> The book is called "Excel for People Who Hate Excel".'],
  },
};
