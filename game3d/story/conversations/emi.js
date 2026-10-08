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
        { text: 'What made you join the swimming club?', go: 'chat_emi_club', if: '!chat_emi_club_known' },
        { text: 'Are you getting much time to join in?', go: 'chat_emi_turn', if: 'chat_emi_club_known' },
        { text: 'What makes things easier for you at work?', go: 'chat_emi_team', if: '!chat_emi_work_talked' },
        { text: 'Can we talk about how work is going?', go: 'chat_emi_team_again', if: 'chat_emi_work_talked' },
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
      { say: 'emi', emo: 'curious', text: 'Is that workable, or do you need help with something first?' },
      { go: 'chat_emi_work_choice' },
    ],
    chat_emi_work_choice: [
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
      { say: 'emi', emo: 'warm', text: 'Good. And I’ll ask what you’ve checked before I tell anyone it’s finished.' },
      { set: { chat_emi_work_help: 'results', chat_emi_work_talked: true } },
      { do: 'remember', who: 'emi', id: 'work_agreement', text: 'Talked about what each of you needs when handling requests.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_language: [
      { say: 'eric', emo: 'hesitant', text: 'I’m still learning what people are asking for.' },
      { say: 'emi', emo: 'warm', text: 'Ask them to show you. They know what they were doing when it stopped working.' },
      { say: 'emi', emo: 'casual', text: 'I’d rather you asked again than guessed. We can allow time for that.' },
      { set: { chat_emi_work_help: 'request', chat_emi_work_talked: true } },
      { do: 'remember', who: 'emi', id: 'work_agreement', text: 'Talked about what each of you needs when handling requests.' },
      { if: '!know_mouichido', then: [{ choice: [
        { text: 'How do I ask them to say it again?', go: 'chat_emi_repeat_word' },
        { text: 'Thanks. I’ll try that.', go: 'chat_emi_leave' },
      ] }], else: [{ go: 'chat_emi_leave' }] },
    ],
    chat_emi_team_again: [
      { if: "chat_emi_work_help == 'request'", then: [
        { say: 'emi', emo: 'curious', text: 'You said understanding the requests was the hard part. How are you feeling about that now?' },
      ], else: [
        { say: 'emi', emo: 'curious', text: 'You said you’d tell me even if something still wasn’t working. How do you feel about that now?' },
      ] },
      { choice: [
        { text: 'If I keep asking, won’t you think I can’t do this?', go: 'chat_emi_worry' },
        { text: 'I’m all right with it. I just wanted to check we still agree.', go: 'chat_emi_still_agree' },
        { text: 'I need a different sort of help now.', go: 'chat_emi_work_choice' },
        { text: 'Nothing to report. I just came to say hello.', go: 'chat_emi_hello' },
      ] },
    ],
    chat_emi_still_agree: [
      { say: 'eric', emo: 'casual', text: 'I’m all right with it. I just wanted to check we still agree.' },
      { say: 'emi', emo: 'warm', text: 'Yes. I may still look worried. I’m usually thinking about what I’ve already told upstairs.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_worry: [
      { say: 'eric', emo: 'hesitant', text: 'If I keep asking, won’t you think I can’t do this?' },
      { if: 'chat_emi_ask_first', then: [{ go: 'chat_emi_worry_listen' }] },
      { say: 'emi', emo: 'warm', text: 'You can tell me you didn’t understand someone. I need to know that before I send you off with another request.' },
      { choice: [
        { text: 'Could you hear me out before giving me advice?', go: 'chat_emi_ask_first' },
        { text: 'I’ll try saying when I’m unsure.', go: 'chat_emi_unsure' },
      ] },
    ],
    chat_emi_worry_listen: [
      { say: 'emi', emo: 'warm', text: 'I remember. Do you want my answer this time?' },
      { choice: [
        { text: 'Yes, what do you think?', go: 'chat_emi_worry_answer' },
        { text: 'No, I just needed to say it.', go: 'chat_emi_heard' },
      ] },
    ],
    chat_emi_worry_answer: [
      { say: 'emi', emo: 'warm', text: 'I think you’re checking before you promise something. I could do with doing that more often myself.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_ask_first: [
      { say: 'eric', emo: 'casual', text: 'Could you hear me out before giving me advice?' },
      { say: 'emi', emo: 'hesitant', text: 'Yes. Sorry, I went straight into sorting it out. Was there more you wanted to say?' },
      { set: 'chat_emi_ask_first' },
      { do: 'remember', who: 'emi', id: 'ask_first', text: 'Asked her to hear you out before offering advice.' },
      { choice: [
        { text: 'That was it. I just wanted you to know.', go: 'chat_emi_heard' },
        { text: 'I could use help understanding the requests.', go: 'chat_emi_language' },
      ] },
    ],
    chat_emi_heard: [
      { say: 'emi', emo: 'warm', text: 'All right. Thanks for telling me.' }, { go: 'chat_emi_leave' },
    ],
    chat_emi_unsure: [
      { say: 'emi', emo: 'warm', text: 'Please do. I may need a moment to change what I was going to tell upstairs.' },
      { say: 'emi', emo: 'sheepish', text: 'That doesn’t mean I wish you’d kept quiet.' },
      { go: 'chat_emi_leave' },
    ],
    chat_emi_hello: [
      { if: 'chat_emi_ask_first', then: [
        { say: 'emi', emo: 'warm', text: 'Hello. I was about to offer advice again. I’ll let you tell me what you came over for.' },
      ], else: [
        { say: 'emi', emo: 'sheepish', text: 'Oh, hello. Sorry, you came over and I went straight to work.' },
      ] },
      { choice: [
        { text: 'How are you doing?', go: 'chat_emi_herself' },
        { text: 'I’ll see you later.', go: 'chat_emi_leave' },
      ] },
    ],
    chat_emi_herself: [
      { say: 'eric', emo: 'warm', text: 'How are you doing?' },
      { say: 'emi', emo: 'casual', text: 'All right, thanks. I was about to tell you how the requests were going.' },
      { if: 'chat_emi_club_known', then: [
        { say: 'emi', emo: 'warm', text: 'I do want to keep going to the club. It helps having something else to talk about with Kuro.' },
      ], else: [
        { say: 'emi', emo: 'warm', text: 'Kuro keeps asking me that as well. She usually gets a better answer if we’re away from work.' },
      ] },
      { go: 'chat_emi_leave' },
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
