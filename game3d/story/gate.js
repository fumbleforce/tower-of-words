// Place 2: the lobby gate. Eric's card isn't live until nine, and nobody here speaks English. See STORY.md.
export default {
  speakers: {
    eric: { name: 'Eric', role: 'you' },
    guard: { name: 'Guard' },
    kuroda: { name: 'Man with a briefcase' },
    kuro: { name: 'Receptionist' },
    gatev: { name: 'The gate' },
  },

  people: {
    guard: { name: 'The guard', about: 'Strict, fair, no English. Likes a proper good morning. On hold to the gate company since seven.', color: '#8ea2c8' },
  },

  start: 'lobby_in',

  on: {
    'event:card_red': [{ if: '!guard_asked', node: 'card_red' }, 'card_red_again'],
    'event:card_ok': { node: 'card_ok', once: true },
    'zone:past_gate': { node: 'past_gate', once: true },
    'zone:lift_front': { if: 'gate_through', node: 'to_lift', once: true },
    'near:bench_l': { if: 'guard_asked && !hamada_came && !gate_open_for_eric', node: 'hamada_arrives', once: true },
    'near:bench_r': { if: 'guard_asked && !hamada_came && !gate_open_for_eric', node: 'hamada_arrives', once: true },
    'near:counter': { if: 'guard_asked && !hamada_came && !gate_open_for_eric', node: 'hamada_arrives', once: true },

    'talk:guard': [{ if: '!guard_asked', node: 'guard_look' }, 'guard_again'],
    'talk:desk': [{ if: '!guard_asked', node: 'guard_look' }, 'guard_again'],
    'talk:kuro': 'kuro',
    'talk:counter': 'kuro',
    'talk:tama': { node: 'tama', once: true },
    'talk:bench_l': 'bench',
    'talk:bench_r': 'bench',
    'talk:signin': 'signin',
    'talk:screen': 'screen',
    'talk:poster_l': 'poster',
    'talk:poster_r': 'poster',
    'talk:gate': 'gate_talk',

    'say:ohayo:guard': [{ if: '!greeted_guard', node: 'ohayo_guard' }, 'greet_again_guard'],
    'say:yoroshiku:guard': [{ if: '!greeted_guard', node: 'yoroshiku_guard' }, 'greet_again_guard'],
    'say:sumimasen:guard': 'sumimasen_guard',
    'say:ohayo:kuro': 'ohayo_kuro',
    'say:sumimasen:kuro': 'sumimasen_kuro',

    'say:akete:gate': [{ if: 'gate_open_for_eric', node: 'already_open' }, 'self_open'],
    'say:akete:reader_l': [{ if: 'gate_open_for_eric', node: 'already_open' }, 'self_open'],
    'say:akete:reader_r': [{ if: 'gate_open_for_eric', node: 'already_open' }, 'self_open'],
    'say:ohayo:gate': 'ohayo_gate',
    'say:matte:gate': [{ if: '!gate_quiet', node: 'matte_gate' }, 'matte_gate_again'],
  },

  goal: { guard: '!guard_asked && !greeted_guard', lift: 'gate_through' },
  labels: { kuro: 'Receptionist', signin: 'Visitor book', guard: 'Guard' },

  nodes: {
    noop: [],

    lobby_in: [
      '> The head office lobby. Grey stone, glass, and a few hundred people trying to be on time.',
      '> A new security gate runs across the middle. It says good morning to every card, loudly, in a game-show voice. The guard beside it winces each time.',
      '> As you watch, it screams at a woman with an umbrella and shuts on her. The guard gets up, sighs, lets her through by hand, and goes back to his phone.',
      { do: 'goal', text: 'Get through the gate.' },
    ],

    // ------------------------------------------------------------------ the guard
    guard_look: [
      "> A small, very neat guard at a desk beside the gate, phone wedged against his shoulder. Cheerful hold music. On the desk, a laminated card with the gate company's logo: a cartoon gate giving a thumbs-up.",
    ],
    ohayo_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { if: 'gate_open_for_eric', then: ['> He bows back from his seat, and waves you on.', { end: true }] },
      '> He takes the phone from his ear and stands up.',
      { say: 'guard', overheard: true, text: 'おはようございます。' },
      '> A small bow, exactly as deep as yours.',
      { call: 'greet_signin' },
    ],
    yoroshiku_guard: [
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      '> He stands up to bow back, which he did not have to do.',
      { say: 'guard', overheard: true, text: 'こちらこそ、よろしくお願いします。' },
      { call: 'greet_signin' },
    ],
    greet_signin: [
      { if: 'guard_asked && !gate_open_for_eric', then: [
        '> He turns the visitor book round and holds out his pen. You sign.',
        { set: 'signed_in' },
        { if: 'hamada_came', then: [{ go: 'open_for_eric' }], else: [{ go: 'hamada_arrives' }] },
      ] },
    ],
    greet_again_guard: ['> He nods. Once was plenty.'],
    sumimasen_guard: [
      '> He looks up before you finish the word.',
      { if: 'gate_open_for_eric', then: ['> He points you to the lifts.', { end: true }] },
      { if: '!guard_asked', then: ['> He holds out his hand for your card and taps it on the reader himself.', { go: 'card_red' }] },
      '> You point at your card, then at the gate. He points at the clock. Nine.',
    ],

    card_red: [
      { set: 'guard_asked' },
      '> Two beeps. Red.',
      { say: 'gatev', overheard: true, text: 'カードを確認できません。係員にお声がけください。' },
      { do: 'cam', on: 'guard', zoom: 1.6 },
      { say: 'guard', overheard: true, text: '新しいカードですね。登録は九時からです。', clear: [{ ja: '九時', ro: 'kuji', en: "nine o'clock" }] },
      '> He taps your card, points at the clock over the lifts (8:44), and holds up nine fingers. Then, because nine fingers is untidy, he puts them away and taps his watch instead.',
      { if: 'greeted_guard', then: [
        '> He looks at you a moment longer, and straightens his cap.',
        '> He turns the visitor book round and holds out his pen.',
        '> You sign.',
        { do: 'cam', back: true },
        { set: 'signed_in' },
        { go: 'hamada_arrives' },
      ] },
      '> He points at the benches.',
      { do: 'cam', back: true },
      { do: 'goal', text: 'Get through the gate. Your card works at 9:00.' },
    ],
    card_red_again: [
      { if: 'gate_open_for_eric', then: [{ end: true }] },
      '> Red again. Without looking up, the guard holds up nine fingers.',
    ],
    guard_again: [
      { if: 'gate_open_for_eric', then: ['> He waves you through, toward the lifts.', { end: true }] },
      '> Nine fingers. The benches. The hold music plays on.',
    ],

    // ------------------------------------------------------------------ the sleeping man and the gate (開けて)
    hamada_arrives: [
      { set: 'hamada_came' },
      { do: 'rush', on: true },
      { do: 'enter', who: 'kuroda' },
      '> The sleeping man from the train runs in, company lanyard flying, briefcase hugged to his chest.',
      { say: 'kuroda', overheard: true, text: 'すみません、すみません、通ります、すみません！' },
      { do: 'reader', side: 'l', state: 'green' },
      '> Green. He steps in, and the gate screams.',
      { do: 'gate', state: 'jam' },
      { do: 'sound', name: 'no' },
      { say: 'gatev', overheard: true, text: '共連れを検知しました！お一人ずつお通りください！' },
      '> The flaps close on him mid-step. It has counted the briefcase as a person.',
      { if: 'gate_quiet', then: ['> The gate, which you silenced, has found its voice again for this.'] },
      { if: 'signed_in', then: ['> The guard, who was just reaching to open the gate for you, stops, and puts his head in his hands.'] },
      { say: 'kuroda', overheard: true, text: '{akete}…お願い、{akete}…' },
      '> He says it to the flap gently, the way you would talk to a horse.',
      { learn: 'akete', from: 'kuroda' },
      '> Nothing. The gate thanks him for his patience.',
      { choice: [
        { text: 'Say it too', go: 'hamada_help' },
        { text: 'Leave him to it', go: 'hamada_leave' },
      ] },
    ],
    hamada_help: [
      { offer: 'akete', line: '> He looks round at you, desperate, and says it once more: {akete}.' },
      { do: 'gate', state: 'slam' },
      '> The flaps fly open so hard they bounce. He stumbles through, briefcase in his arms.',
      { say: 'kuroda', overheard: true, text: 'ありがとうございます！…え？今の？' },
      { do: 'gate', state: 'closed' },
      '> The flaps snap shut again behind him. The guard hangs up on the gate company and stares at the gate, then at you.',
      { set: 'hung_up' },
      '> The man bows to both of you, and a little to the gate, and runs for a lift.',
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: false },
      { do: 'hide', id: 'kuroda' },
      { do: 'rush', on: false },
      { set: 'helped_hamada' },
      { if: 'signed_in', then: [{ go: 'open_for_eric' }] },
      '> The guard is still looking at you. He is waiting for something. Mio said: good morning first. Always.',
      { offer: 'ohayo', line: '> The guard.' },
      { set: 'greeted_guard' },
      { do: 'bond', who: 'guard', add: 1 },
      { say: 'guard', overheard: true, text: '……おはようございます。' },
      '> He presses the button under his desk.',
      { go: 'open_for_eric' },
    ],
    hamada_leave: [
      { if: 'signed_in', then: [{ go: 'hamada_leave_signed' }] },
      { say: 'guard', overheard: true, text: '頭の上に！', clear: [{ ja: '上', ro: 'ue', en: 'up' }] },
      '> The guard mimes lifting something over his head. The man lifts his briefcase high, like someone wading a river. The gate counts one person and lets him through.',
      { do: 'gate', state: 'closed' },
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: false },
      { do: 'hide', id: 'kuroda' },
      { do: 'rush', on: false },
      { choice: [
        { text: 'Try the word on the gate', go: 'try_gate' },
        { text: 'Go back and greet the guard properly', go: 'greet_after' },
        { text: 'Sit and wait for nine', go: 'wait' },
      ] },
    ],
    hamada_leave_signed: [
      { say: 'guard', overheard: true, text: '頭の上に！', clear: [{ ja: '上', ro: 'ue', en: 'up' }] },
      '> The same mime. The briefcase goes up, and the gate lets him through.',
      { do: 'walk', who: 'kuroda', to: 'lift_front', wait: false },
      { do: 'hide', id: 'kuroda' },
      { do: 'rush', on: false },
      '> Then the guard presses the button under his desk for you, and waves you on.',
      { go: 'open_for_eric' },
    ],
    greet_after: [
      { offer: 'ohayo', line: '> The guard.' },
      { go: 'ohayo_guard' },
    ],
    try_gate: [
      { offer: 'akete', line: '> The gate. The word.' },
      { go: 'self_open' },
    ],

    // ------------------------------------------------------------------ other ways through
    bench: [
      { if: '!guard_asked || gate_open_for_eric', then: ['> A dark navy bench with a view of the clock.', { end: true }] },
      { choice: [
        { text: 'Sit and wait for nine', go: 'wait' },
        { text: 'Not yet', go: 'noop' },
      ] },
    ],
    wait: [
      { do: 'walk', who: 'eric', to: 'bench_r', wait: true },
      '> You sit. The rush comes and goes. The gate says good morning to three hundred people.',
      '> 9:00 comes and goes. So do 9:01, 9:02, 9:03. At 9:04 the hold music stops. The guard listens, says something short, and hangs up. For about a second he looks almost cheerful.',
      { do: 'cardOk' },
      '> He points at you, then at the gate.',
      { do: 'goal', text: 'Tap your card at the gate.' },
    ],
    card_ok: [
      '> Green. After all that, it just opens.',
      { set: 'gate_open_for_eric' },
      { set: 'late' },
      { do: 'goal', text: 'Go through to the lifts. You are late.' },
    ],
    self_open: [
      { do: 'gate', state: 'slam' },
      '> The flaps fly open. No card. No beep.',
      '> The guard looks at the open gate, then at you. He writes something very small on his clipboard.',
      { set: 'gate_open_for_eric' },
      { do: 'goal', text: 'Go through to the lifts.' },
    ],
    open_for_eric: [
      { do: 'gate', state: 'open' },
      { set: 'gate_open_for_eric' },
      { do: 'goal', text: 'Go through to the lifts.' },
    ],
    already_open: ["> It's already open. It seems keen."],
    past_gate: [
      { set: 'gate_through' },
      { do: 'goal', text: 'Take the lift down to B2.' },
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
      '> She blinks, surprised, and sits up a little straighter.',
    ],
    sumimasen_kuro: ['> She follows your finger to the gate, and points at the guard.'],
    tama: [
      "> The calico cat from the train is eating breakfast from a steel bowl under the guard's desk.",
      { say: 'guard', overheard: true, text: '猫？何の猫ですか。', clear: [{ ja: '猫', ro: 'neko', en: 'cat' }] },
      '> He slides the bowl out of sight with his foot, and very carefully does not look at the cat.',
    ],
    signin: ["> The visitor book. The first entry today, in careful capitals: TAMA. Then something in Japanese, in the guard's handwriting."],
    screen: ['> The notice screen. Japanese, Japanese, a photo of the new gate giving a thumbs-up, Japanese.'],
    poster: ['> PEOPLE. IDEAS. PROGRESS. The only English in the lobby is on a poster.'],
    gate_talk: [{ say: 'gatev', overheard: true, text: 'おはようございます！カードをタッチしてください！' }],
    ohayo_gate: [
      { say: 'gatev', overheard: true, text: 'おはようございます！カードをタッチしてください！' },
      '> It says good morning back, twice as loud. The guard closes his eyes.',
    ],
    matte_gate_again: ['> The gate is still quiet. The guard would like it to stay that way.'],
    matte_gate: [
      { set: 'gate_quiet' },
      '> The gate stops mid-greeting. The guard looks up, and almost smiles.',
      { if: '!hung_up', then: ['> Then he hangs up on the gate company.', { set: 'hung_up' }] },
      { do: 'bond', who: 'guard', add: 1 },
      { if: 'guard_asked && !gate_open_for_eric', then: [
        '> He looks at the silent gate with deep satisfaction, then presses something under his desk for you.',
        { go: 'open_for_eric' },
      ] },
    ],
  },
};
