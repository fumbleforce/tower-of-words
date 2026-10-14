// Pool sessions reuse the original changing rooms, equipment and swimming choreography.
const action = (state, extra = {}) => [
  { do: 'poolSession', state, ...extra }, { if: '!pool_action_completed', then: [{ end: true }] },
];
export const swimmingNodes = {
  ongoing_swimming: [
    { if: '!d3_swim_done', then: [{ unset: 'swimming_repeat_visit' }, { go: 'club_swimming_1' }] },
    { set: 'swimming_repeat_visit' }, { unset: 'd3_player_swims' },
    ...action('begin', { repeat: true }), ...action('list', { from: 'attendant' }),
    { if: 'bondready_emi == 3 && !ms3_emi', then: [
      { say: 'emi', emo: 'casual', text: 'He’s given me the booking sheet. I should check who’s coming next week before we get in.' },
      { choice: [
        { text: 'Which part did you want to join?', go: 'ongoing_swimming_emi_choice' },
        { text: 'Could he keep the sheet while you swim?', go: 'ongoing_swimming_sheet' },
        { text: 'Leave her to it for now.', go: 'ongoing_swimming_free' },
      ] },
    ], else: [
      { say: 'emi', emo: 'warm', text: 'Fancy a swim? Or you can sit with us by the water.' },
      { go: 'ongoing_swimming_offer' },
    ] },
  ],
  ongoing_swimming_offer: [
    { choice: [
      { text: 'Swim with Kuro.', go: 'ongoing_swimming_join' },
      { text: 'Sit on the deck and watch.', go: 'ongoing_swimming_watch' },
      { text: 'Ask Kuro about swimming.', go: 'ongoing_swimming_kuro' },
      { text: 'Leave them to their evening.', go: 'club_swimming_leave_early' },
    ] },
  ],
  ongoing_swimming_deck: [{ do: 'sit', who: 'eric', at: 'deck_bench_s' }, { go: 'ongoing_swimming_length' }],
  ongoing_swimming_length: [
    ...action('emiEnter'), ...action('length'),
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: 'もう一本、泳ぎませんか。' },
    { say: 'emi', emo: 'bright', text: 'One more length? Yes, we’ve got time.' },
    ...action('another'), { call: 'ongoing_swimming_done' }, { do: 'save' },
    { choice: [
      { text: 'Sit with them after the swim.', go: 'ongoing_swimming_sit' },
      { text: 'Say goodnight and leave the pool.', go: 'club_swimming_goodnight' },
    ] },
  ],
  ongoing_swimming_sit: [...action('sit'), { go: 'ongoing_swimming_seated' }],
  ongoing_swimming_emi_choice: [
    { say: 'emi', emo: 'hesitant', text: 'Swimming, actually. I haven’t even got in yet.' },
    { go: 'ongoing_swimming_sheet' },
  ],
  ongoing_swimming_sheet: [
    { say: 'emi', overheard: true, emo: 'casual', text: '{sumimasen}、これ、お願いできますか？' },
    { say: 'attendant', overheard: true, emo: 'polite', text: 'はい、預かりますね。' },
    ...action('sheetBack'),
    { say: 'emi', emo: 'bright', text: 'Thank you. I’d like to get a length in before I find something else to do.' },
    ...action('emiEnter'), ...action('length'), ...action('sit'),
    { set: 'ms3_emi' }, { do: 'bondStep', who: 'emi', to: 3 },
    { do: 'remember', who: 'emi', id: 'winter_turn', text: 'Left the booking sheet with the attendant and went swimming.' },
    { call: 'ongoing_swimming_done' }, { go: 'ongoing_swimming_seated' },
  ],
  ongoing_swimming_kuro: [
    { say: 'eric', emo: 'curious', text: 'Have you been swimming with the club for long?' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '島に来たときからです。前は一人で泳いでたんですけど、今はエミさんと。約束してると、仕事も切り上げやすくて。' },
    { say: 'emi', emo: 'casual', text: 'Since she moved here. She used to go alone, but now she gets me to come too. It gets us both out of the office.' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'amused', text: '忘れないように声をかけてって、言ったでしょう。' },
    { say: 'emi', emo: 'amused', text: 'I did ask her to remind me. Just not in front of everybody.' },
    { go: 'ongoing_swimming_offer' },
  ],
  ongoing_swimming_done: [
    { if: '!swim_practice_done && !winter_practice_done', then: [
      { do: 'bond', who: 'emi', source: 'scene', why: 'spent a swimming club evening with her' },
      { do: 'bond', who: 'kuro', source: 'scene', why: 'joined or watched her swimming practice' },
      { set: 'swim_practice_done' },
    ] },
  ],
  ongoing_swimming_seated: [
    ...action('free', { staySeated: true }), { do: 'cam', back: true }, { do: 'ongoingGoal' }, { do: 'save' },
  ],
  ongoing_swimming_free: [
    ...action('free'), { do: 'cam', back: true }, { do: 'ongoingGoal' }, { do: 'save' },
  ],
  // Continue-only tails for exact historical gym effect journals. The physical action already happened.
  swimming_resume_emi: [
    { set: 'ms3_emi' }, { do: 'bondStep', who: 'emi', to: 3 },
    { do: 'remember', who: 'emi', id: 'winter_turn', text: 'Left the booking sheet with the attendant and took her own turn.' },
    { go: 'swimming_resume_free' },
  ],
  swimming_resume_practice: [
    { if: '!winter_practice_done', then: [
      { do: 'bond', who: 'emi', source: 'scene', why: 'spent a swimming club evening with her' },
      { do: 'bond', who: 'kuro', source: 'scene', why: 'joined or watched her swimming practice' },
      { set: 'winter_practice_done' }, { set: 'd3_winter_intro_done' },
    ] },
    { set: 'd3_swimming_shared' }, { go: 'swimming_resume_free' },
  ],
  swimming_resume_free: [{ do: 'cam', back: true }, { do: 'ongoingGoal' }, { do: 'save' }],
};
