// The winter meeting is an activity the player can join or watch. No timed text or compulsory lesson.
export const winterNodes = {
  ongoing_winter: [
    { if: '!winter_visit_seen', then: [{ call: 'club_swimming_intro' }] },
    { if: 'bondready_emi == 3 && !ms3_emi', then: [
      { do: 'winterClub', state: 'begin', organizing: true }, { if: '!winter_action_completed', then: [{ end: true }] },
      { set: 'winter_visit_seen' },
      { say: 'emi', emo: 'casual', text: 'He’s given me the booking sheet. I should check who’s coming next week before we start.' },
      { choice: [
        { text: 'Which part did you want to join?', go: 'ongoing_winter_emi_choice' },
        { text: 'Could he keep the sheet while you play?', go: 'ongoing_winter_sheet' },
        { text: 'Leave her to it for now.', go: 'ongoing_winter_free' },
      ] },
    ], else: [
      { do: 'winterClub', state: 'begin' }, { if: '!winter_action_completed', then: [{ end: true }] },
      { if: '!winter_visit_seen', then: [
        { say: 'emi', emo: 'warm', text: 'We’ve got this end of the hall. Kuro’s showing me how to keep it low. Mine keeps going up towards the lights.' },
        { set: 'winter_visit_seen' },
      ], else: [{ say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'ラケット、もう一本ありますよ。よかったら使ってください。' }] },
      { go: 'ongoing_winter_offer' },
    ] },
  ],
  ongoing_winter_emi_choice: [
    { say: 'emi', emo: 'hesitant', text: 'This, actually. I haven’t even picked up a racket yet.' },
    { go: 'ongoing_winter_sheet' },
  ],
  ongoing_winter_sheet: [
    { say: 'emi', overheard: true, emo: 'polite', text: 'すみません、これ、お願いしてもいいですか。私も少し打ちたいので。' },
    { say: 'attendant', overheard: true, emo: 'polite', text: 'はい、こちらで聞いておきます。どうぞ。' },
    { do: 'winterClub', state: 'sheetBack' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { say: 'emi', emo: 'bright', text: 'Thank you. Right, I’d like a turn before I find something else to do.' },
    { do: 'winterClub', state: 'emiTurn' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { set: 'ms3_emi' }, { do: 'bondStep', who: 'emi', to: 3 },
    { do: 'remember', who: 'emi', id: 'winter_turn', text: 'Left the booking sheet with the attendant and took her own turn.' },
    { go: 'ongoing_winter_offer' },
  ],
  ongoing_winter_offer: [
    { do: 'winterClub', state: 'group' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { choice: [
      { text: 'Take the spare racket.', go: 'ongoing_winter_try' },
      { text: 'Watch Kuro and Emi practise.', go: 'ongoing_winter_watch' },
      { text: 'Ask Kuro about swimming.', go: 'ongoing_winter_kuro' },
      { text: 'Leave them to their practice.', go: 'ongoing_winter_free' },
    ] },
  ],
  ongoing_winter_try: [
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'ゆっくり打ちますね。まず、見ていてください。' },
    { do: 'winterClub', state: 'demonstrate' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { do: 'winterClub', state: 'playerTurn' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { do: 'winterClub', state: 'group' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: '大丈夫でしたか。' },
    { choice: [
      { text: '{daijoubu}. That was all right.', if: 'know_daijoubu', go: 'ongoing_winter_ok' },
      { text: 'I’d like another try.', go: 'ongoing_winter_repeat' },
      { text: '{mouichido}. Once more?', if: 'know_mouichido', go: 'ongoing_winter_word' },
      { text: 'Let Emi have the next turn.', go: 'ongoing_winter_watch' },
      { text: 'Put the racket back.', go: 'ongoing_winter_done' },
    ] },
  ],
  ongoing_winter_ok: [{ say: 'eric', emo: 'warm', text: '{daijoubu}。' }, { go: 'ongoing_winter_done' }],
  ongoing_winter_word: [{ say: 'eric', emo: 'warm', text: '{mouichido}？' }, { go: 'ongoing_winter_repeat' }],
  ongoing_winter_repeat: [
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'はい。もう一度、ここから打ちますね。' },
    { do: 'winterClub', state: 'repeat' }, { if: '!winter_action_completed', then: [{ end: true }] }, { go: 'ongoing_winter_done' },
  ],
  ongoing_winter_watch: [
    { say: 'emi', emo: 'warm', text: 'All right, my turn. Kuro, keep it about there again?' },
    { do: 'winterClub', state: 'emiTurn' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { do: 'winterClub', state: 'group' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { say: 'emi', emo: 'amused', text: 'Could we do that again? I think I know where to stand now.' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'はい、同じところで。' },
    { do: 'winterClub', state: 'repeat' }, { if: '!winter_action_completed', then: [{ end: true }] },
    { go: 'ongoing_winter_done' },
  ],
  ongoing_winter_kuro: [
    { say: 'eric', emo: 'curious', text: 'Have you been swimming with the club for long?' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '島に来たときからです。前は一人で泳いでたんですけど、今はエミさんと。約束してると、仕事も切り上げやすくて。' },
    { say: 'emi', emo: 'casual', text: 'Since she moved here. She used to go alone, but now she gets me to come too. It gets us both out of the office.' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'amused', text: '忘れないように声をかけてって、言ったでしょう。' },
    { say: 'emi', emo: 'amused', text: 'I did ask her to remind me. Just not in front of everybody.' },
    { go: 'ongoing_winter_offer' },
  ],
  ongoing_winter_done: [
    { if: '!winter_practice_done', then: [
      { do: 'bond', who: 'emi', source: 'scene', why: 'spent a winter club practice with her' },
      { do: 'bond', who: 'kuro', source: 'scene', why: 'joined or watched her winter practice' },
      { set: 'winter_practice_done' },
      { set: 'd3_winter_intro_done' },
    ] },
    { go: 'ongoing_winter_free' },
  ],
  ongoing_winter_free: [{ do: 'winterClub', state: 'free' }, { if: '!winter_action_completed', then: [{ end: true }] }, { do: 'cam', back: true }, { do: 'ongoingGoal' }, { do: 'save' }],
};
