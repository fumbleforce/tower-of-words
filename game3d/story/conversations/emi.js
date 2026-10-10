export default {
  on: { 'ask:emi': 'chat_emi' },
  nodes: {
    chat_emi: [
      { if: "place == 'office' && period_morning && (day == 1 || day == 2 || day == 5 || ongoing_workday)", then: [
        { say: 'emi', emo: 'apologetic', text: 'Can we catch up later? I need to get these requests upstairs before the meeting starts.' },
        { end: true },
      ] },
      { do: 'face', who: 'eric', to: 'emi' }, { do: 'face', who: 'emi', to: 'eric' }, { do: 'cam', on: 'emi', zoom: 1.3, conversation: 'emi' },
      { choice: [
        { text: 'What made you join the swimming club?', go: 'chat_emi_club', if: '!chat_emi_club_known', needs: ['emi.swimming_club'] },
        { text: 'Are you getting much time to join in?', go: 'chat_emi_turn', if: 'chat_emi_club_known', needs: ['emi.swimming_club'] },
        { text: 'What makes things easier for you at work?', go: 'chat_emi_team' },
        { text: 'How do I ask someone to say it again?', go: 'chat_emi_repeat_word', if: '!know_mouichido' },
        { text: 'I’ll let you get on.', go: 'chat_emi_leave' },
      ] },
    ],
    chat_emi_club: [
      { say: 'eric', emo: 'curious', text: 'What made you join the swimming club?' },
      { say: 'emi', emo: 'warm', text: 'I wanted an evening where I wasn’t somebody’s team lead. Kuro said I could just come along.' },
      { say: 'emi', emo: 'sheepish', text: 'Then someone asked about the booking and I knew who to call.' },
      { choice: [
        { text: 'You don’t have to volunteer every time.', go: 'chat_emi_volunteer' },
        { text: 'Do you still enjoy going?', go: 'chat_emi_enjoy' },
      ] },
    ],
    chat_emi_volunteer: [
      { say: 'emi', emo: 'amused', text: 'I know. I hear a question and I’ve answered it before I remember I could have kept quiet.' },
      { go: 'chat_emi_club_memory' },
    ],
    chat_emi_enjoy: [
      { say: 'emi', emo: 'warm', text: 'Yes, I do. Once we actually start, I’m glad I came.' },
      { go: 'chat_emi_club_memory' },
    ],
    chat_emi_club_memory: [
      { set: 'chat_emi_club_known' },
      { do: 'remember', who: 'emi', id: 'club_member', text: 'Joined the club to spend an evening away from being a team lead.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_turn: [
      { say: 'eric', emo: 'curious', text: 'Are you getting much time to join in?' },
      { if: 'ms3_emi', then: [
        { say: 'emi', emo: 'warm', text: 'Yes. I got a turn this time. Someone else kept the booking sheet.' },
        { say: 'eric', emo: 'warm', text: 'Good. I thought you wanted that turn.' },
      ], else: [
        { say: 'emi', emo: 'casual', text: 'Some. Next time, if I start collecting everybody’s names, remind me I came to do something else.' },
        { say: 'eric', emo: 'warm', text: 'I can do that.' },
      ] },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_team: [
      { say: 'eric', emo: 'curious', text: 'What makes things easier for you at work?' },
      { say: 'emi', emo: 'casual', text: 'Tell me what you’ve actually checked. If something still fails, I’d rather hear that than promise upstairs that it’s fixed.' },
      { say: 'emi', emo: 'sheepish', text: 'I’m trying to stop making the promise first.' },
      { choice: [
        { text: '{daijoubu}. I’ll tell you if I’m stuck.', go: 'chat_emi_ok', if: 'know_daijoubu' },
        { text: 'I’ll bring you the result, even if it’s bad.', go: 'chat_emi_result' },
        { text: 'I’m still learning what people are asking for.', go: 'chat_emi_language' },
      ] },
    ],
    chat_emi_ok: [
      { say: 'eric', emo: 'warm', text: '{daijoubu}. I’ll tell you if I’m stuck.' },
      { go: 'chat_emi_result_reply' },
    ],
    chat_emi_result: [
      { say: 'eric', emo: 'warm', text: 'I’ll bring you the result, even if it’s bad.' },
      { go: 'chat_emi_result_reply' },
    ],
    chat_emi_result_reply: [
      { say: 'emi', emo: 'warm', text: 'Good. It gives me something I can explain, at least.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_language: [
      { say: 'emi', emo: 'warm', text: 'Ask them to show you. And you can ask again. You’re allowed to take a moment.' },
      { if: '!know_mouichido', then: [{ choice: [
        { text: 'How do I ask them to say it again?', go: 'chat_emi_repeat_word' },
        { text: 'Thanks. I’ll try that.', go: 'chat_emi_leave' },
      ] }], else: [{ go: 'chat_emi_leave' }] },
    ],
    chat_emi_repeat_word: [
      { say: 'emi', emo: 'slow', slow: true, text: '{mouichido}. Once more.' },
      { do: 'type', word: 'mouichido', from: 'emi', prompt: 'Ask Emi to say it once more: mouichido.' },
      { say: 'emi', emo: 'slow', slow: true, text: '{mouichido}.' },
      { say: 'emi', emo: 'warm', text: 'There. You can use that when you need another look at something, too.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
};
