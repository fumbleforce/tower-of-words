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
    guard: { name: 'The guard', about: 'Strict, fair, no English. On hold to the gate company since seven. Feeds a cat.', color: '#8ea2c8' },
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
    'say:yoroshiku:guard': [{ if: 'jammed && !gate_through_way', node: 'jam_ohayo' },{ if: '!greeted_guard', node: 'ohayo_guard' }, 'greet_again_guard'],
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

  goal: { reader_r: '!guard_asked', lift: 'gate_through' },
  labels: { kuro: 'Receptionist', signin: 'Visitor book', guard: 'Guard' },

  nodes: {
    lobby_in: [
      '> The head office lobby. Grey stone, glass, and a few hundred people trying to be on time.',
      '> A new security gate runs across the middle. It says good morning to every card in a game-show voice. The guard beside it winces each time.',
      { do: 'goal', text: 'Get through the gate.' },
    ],

    guard_look: ["> A small, very neat guard, phone wedged against his shoulder, cheerful hold music leaking out of it. On his desk, a laminated card: the gate company's logo, a cartoon gate giving a thumbs-up."],
    ohayo_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { say: 'guard', overheard: true, text: 'おはようございます。' },
      '> He bows exactly as deep as you did. Then he goes back to his hold music, a little less grim.',
    ],
    greet_again_guard: ['> He nods. Once was plenty.'],

    // ------------------------------------------------------------------ the card, then the jam
    card_red: [
      { set: 'guard_asked' },
      '> Two beeps. Red.',
      { say: 'gatev', overheard: true, text: 'カードを確認できません。係員にお声がけください。' },
      { do: 'cam', on: 'guard', zoom: 1.6 },
      { say: 'guard', overheard: true, text: '新しいカードですね。登録は九時からです。', clear: [{ ja: '九時', ro: 'kuji', en: "nine o'clock" }] },
      '> He points at the clock (8:44) and holds up nine fingers.',
      '> Nine fingers is untidy. He puts them away and taps his watch.',
      { do: 'cam', back: true },
      { do: 'rush', on: true },
      { do: 'enter', who: 'kuroda' },
      '> Behind you, the sleeping man from the train runs in, briefcase hugged to his chest.',
      { say: 'kuroda', overheard: true, text: 'すみません、すみません、通ります！' },
      { do: 'reader', side: 'l', state: 'green' },
      '> Green. He steps in, and the gate screams.',
      { do: 'gate', state: 'jam' },
      { do: 'sound', name: 'no' },
      { say: 'gatev', overheard: true, text: '共連れを検知しました！' },
      '> The flaps close on him mid-step. It has counted the briefcase as a person.',
      '> He leans on the flap and asks it, gently, the way you would ask a horse:',
      { say: 'kuroda', overheard: true, text: '{akete}…お願い、{akete}…' },
      { learn: 'akete', from: 'kuroda' },
      '> Nothing. The gate thanks him for his patience. Behind the desk, the guard is still on hold.',
      { set: 'jammed' },
      { do: 'goal', text: 'The man is stuck in the gate.' },
      { do: 'hint', text: 'Mio said: if you are stuck, すみません and point. Or there is the word the man keeps saying.' },
    ],

    // ------------------------------------------------------------------ way 1: the word
    jam_ohayo: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      '> He glances up from the jam, bows a quick bow, and looks back at the gate. He heard you.',
    ],
    sumi_hamada: ['> He says it back to you, twice, with feeling. He is sorry too. He points at the guard, helplessly.'],
    sumi_gate: [{ say: 'gatev', overheard: true, text: 'お一人ずつお通りください！' }, '> The gate is not a person. The guard is.'],
    sumi_kuro: ['> The receptionist follows your finger to the stuck man, and points at the guard.'],
    matte_hamada: ['> He is already waiting. He has no choice.'],
    akete_guard: [
      '> The guard looks at you as if you had asked him to open himself. The word was for the gate.',
    ],
    hamada_stuck: [
      { say: 'kuroda', overheard: true, text: '{akete}…{akete}…' },
      '> He is still asking the gate. Half the queue is watching now.',
    ],
    guard_busy: [
      '> The guard is glaring at the gate, phone at his ear. He has not noticed you. You would need to say something.',
    ],
    word_say: [
      { set: 'gate_through_way' },
      { do: 'gate', state: 'slam' },
      '> Both lanes fly open. The man tumbles through. So do you.',
      '> So do two people from Sales, a woman with a cake, and everyone behind her. The alarm goes off.',
      { say: 'kuroda', overheard: true, text: 'え？今の？' },
      '> He stares at the gate, then at you, and runs for a lift.',
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: false },
      { do: 'hide', id: 'kuroda' },
      { do: 'rush', on: false },
      "> At the guard's ear, after an hour and forty minutes, the gate company finally answers. He is too busy to talk to them.",
      '> He steps out from the desk, holds out his hand for your red card, and photographs it with his phone.',
      '> He gives it back. He does not smile. He picks up the desk phone and dials a short number.',
      { set: 'gate_magic' },
      { do: 'gate', state: 'open' },
      { do: 'goal', text: 'Take the lift down to B2.' },
    ],

    // ------------------------------------------------------------------ way 2: the social way
    way_social: [
      { set: 'gate_through_way' },
      { if: 'greeted_guard', then: [
        '> He looks up at once, and takes the phone from his ear.',
      ], else: [
        '> He holds up one finger without looking: wait. The hold music plays on.',
        '> Mio said: good morning first. Always.',
        { offer: 'ohayo', line: '> The guard.' },
        '> He looks up now, but only just. The phone stays at his ear.',
        { set: 'guard_cool' },
      ] },
      '> No shared words. You will have to show him.',
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
      '> The guard looks at the briefcase.',
      { if: 'pt_man', then: ['> Briefcase. Man. The gate thinks they are two people. The guard frowns: so?'] },
      { go: 'mime_menu' },
    ],
    pt_man: [
      { set: 'pt_man' },
      '> The guard looks at the man. The man looks back, stuck.',
      { if: 'pt_case', then: ['> Briefcase. Man. The gate thinks they are two people. The guard frowns: so?'] },
      { go: 'mime_menu' },
    ],
    pt_gate: [
      { set: 'pt_gate' },
      '> The guard nods, very patiently: yes, the gate. He knows. He holds up the phone: he is on hold about it.',
      { go: 'mime_menu' },
    ],
    mime_squeeze: [
      { set: 'm_squeeze' },
      '> You turn sideways and breathe in. The guard looks at the man, who is fifty-four and had a big breakfast, and slowly shakes his head.',
      { go: 'mime_menu' },
    ],
    mime_shove: [
      { set: 'm_shove' },
      '> You shove an invisible flap. The guard puts a hand over his heart: not his new gate. Please.',
      { go: 'mime_menu' },
    ],
    mime_cat: [
      { set: 'pt_cat' },
      '> You point at the cat. The guard looks at the cat. The cat looks at the guard.',
      { say: 'guard', overheard: true, text: '猫はいません。', clear: [{ ja: '猫', ro: 'neko', en: 'cat' }] },
      '> Under the desk, the cat he says is not there goes on eating.',
      { go: 'mime_menu' },
    ],
    mime_lift: [
      '> You lift an invisible case high over your head: one person, and a case up out of the way.',
      '> The guard stares at you. Then his eyebrows go up.',
      { if: 'guard_cool', then: [
        '> He nods, once, puts the phone down and stands. No laugh.',
      ], else: [
        '> The guard laughs, once, like a cough.',
        '> He hangs up on the gate company mid-song. He stands.',
        { do: 'bond', who: 'guard', add: 1 },
      ] },
      { say: 'guard', overheard: true, text: '浜田さん！頭の上に！', clear: [{ ja: '浜田', ro: 'Hamada', en: 'Hamada' }, { ja: '上', ro: 'ue', en: 'up' }] },
      '> He shows the man, bigger. The man lifts the case over his head.',
      '> The gate counts one person, and lets him through.',
      { do: 'walk', who: 'kuroda', to: 'desk_front', wait: true },
      { say: 'kuroda', overheard: true, text: 'ありがとうございます！この方、うちの…いや、新しい方で…私がサインします！' },
      '> He signs the visitor book, points at you, then at himself: with me.',
      '> Then he presses his business card into your hand with both of his. HAMADA. 12F. An extension, circled.',
      { if: 'guard_cool', then: ['> The guard presses the button under his desk for you, without a word.'], else: ['> The guard, still half laughing, presses the button under his desk for you.'] },
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: false },
      { do: 'hide', id: 'kuroda' },
      { do: 'rush', on: false },
      { do: 'bond', who: 'kuroda', add: 1 },
      { do: 'meet', who: 'kuroda' },
      { set: 'hamada_friend' },
      { do: 'gate', state: 'open' },
      { do: 'goal', text: 'Take the lift down to B2.' },
    ],

    card_red_again: ['> Red. The guard taps his watch.'],
    guard_again: [
      { if: 'gate_magic', then: ['> The guard watches you, pen ready. He does not wave.'], else: [
        { if: 'hamada_friend && !guard_cool', then: ['> He lifts an invisible briefcase over his head at you, very slightly, and goes back to his phone.'] },
        { if: 'guard_cool', then: ['> A short nod. He still remembers you did not say good morning.'] },
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
      '> The receptionist has the stillness of someone at the end of a night shift.',
      { say: 'kuro', overheard: true, text: 'いらっしゃいませ。ご用件は？' },
      '> You point at the gate. She points at the guard.',
    ],
    ohayo_kuro: [
      { say: 'kuro', overheard: true, text: '……おはようございます。' },
      '> She blinks, and sits up a little straighter.',
    ],
    tama: [
      "> The calico cat from the train is eating breakfast from a steel bowl under the guard's desk.",
      { say: 'guard', overheard: true, text: '猫？何の猫ですか。', clear: [{ ja: '猫', ro: 'neko', en: 'cat' }] },
      '> He slides the bowl out of sight with his foot.',
    ],
    signin: ["> The visitor book. The first entry today, in careful capitals: TAMA."],
    poster: ['> PEOPLE. IDEAS. PROGRESS. The only English in the lobby is on a poster.'],
    gate_talk: [{ say: 'gatev', overheard: true, text: 'おはようございます！カードをタッチしてください！' }],
    matte_gate: [
      '> The gate stops mid-greeting. The guard looks up at the silence, and almost smiles.',
      { do: 'bond', who: 'guard', add: 1 },
    ],
  },
};
