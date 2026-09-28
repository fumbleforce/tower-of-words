// Place 2: the lobby gate. Eric's card isn't live until nine; a late man gets stuck in the new gate.
// Two ways through, ending differently: the word (開けて) or the social way (すみません and a mime). See STORY.md.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    guard: { name: 'Guard' },
    kuroda: { name: 'Man with a briefcase' },
    kuro: { name: 'Receptionist' },
    gatev: { name: 'The gate' },
  },

  people: {
    guard: { name: 'The guard', about: 'Strict, fair, no English. Feeds a cat he says is not there.', color: '#8ea2c8' },
    kuroda: { name: 'Mr. Hamada', about: 'Accounts, 12th floor. Asleep on every train, late through every gate.', color: '#b3a58f' },
  },

  start: 'lobby_in',

  on: {
    'event:card_red': [{ if: '!guard_asked', node: 'card_red' }, 'card_red_again'],
    'zone:past_gate': { node: 'past_gate', once: true },
    'zone:lift_front': { if: 'gate_through', node: 'to_lift', once: true },

    'talk:guard': [{ if: 'jammed && !gate_through_way', node: 'guard_busy' }, { if: '!guard_asked', node: 'guard_look' }, 'guard_again'],
    'talk:desk': [{ if: '!guard_asked', node: 'guard_look' }, 'guard_again'],
    'talk:kuro': 'kuro',
    'talk:counter': 'kuro',
    'talk:tama': { node: 'tama', once: true },
    'talk:signin': 'signin',
    'talk:poster_l': 'poster',
    'talk:poster_r': 'poster',
    'talk:gate': 'gate_talk',

    'say:ohayo:guard': [{ if: 'jammed && !gate_through_way', node: 'jam_ohayo' },{ if: '!greeted_guard', node: 'ohayo_guard' }, 'greet_again_guard'],
    'say:yoroshiku:guard': [{ if: 'jammed && !gate_through_way', node: 'jam_ohayo' },{ if: '!greeted_guard', node: 'yoroshiku_guard' }, 'greet_again_guard'],
    'say:ohayo:kuro': 'ohayo_kuro',
    'say:matte:gate': { node: 'matte_gate', once: true },
    'say:akete:gate': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:akete:reader_l': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:akete:reader_r': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:sumimasen:guard': { if: 'jammed && !gate_through_way', node: 'way_social' },
    'talk:kuroda': { if: 'jammed && !gate_through_way', node: 'hamada_stuck' },
    'say:akete:guard': { if: 'jammed && !gate_through_way', node: 'akete_guard' },
    'say:sumimasen:kuroda': { if: 'jammed && !gate_through_way', node: 'sumi_hamada' },
    'say:sumimasen:gate': { if: 'jammed && !gate_through_way', node: 'sumi_gate' },
    'say:sumimasen:kuro': { if: 'jammed && !gate_through_way', node: 'sumi_kuro' },
    'say:matte:kuroda': { if: 'jammed && !gate_through_way', node: 'matte_hamada' },
  },

  goal: { reader_r: '!guard_asked', gate: 'jammed && !gate_through_way', lift: 'gate_through' },
  labels: { kuro: 'Receptionist', signin: 'Visitor book', guard: 'Guard' },

  nodes: {
    lobby_in: [
      { do: 'goal', text: 'Get through the gate.' },
    ],

    guard_look: [{ do: 'typing', who: 'guard', ms: 2500 }, '> Mio told you to say good morning to him first.'],
    ohayo_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { say: 'guard', overheard: true, text: '{ohayo}。' },
      { do: 'bow', who: 'eric' },
      { do: 'bow', who: 'guard' },
    ],
    yoroshiku_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { say: 'guard', overheard: true, text: 'はい、{yoroshiku}。' },
    ],
    greet_again_guard: ['> He nods again, a little shorter this time.'],

    // ------------------------------------------------------------------ the card, then the jam
    card_red: [
      { set: 'guard_asked' },
      { do: 'rush', on: false },
      { say: 'gatev', overheard: true, text: 'カードを確認できません。係員にお声がけください。' },
      { do: 'walk', who: 'eric', to: 'desk_front', wait: true },
      { do: 'face', who: 'eric', to: 'guard' },
      { do: 'cam', on: 'guard', zoom: 1.6 },
      { say: 'guard', overheard: true, text: '新しいカードですね。登録は九時からです。' },
      { do: 'gesture', who: 'guard', kind: 'point' },
      { do: 'gesture', who: 'guard', kind: 'nine' },
      { do: 'cam', on: 'before_gate', zoom: 1.3 },
      { do: 'enter', who: 'kuroda' },
      { do: 'face', who: 'eric', to: 'kuroda' },
      { say: 'kuroda', overheard: true, text: '{sumimasen}、{sumimasen}、通ります！' },
      { do: 'reader', side: 'r', state: 'green' },
      { do: 'gate', state: 'jam' },
      { do: 'emote', who: 'kuroda', kind: 'sweat' },
      { say: 'gatev', overheard: true, text: '共連れを検知しました！' },
      '> The gate has counted his briefcase as a second person.',
      { say: 'kuroda', overheard: true, text: '{akete}…お願い、{akete}…' },
      { learn: 'akete', from: 'kuroda' },
      { do: 'cam', back: true },
      { do: 'rush', on: true },
      { set: 'jammed' },
      { do: 'goal', text: 'The man is stuck in the gate.' },
      { do: 'hint', text: "Mio said if you're stuck, say すみません and point. Or try the word he keeps saying." },
    ],

    // ------------------------------------------------------------------ way 1: the word
    jam_ohayo: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { do: 'bow', who: 'guard' },
    ],
    sumi_hamada: [{ say: 'kuroda', overheard: true, text: '{sumimasen}、{sumimasen}…' }, '> He points at the guard, helplessly.'],
    sumi_gate: [{ say: 'gatev', overheard: true, text: 'お一人ずつお通りください！' }],
    sumi_kuro: [{ do: 'face', who: 'kuro', to: 'kuroda' }, '> She follows your finger to the stuck man, and points at the guard.'],
    matte_hamada: ['> He looks at you like, where would I go?'],
    akete_guard: [
      { do: 'emote', who: 'guard', kind: '?' },
      '> The guard looks at you, then down at himself, confused.',
    ],
    hamada_stuck: [
      { say: 'kuroda', overheard: true, text: '{akete}…{akete}…' },
    ],
    guard_busy: [
      { do: 'typing', who: 'guard', ms: 3000 },
      "> He hasn't noticed you. You'll have to say something.",
    ],
    word_say: [
      { set: 'gate_through_way' },
      { do: 'gate', state: 'slam' },
      { do: 'face', who: 'kuroda', to: 'eric' },
      { say: 'kuroda', overheard: true, text: 'え？今の？' },
      { do: 'emote', who: 'guard', kind: '!' },
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: true },
      { do: 'hide', id: 'kuroda' },
      { do: 'face', who: 'guard', to: 'eric' },
      "> The guard is watching you now, and he doesn't look pleased.",
      { set: 'gate_magic' },
      { do: 'gate', state: 'open' },
      { do: 'goal', text: 'Take the lift down to B2.' },
    ],

    // ------------------------------------------------------------------ way 2: the social way
    way_social: [
      { set: 'gate_through_way' },
      { if: 'greeted_guard', then: [
        { do: 'face', who: 'guard', to: 'eric' },
        '> He looks up at once.',
      ], else: [
        { do: 'typing', who: 'guard', ms: 2000 },
        { offer: 'ohayo', line: '> He keeps typing. Mio told you to say good morning first.' },
        { do: 'face', who: 'guard', to: 'eric' },
        '> He looks up, but only just.',
        { set: 'guard_cool' },
      ] },
      "> You don't know the words, so you point.",
      { go: 'mime_menu' },
    ],
    mime_menu: [
      { choice: [
        { text: 'Point at the briefcase', if: '!pt_case', go: 'pt_case' },
        { text: 'Point at the man', if: '!pt_man', go: 'pt_man' },
        { text: 'Point at the gate', if: '!pt_gate', go: 'pt_gate' },
        { text: 'Point at the cat under his desk', if: '!pt_cat', go: 'mime_cat' },
        { text: 'Mime squeezing sideways through a gap', if: 'pt_case && pt_man && !m_squeeze', go: 'mime_squeeze' },
        { text: 'Mime shoving the flap open', if: 'pt_case && pt_man && !m_shove', go: 'mime_shove' },
        { text: 'Lift an invisible case high over your head', if: 'pt_case && pt_man', go: 'mime_lift' },
      ] },
    ],
    pt_case: [
      { set: 'pt_case' },
      { do: 'look', who: 'guard', at: 'kuroda' },
      '> He follows your finger to the briefcase.',
      { if: 'pt_man', then: ["> He frowns. Yes, he knows the gate thinks they're two people."] },
      { go: 'mime_menu' },
    ],
    pt_man: [
      { set: 'pt_man' },
      { do: 'look', who: 'guard', at: 'kuroda' },
      { do: 'face', who: 'kuroda', to: 'guard' },
      '> The man gives him a small, sorry wave.',
      { if: 'pt_case', then: ["> He frowns. Yes, he knows the gate thinks they're two people."] },
      { go: 'mime_menu' },
    ],
    pt_gate: [
      { set: 'pt_gate' },
      { do: 'emote', who: 'guard', kind: '…' },
      '> He nods, very patiently. He knows about the gate.',
      { go: 'mime_menu' },
    ],
    mime_squeeze: [
      { set: 'm_squeeze' },
      '> You turn sideways and breathe in. The guard looks at the man\'s stomach and shakes his head.',
      { go: 'mime_menu' },
    ],
    mime_shove: [
      { set: 'm_shove' },
      '> You shove an invisible flap. The guard puts a hand on the gate, like you might hurt it.',
      { go: 'mime_menu' },
    ],
    mime_cat: [
      { set: 'pt_cat' },
      { do: 'look', who: 'guard', at: 'tama' },
      { say: 'guard', overheard: true, text: '猫はいません。' },
      '> He shakes his head at you, firmly.',
      { go: 'mime_menu' },
    ],
    mime_lift: [
      { do: 'emote', who: 'guard', kind: '!' },
      { if: 'guard_cool', then: [
        "> He nods once, but he doesn't laugh.",
      ], else: [
        '> He laughs once, like a cough.',
        { do: 'bond', who: 'guard', add: 1 },
      ] },
      { say: 'guard', overheard: true, text: '浜田さん！頭の上に！' },
      '> The man lifts the case over his head.',
      { do: 'gate', state: 'open' },
      { do: 'walk', who: 'kuroda', to: 'after_gate', wait: true },
      { do: 'face', who: 'kuroda', to: 'eric' },
      { say: 'kuroda', overheard: true, text: 'ありがとうございます！この方、うちの…いや、新しい方で…私がサインします！' },
      '> He hands you his business card over the barrier with both hands. HAMADA, 12F, with an extension circled.',
      { if: 'guard_cool', then: ['> The guard waves you through without a word.'], else: ['> The guard, still half laughing, waves you through.'] },
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: true },
      { do: 'hide', id: 'kuroda' },
      { do: 'rush', on: false },
      { do: 'bond', who: 'kuroda', add: 1 },
      { do: 'meet', who: 'kuroda' },
      { set: 'hamada_friend' },
      { do: 'gate', state: 'open' },
      { do: 'goal', text: 'Take the lift down to B2.' },
    ],

    card_red_again: ['> The guard taps his watch.'],
    guard_again: [
      { if: 'gate_magic', then: ["> He's watching you, and he doesn't wave you on."], else: [
        { if: 'hamada_friend && !guard_cool', then: ['> He lifts an invisible briefcase over his head at you, very slightly.'] },
        { if: 'guard_cool', then: ["> A short nod. He hasn't forgotten the good morning you skipped."] },
        { if: '!hamada_friend && !guard_cool', then: ['> He taps his watch.'] },
      ] },
    ],
    past_gate: [
      { set: 'gate_through' },
    ],
    to_lift: [
      { do: 'liftOpen' },
      { do: 'next' },
    ],

    // ------------------------------------------------------------------ things to poke
    kuro: [
      { say: 'kuro', overheard: true, text: 'いらっしゃいませ。ご用件は？' },
      '> You point at the gate. She points at the guard.',
    ],
    ohayo_kuro: [
      { say: 'kuro', overheard: true, text: '……{ohayo}。' },
      '> She sits up a little straighter.',
    ],
    tama: [
      { say: 'guard', overheard: true, text: '猫？何の猫ですか。' },
      '> He slides her bowl out of sight with his foot.',
    ],
    signin: ["> The first name in the visitor book today, in careful capitals, is TAMA."],
    poster: ["> PEOPLE. IDEAS. PROGRESS. It's the only English in the whole lobby."],
    gate_talk: [{ say: 'gatev', overheard: true, text: 'おはようございます！カードをタッチしてください！' }],
    matte_gate: [
      '> The gate stops halfway through its greeting. The guard looks up, and almost smiles.',
      { do: 'bond', who: 'guard', add: 1 },
    ],
  },
};
