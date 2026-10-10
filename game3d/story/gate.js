// Place 2: the lobby gate. Eric's card isn't live until nine; the man from the train gets stuck in the gate.
// Two ways through, ending differently: the word (開けて) or the social way (すみません and a mime for the guard).
// At every step someone, or something on screen, shows him what to do next. See STORY.md and VOICE.md.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    guard: { name: 'Guard' },
    kuroda: { name: 'Man from the train' },
    gatev: { name: 'The gate' },
    commuter: { name: 'Office worker' },
    worker_a: { name: 'Office worker' },
    worker_b: { name: 'Office worker' },
    commuter_1: { name: 'Office worker' },
    commuter_2: { name: 'Office worker' },
    commuter_3: { name: 'Office worker' },
    miotext: { name: 'Mio', role: 'message', color: '#5fc6bf', phone: true },
  },

  schedule: {
    aoi: { '*': { hide: true } },
  },

  start: 'lobby_in',

  on: {
    'idle:worker_a': 'idle_worker_a',
    'idle:worker_b': 'idle_worker_b',
    'idle:commuter_1': { if: 'jammed && !gate_through_way', node: 'idle_commuter_1' },
    'idle:commuter_2': { if: 'jammed && !gate_through_way', node: 'idle_commuter_2' },
    'idle:commuter_3': { if: 'jammed && !gate_through_way', node: 'idle_commuter_3' },
    'event:card_red': [{ if: '!guard_asked', node: 'card_red' }, 'card_red_again'],
    'zone:past_gate': { node: 'past_gate', once: true },
    'zone:lift_front': { if: 'gate_through', node: 'to_lift', once: true },

    'talk:guard': [
      { if: 'jammed && !gate_through_way', node: 'guard_busy' },
      { if: 'gate_through_way', node: 'guard_after' },
      { if: '!greeted_guard && !guard_asked', node: 'guard_look' },
      'guard_again',
    ],
    'talk:desk': [{ if: 'jammed && !gate_through_way', node: 'guard_busy' }, { if: '!greeted_guard && !guard_asked', node: 'guard_look' }, 'guard_again'],
    'talk:bench_r': 'bench',
    'talk:kuroda': { if: 'jammed && !gate_through_way', node: 'hamada_stuck' },
    'talk:gate': [{ if: 'jammed && !gate_through_way', node: 'hamada_stuck' }, 'gate_talk'],
    'talk:counter': 'signin',
    'talk:tama': [{ node: 'tama', once: true }, 'tama_ohayo'],
    'talk:signin': 'signin',

    // greetings
    'say:ohayo:guard': [{ if: 'jammed && !gate_through_way', node: 'jam_greet' }, { if: '!greeted_guard', node: 'ohayo_guard' }, 'greet_again_guard'],
    'say:yoroshiku:guard': [{ if: 'jammed && !gate_through_way', node: 'jam_greet' }, { if: '!greeted_guard', node: 'yoroshiku_guard' }, 'greet_again_guard'],
    'say:ohayo:gate': 'ohayo_gate',
    'say:ohayo:kuroda': { if: 'jammed && !gate_through_way', node: 'greet_hamada' },
    'say:yoroshiku:kuroda': { if: 'jammed && !gate_through_way', node: 'greet_hamada' },

    // the jam: way 1 is his word, way 2 is the guard
    'say:akete:gate': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:akete:kuroda': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:akete:reader_l': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:akete:reader_r': { if: 'jammed && !gate_through_way', node: 'word_say' },
    'say:sumimasen:guard': { if: 'jammed && !gate_through_way', node: 'way_social' },
    'say:sumimasen:kuroda': { if: 'jammed && !gate_through_way', node: 'sumi_hamada' },
    'say:sumimasen:gate': { if: 'jammed && !gate_through_way', node: 'sumi_gate' },
    'say:matte:kuroda': { if: 'jammed && !gate_through_way', node: 'matte_hamada' },
    'say:matte:gate': { if: 'jammed && !gate_through_way', node: 'matte_gate' },
    'say:akete:guard': { if: 'jammed && !gate_through_way', node: 'akete_guard' },

    // Tama, who is not there
    'say:ohayo:tama': 'tama_ohayo',
    'say:matte:tama': 'tama_matte',
    'say:sumimasen:tama': 'tama_sumimasen',
  },

  goal: {
    guard: '(!greeted_guard && !guard_asked) || (jammed && !gate_through_way)',
    reader_r: '(greeted_guard || tried_english) && !guard_asked',
    kuroda: 'jammed && !gate_through_way',
    lift: 'gate_through',
  },
  labels: { signin: 'Visitor book', guard: 'Guard', bench_r: 'Bench', kuroda: 'Man from the train' },

  nodes: {
    idle_worker_a: [
      { say: 'worker_a', voice: 'gate-worker-a-ohayo', overheard: true, emo: 'polite', text: '{ohayo}。' },
      { do: 'bow', who: 'worker_a', depth: 'small' },
    ],
    idle_worker_b: [
      { say: 'worker_b', voice: 'gate-worker-b-busy', overheard: true, emo: 'polite', text: 'あ、{sumimasen}、今ちょっと…' },
      { do: 'bow', who: 'worker_b', depth: 'small' },
    ],
    idle_commuter_1: [
      { do: 'look', who: 'commuter_1', at: 'gate' },
      { say: 'commuter_1', voice: 'gate-commuter-1-wait', overheard: true, emo: 'low', text: 'ゲート、まだみたいですね…', clear: ['ゲート'] },
    ],
    idle_commuter_2: [
      { do: 'look', who: 'commuter_2', at: 'gate' },
      { say: 'commuter_2', voice: 'gate-commuter-2-wait', overheard: true, emo: 'low', text: 'ゲート、まだみたいですね…', clear: ['ゲート'] },
    ],
    idle_commuter_3: [
      { do: 'look', who: 'commuter_3', at: 'gate' },
      { say: 'commuter_3', voice: 'gate-commuter-3-wait', overheard: true, emo: 'low', text: 'ゲート、まだみたいですね…', clear: ['ゲート'] },
    ],
    // ------------------------------------------------------------------ in the door: the guard greets people, so Eric sees how it's done
    lobby_in: [
      { do: 'goal', text: 'Say good morning to the guard.' },
      { do: 'face', who: 'guard', to: 'gate' },
      { say: 'guard', voice: 'guard-greeting-ohayo', overheard: true, emo: 'polite', text: '{ohayo}。' },
      { do: 'face', who: 'guard', to: 'desk' },
      { do: 'typing', who: 'guard', ms: 3000 },
    ],

    // talking to him in English gets nothing; he doesn't look up
    guard_look: [
      { set: 'tried_english' },
      { say: 'eric', emo: 'hesitant', text: 'Hi. Um... good morning?' },
      { do: 'typing', who: 'guard', ms: 2500 },
      { do: 'emote', who: 'guard', kind: '…' },
    ],
    ohayo_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { do: 'face', who: 'guard', to: 'eric' },
      { say: 'guard', overheard: true, emo: 'polite', text: '{ohayo}。カードを、どうぞ。' },
      { do: 'bow', who: 'eric' },
      { do: 'bow', who: 'guard' },
      { call: 'guard_points_reader' },
    ],
    yoroshiku_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { do: 'face', who: 'guard', to: 'eric' },
      { say: 'guard', face: 'amused', overheard: true, emo: 'amused', text: 'はい、{yoroshiku}。カードを、どうぞ。' },
      { do: 'bow', who: 'guard' },
      { call: 'guard_points_reader' },
    ],
    // he sends Eric to the card reader
    guard_points_reader: [
      { do: 'gesture', who: 'guard', kind: 'point' },
      { do: 'goal', text: 'Tap your card on the reader.' },
    ],
    greet_again_guard: [{ do: 'bow', who: 'guard' }],

    // ------------------------------------------------------------------ the card: not until nine
    card_red: [
      { set: 'guard_asked' },
      { say: 'gatev', overheard: true, emo: 'machine', text: 'カードを確認できません。係員にお声がけください。' },
      { say: 'commuter', overheard: true, emo: 'curt', text: '…{sumimasen}。' },
      { do: 'face', who: 'guard', to: 'eric' },
      { do: 'gesture', who: 'guard', kind: 'beckon' },
      { do: 'walk', who: 'eric', to: 'desk_front', wait: true },
      { do: 'face', who: 'eric', to: 'guard' },
      { do: 'cam', on: 'guard', zoom: 1.6 },
      { if: 'greeted_guard', then: [
        { say: 'guard', face: 'neutral', overheard: true, emo: 'polite', text: '新しいカードですね。申し訳ありません、登録は九時からです。' },
      ], else: [
        { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: '新しいカードですね。登録は九時からです。' },
      ] },
      { do: 'gesture', who: 'guard', kind: 'nine' },
      { say: 'eric', emo: 'tired', text: "Right, Mio did say nine." },
      { do: 'gesture', who: 'guard', kind: 'point' },
      { do: 'face', who: 'guard', to: 'bench_r' },
      { do: 'cam', back: true },
      { do: 'goal', text: 'Wait on the bench until nine.' },
      { go: 'bench_wait' },
    ],
    card_red_again: [
      { do: 'face', who: 'guard', to: 'eric' },
      { do: 'gesture', who: 'guard', kind: 'nine' },
      { do: 'gesture', who: 'guard', kind: 'point' },
    ],
    guard_again: [
      { if: 'guard_asked && !jammed', then: [{ do: 'gesture', who: 'guard', kind: 'nine' }], else: [
        { do: 'face', who: 'guard', to: 'eric' },
        { do: 'bow', who: 'guard' },
      ] },
    ],
    bench: [{ do: 'sit', who: 'eric', at: 'bench_r' }],

    // ------------------------------------------------------------------ the wait, and the man from the train
    bench_wait: [
      { do: 'walk', who: 'eric', to: 'bench_r', wait: true },
      { do: 'sit', who: 'eric', at: 'bench_r' },
      { wait: 900 },
      '> 8:52.',
      { do: 'cam', on: 'before_gate', zoom: 1.3 },
      { do: 'enter', who: 'kuroda' },
      { say: 'kuroda', face: 'panicked', overheard: true, emo: 'panicked', text: '{sumimasen}、{sumimasen}、通ります！' },
      { do: 'reader', side: 'r', state: 'green' },
      { do: 'gate', state: 'jam' },
      { do: 'emote', who: 'kuroda', kind: 'sweat' },
      { do: 'cam', on: 'gate', zoom: 2.5 }, // close on the arch's count screen: a person, a briefcase, a red 2
      { say: 'gatev', overheard: true, emo: 'machine', text: '共連れを検知しました！' },
      "> The gate counts the man and his briefcase as two people. He's stuck.",
      { do: 'cam', on: 'before_gate', zoom: 1.3 },
      { do: 'face', who: 'kuroda', to: 'gate' },
      { say: 'kuroda', face: 'panicked', emo: 'slow', slow: true, text: '{akete}...' },
      '> He mimes pulling the gate open.',
      // the guard calls the gate company and gets hold music
      { do: 'phone', who: 'guard', state: 'on' },
      { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: 'はい、アマカワ{honsha}、正面ゲートです。…はい。待ちます。' },
      { set: 'jammed' },
      { do: 'cam', back: true },
      { do: 'stand', who: 'eric' },
      // Mio, from B2, in place of a hint
      { say: 'miotext', text: 'the lobby gate again? is that you? say {sumimasen} to the guard and show him' },
      { do: 'goal', text: 'The man is stuck. Help him, or get the guard.' },
    ],

    // ------------------------------------------------------------------ way 1: his word
    hamada_stuck: [
      { do: 'face', who: 'kuroda', to: 'eric' },
      { do: 'face', who: 'eric', to: 'kuroda' },
      { do: 'face', who: 'kuroda', to: 'gate' },
      { choice: [
        { text: 'Say 開けて (akete, open) with him', go: 'word_type' },
        { text: 'Leave him to it', go: 'noop' },
      ], prompt: "> He's still stuck in the gate." },
    ],
    word_type: [
      { do: 'type', word: 'akete', from: 'kuroda', prompt: 'kuroda: {akete}...' },
      { go: 'word_say' },
    ],
    word_say: [
      { set: 'gate_through_way' },
      { do: 'gate', state: 'slam' },
      { do: 'kotodama', target: 'gate' },
      { do: 'emote', who: 'guard', kind: '!' },
      { do: 'face', who: 'kuroda', to: 'eric' },
      { say: 'kuroda', face: 'neutral', overheard: true, emo: 'surprised', text: 'え？今の…？' },
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: true },
      { do: 'hide', id: 'kuroda' },
      { do: 'gate', state: 'open' },
      { do: 'face', who: 'guard', to: 'eric' },
      { do: 'phone', who: 'guard', state: 'off' },
      { say: 'eric', emo: 'whisper', text: "The train doors, and now this..." },
      { set: 'gate_magic' },
      { do: 'look', who: 'guard', at: 'gate' },
      { wait: 700 },
      { do: 'look', who: 'guard', at: 'eric' },
      { wait: 700 },
      { do: 'gesture', who: 'guard', kind: 'point' },
      { do: 'face', who: 'guard', to: 'lift' },
      { do: 'goal', text: 'Leave the station and walk to head office.' },
    ],
    guard_after: [
      { if: 'gate_magic', then: [
        { do: 'face', who: 'guard', to: 'eric' },
        { do: 'emote', who: 'guard', kind: '?' },
        { do: 'gesture', who: 'guard', kind: 'point' },
      ], else: [
        { if: 'guard_cool', then: [{ do: 'face', who: 'guard', to: 'eric' }, { do: 'gesture', who: 'guard', kind: 'point' }], else: [
          { do: 'face', who: 'guard', to: 'eric' },
          { do: 'gesture', who: 'guard', kind: 'lift' },
          { do: 'emote', who: 'guard', kind: '♪' },
        ] },
      ] },
    ],

    // ------------------------------------------------------------------ way 2: get the guard, and show him
    guard_busy: [
      { do: 'face', who: 'guard', to: 'eric' },
      { say: 'guard', face: 'stern', overheard: true, emo: 'curt', text: '少々お待ちください。' },
      { do: 'face', who: 'guard', to: 'desk' },
      { do: 'emote', who: 'guard', kind: '…' },
    ],
    jam_greet: [
      { set: 'late_greet' },
      { do: 'face', who: 'guard', to: 'eric' },
      { do: 'bow', who: 'guard' },
      { do: 'face', who: 'guard', to: 'desk' },
    ],
    way_social: [
      { set: 'gate_through_way' },
      { if: 'greeted_guard', then: [
        { do: 'face', who: 'guard', to: 'eric' },
        { do: 'expression', who: 'guard', face: 'neutral' },
      ], else: [
        { do: 'face', who: 'guard', to: 'eric' },
        { do: 'expression', who: 'guard', face: 'stern' },
        { set: 'guard_cool' },
      ] },
      { say: 'guard', overheard: true, emo: 'curt', text: 'はい？' },
      { go: 'mime_menu' },
    ],
    mime_menu: [
      { choice: [
        { text: 'Mime lifting the briefcase over the gate', go: 'mime_lift' },
        { text: 'Mime squeezing sideways through a gap', if: '!m_squeeze', go: 'mime_squeeze' },
        { text: 'Point at the cat under his desk', if: '!pt_cat', go: 'mime_cat' },
      ], prompt: "> You don't have the words for this." },
    ],
    mime_cat: [
      { set: 'pt_cat' },
      { do: 'gesture', who: 'eric', kind: 'point', to: 'tama' },
      { do: 'look', who: 'guard', at: 'tama' },
      { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: '猫はいません。' },
      { go: 'mime_menu' },
    ],
    mime_squeeze: [
      { set: 'm_squeeze' },
      { do: 'gesture', who: 'eric', kind: 'squeeze' },
      '> You mime squeezing past the briefcase.',
      { do: 'look', who: 'guard', at: 'kuroda' },
      { say: 'guard', overheard: true, emo: 'dry', text: '…無理ですね。' },
      { go: 'mime_menu' },
    ],
    mime_lift: [
      { do: 'gesture', who: 'eric', kind: 'lift' },
      { do: 'emote', who: 'guard', kind: '!' },
      { if: 'guard_cool', then: [
        { do: 'expression', who: 'guard', face: 'stern' },
      ], else: [
        { say: 'guard', face: 'amused', overheard: true, emo: 'laugh', text: 'ははっ。' },
        { do: 'bond', who: 'guard', add: 1 },
      ] },
      { do: 'face', who: 'guard', to: 'kuroda' },
      { do: 'gesture', who: 'guard', kind: 'lift' },
      { say: 'guard', overheard: true, emo: 'shout', text: '浜田さん！かばん、頭の上！' },
      { do: 'gesture', who: 'kuroda', kind: 'lift' },
      { do: 'gate', state: 'open' },
      { do: 'walk', who: 'kuroda', to: 'after_gate', wait: true },
      // the gate company picks up, just now
      { say: 'guard', overheard: true, emo: 'dry', text: '…あ、もしもし。いえ、もう大丈夫です。' },
      { do: 'phone', who: 'guard', state: 'off' },
      { do: 'face', who: 'kuroda', to: 'eric' },
      { say: 'kuroda', face: 'neutral', overheard: true, emo: 'warm', text: 'ありがとうございます！本当に、{sumimasen}…', clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
      { do: 'bow', who: 'kuroda', depth: 'deep' },
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: true },
      { do: 'hide', id: 'kuroda' },
      { do: 'bond', who: 'kuroda', add: 1 },
      { do: 'meet', who: 'kuroda' },
      { set: 'hamada_friend' },
      // the guard lets Eric through before nine
      { do: 'face', who: 'guard', to: 'eric' },
      { do: 'gesture', who: 'guard', kind: 'point' },
      { if: 'guard_cool', then: [
        { say: 'guard', overheard: true, emo: 'curt', text: 'どうぞ。' },
      ], else: [
        { say: 'guard', face: 'amused', overheard: true, emo: 'warm', text: 'どうぞ、どうぞ。' },
      ] },
      { say: 'eric', emo: 'tired', text: 'Arigatō.' },
      { do: 'goal', text: 'Leave the station and walk to head office.' },
    ],

    // wrong words during the jam, answered honestly
    sumi_hamada: [
      { say: 'kuroda', face: 'panicked', overheard: true, emo: 'flustered', text: '{sumimasen}、{sumimasen}…' },
      { do: 'bow', who: 'kuroda' },
      { do: 'face', who: 'kuroda', to: 'guard' },
    ],
    greet_hamada: [
      { say: 'kuroda', face: 'panicked', overheard: true, emo: 'flustered', text: 'あ、{ohayo}…{sumimasen}、今ちょっと…' },
      { do: 'face', who: 'kuroda', to: 'gate' },
    ],
    sumi_gate: [{ say: 'gatev', overheard: true, emo: 'machine', text: 'お一人ずつお通りください！' }],
    matte_hamada: [
      { do: 'face', who: 'kuroda', to: 'eric' },
      { say: 'kuroda', face: 'panicked', overheard: true, emo: 'surprised', text: '待って…？待ってますけど…' },
    ],
    matte_gate: [
      { say: 'gatev', overheard: true, emo: 'machine', text: '共連れを検知しました！' },
      { do: 'face', who: 'kuroda', to: 'eric' },
      { do: 'emote', who: 'kuroda', kind: '?' },
    ],
    akete_guard: [
      { do: 'face', who: 'guard', to: 'eric' },
      { do: 'emote', who: 'guard', kind: '?' },
      { do: 'look', who: 'guard', at: 'desk' },
    ],

    past_gate: [
      { set: 'gate_through' },
    ],
    to_lift: [
      { do: 'liftOpen' },
      { do: 'next' },
    ],
    noop: [],

    // ------------------------------------------------------------------ things to poke
    ohayo_gate: [
      { say: 'gatev', overheard: true, emo: 'machine', text: '{ohayo}！カードをタッチしてください！' },
      { do: 'reader', side: 'r', state: 'red' },
    ],
    gate_talk: [{ say: 'gatev', overheard: true, emo: 'machine', text: '{ohayo}！カードをタッチしてください！' }],
    tama: [
      { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: '猫？何の猫ですか。' },
      { do: 'hide', id: 'bowl' },
    ],
    tama_ohayo: [
      { do: 'emote', who: 'tama', kind: 'heart' },
      { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: '猫はいません。' },
    ],
    tama_matte: [
      '> Tama freezes with her head in the bowl.',
      { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: '猫はいません。' },
    ],
    tama_sumimasen: [
      { do: 'catTo', to: 'desk_front' },
      { say: 'guard', face: 'stern', overheard: true, emo: 'stern', text: '猫はいません。' },
    ],
    signin: ["> TAMA is the first name in today's visitor book."],
  },
};
