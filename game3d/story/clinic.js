// The island's clinic, the ground floor of block_e1 off the plaza's cross walk (docs/game/places.md, Clinic). The
// nurse at reception, the examination bed, the door back out. After a fall (places/clinic-fall.js sets `fell_from`
// and counts `falls`), Eric comes to on the examination bed and `wake` plays from the start node.
export default {
  speakers: { clinic_nurse: { name: 'Nurse' } },
  start: 'arrive',
  on: {
    'talk:clinic_exit': 'leave',
    'talk:clinic_nurse': [
      { if: 'falls >= 1', node: 'nurse_after' },
      { if: 'clinic_met', node: 'nurse_again' },
      'nurse',
    ],
    'talk:exam_bed': 'bed',
  },
  nodes: {
    arrive: [{ if: 'fell_from', then: [{ call: 'wake' }] }, { set: 'clinic_visited' }],
    leave: [{ do: 'trip', to: 'plaza' }],
    bed: [{ do: 'sit', who: 'eric', at: 'exam_bed' }],
    nurse: [
      { do: 'face', who: 'clinic_nurse', to: 'eric' },
      { say: 'clinic_nurse', overheard: true, emo: 'polite', text: 'こんにちは。今日は、どうしましたか？' },
      { say: 'eric', emo: 'polite', text: 'Oh, I’m not ill. I only wanted to see where the clinic was.' },
      { do: 'gesture', who: 'clinic_nurse', kind: 'point', to: [1.55, -6.8] },
      { say: 'clinic_nurse', overheard: true, emo: 'warm', text: '毎日、やってますよ。夜も。' },
      { say: 'eric', emo: 'warm', text: 'The board by the counter says every day, and a nurse at night.' },
      { do: 'bow', who: 'clinic_nurse', depth: 'small' },
      { set: 'clinic_met' },
    ],
    nurse_again: [
      { do: 'face', who: 'clinic_nurse', to: 'eric' },
      { say: 'clinic_nurse', overheard: true, emo: 'polite', voice: 'clinic-nurse-hello', text: 'こんにちは。' },
      { do: 'bow', who: 'clinic_nurse', depth: 'small' },
    ],
    // once she has had him on the bed, she asks after his head
    nurse_after: [
      { do: 'face', who: 'clinic_nurse', to: 'eric' },
      { say: 'clinic_nurse', overheard: true, emo: 'dry', text: '頭は、{daijoubu}ですか？' },
      { do: 'gesture', who: 'clinic_nurse', kind: 'point', to: 'eric' },
      {
        if: 'know_daijoubu',
        then: [{ say: 'eric', emo: 'warm', text: '{daijoubu}. Thanks.' }],
        else: [{ say: 'eric', emo: 'warm', text: 'She’s pointing at my head. It’s fine, thanks.' }],
      },
      { set: 'clinic_met' },
    ],
    // after a fall: he is sitting on the examination bed, the nurse beside it (places/clinic.js)
    wake: [
      { do: 'face', who: 'clinic_nurse', to: 'eric' },
      { if: 'falls > 1', then: [{ go: 'wake_again' }] },
      { say: 'clinic_nurse', overheard: true, emo: 'calm', text: 'あ、起きましたね。' },
      {
        if: "fell_from == 'dorms'",
        then: ['> Someone from your building found you on the ground outside and walked you here.'],
        else: ['> Someone found you where you landed and walked you here.'],
      },
      { say: 'clinic_nurse', overheard: true, emo: 'polite', text: '{daijoubu}ですか？どこが痛いですか？' },
      { do: 'gesture', who: 'clinic_nurse', kind: 'point', to: 'eric' },
      {
        choice: [
          { text: 'Touch the back of your head: it hurts there.', go: 'wake_head' },
          { text: '{daijoubu}.', if: 'know_daijoubu', go: 'wake_fine' },
          { text: 'Tell her you’re fine.', if: '!know_daijoubu', go: 'wake_fine' },
        ],
      },
    ],
    wake_head: [
      { say: 'eric', emo: 'tired', text: '頭が……痛いです。' },
      { do: 'gesture', who: 'clinic_nurse', kind: 'nod' },
      { say: 'clinic_nurse', overheard: true, emo: 'calm', text: '頭ですね。ちょっと、見せてください。' },
      { do: 'look', who: 'clinic_nurse', at: 'eric' },
      { go: 'wake_jump' },
    ],
    wake_fine: [
      {
        if: 'know_daijoubu',
        then: [{ say: 'eric', emo: 'warm', text: '{daijoubu}。' }],
        else: [{ say: 'eric', emo: 'tired', text: 'I’m fine. Really.' }],
      },
      { say: 'clinic_nurse', overheard: true, emo: 'dry', text: '本当に？' },
      { do: 'emote', who: 'clinic_nurse', kind: '?' },
      { go: 'wake_jump' },
    ],
    wake_jump: [
      {
        if: "fell_from == 'dorms'",
        then: [{ say: 'clinic_nurse', overheard: true, emo: 'dry', text: 'ベランダから、ジャンプ？', clear: ['ベランダ', 'ジャンプ'] }],
        else: [{ say: 'clinic_nurse', overheard: true, emo: 'dry', text: 'ジャンプ、ですか？', clear: ['ジャンプ'] }],
      },
      { say: 'eric', emo: 'dry', text: 'In my defence, it looked lower from up there.' },
      { say: 'clinic_nurse', overheard: true, emo: 'dry', text: 'ジャンプは、だめです。', clear: ['ジャンプ'] },
      { say: 'eric', emo: 'dry', text: 'I caught “jump”, and then something that sounded a lot like no.' },
      { go: 'wake_end' },
    ],
    // the second time and after: she knows him
    wake_again: [
      { say: 'clinic_nurse', overheard: true, emo: 'dry', text: 'また、あなたですか。' },
      '> She doesn’t ask where it hurts this time.',
      { say: 'clinic_nurse', overheard: true, emo: 'dry', text: 'ジャンプは、だめですよ。', clear: ['ジャンプ'] },
      { say: 'eric', emo: 'dry', text: 'Jump, and no. I remember that part.' },
      { go: 'wake_end' },
    ],
    wake_end: [
      { do: 'bow', who: 'clinic_nurse', depth: 'small' },
      { unset: 'fell_from' },
      { do: 'walk', who: 'clinic_nurse', to: 'nurse_desk', wait: false },
      { do: 'cam', back: true },
      { do: 'goal', text: 'Head back out to the plaza.', at: 'clinic_exit' },
      { do: 'save' },
    ],
  },
};
