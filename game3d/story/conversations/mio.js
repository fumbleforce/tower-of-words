const menu = (understood = false) => [
  { if: "place == 'office' && period_morning && (day == 1 || day == 2 || day == 5 || ongoing_workday)", then: [
    { say: 'mio', emo: 'casual', text: 'Give me until lunch? I’m trying to finish this before somebody adds another request.' },
    { end: true },
  ] },
  { do: 'face', who: 'eric', to: 'mio' }, { do: 'face', who: 'mio', to: 'eric' }, { do: 'cam', on: 'mio', zoom: 1.3, conversation: 'mio' },
  { choice: [
    { text: 'Do you go back to the mainland much?', go: 'chat_mio_mainland', if: '!chat_mio_home' },
    { text: 'Does your mother still send food back with you?', go: 'chat_mio_food_again', if: 'chat_mio_home' },
    { text: 'Do you ever eat away from the servers?', go: 'chat_mio_lunch' },
    ...(understood ? [
      { text: '{yasumi}… Was your mother telling you to take a break?', go: 'chat_mio_break', if: '!chat_mio_break_understood' },
      { text: 'Does your mother still ask about your weekends?', go: 'chat_mio_break_again', if: 'chat_mio_break_understood' },
    ] : []),
    { text: 'I’ll let you get on.', go: 'chat_mio_leave' },
  ] },
];
export default {
  on: { 'ask:mio': 'chat_mio', 'ask:mio-break': 'chat_mio_understood' },
  nodes: {
    chat_mio: menu(), chat_mio_understood: menu(true),
    chat_mio_mainland: [
      { say: 'eric', emo: 'curious', text: 'Do you go back to the mainland much?' },
      { say: 'mio', emo: 'casual', text: 'Sometimes I stay with my mother. Then she sends me back with enough food for everybody.' },
      { choice: [
        { text: 'That sounds nice.', go: 'chat_mio_home_nice' },
        { text: 'Does she think you can’t feed yourself here?', go: 'chat_mio_home_shops' },
      ] },
    ],
    chat_mio_home_nice: [
      { say: 'mio', emo: 'warm', text: 'It is. I still have to carry it all on the train, though.' },
      { go: 'chat_mio_home_quote' },
    ],
    chat_mio_home_shops: [
      { say: 'mio', emo: 'amused', text: 'I told her there are shops here. She asked what I actually buy.' },
      { go: 'chat_mio_home_quote' },
    ],
    chat_mio_home_quote: [
      { say: 'mio', emo: 'casual', text: 'Then, when I leave, I get the same thing every time.' },
      { say: 'mio', overheard: true, emo: 'fond', text: '休みの日ぐらい、仕事を忘れなさい。' },
      { say: 'mio', emo: 'casual', text: 'She has opinions about my weekends, also.' },
      { set: 'chat_mio_home' }, { go: 'chat_mio_leave' },
    ],
    chat_mio_food_again: [
      { say: 'eric', emo: 'curious', text: 'Does your mother still send food back with you?' },
      { say: 'mio', emo: 'warm', text: 'Yes. I have to take the empty containers back before she runs out.' },
      { go: 'chat_mio_leave' },
    ],
    chat_mio_lunch: [
      { say: 'eric', emo: 'curious', text: 'Do you ever eat away from the servers?' },
      { if: 'ms3_mio', then: [
        { say: 'mio', emo: 'warm', text: 'More than I used to. The bench by the water is quite good, when it’s not windy.' },
      ], else: [
        { say: 'mio', emo: 'casual', text: 'I mean to. Then I come down to check one thing, and I’ve brought my lunch with me anyway.' },
      ] },
      { choice: [
        { text: '{nomitai}. I was going to get a drink.', go: 'chat_mio_drink', if: 'know_nomitai' },
        { text: 'I’ll try the water when I want a quiet lunch.', go: 'chat_mio_quiet' },
        { text: 'I’ll leave you to it.', go: 'chat_mio_leave' },
      ] },
    ],
    chat_mio_drink: [
      { say: 'eric', emo: 'warm', text: '{nomitai}. I was going to get a drink.' },
      { say: 'mio', emo: 'casual', text: 'Go while you’ve got time. I start making tea here and find something else to do before I drink it.' },
      { go: 'chat_mio_leave' },
    ],
    chat_mio_quiet: [
      { say: 'mio', emo: 'warm', text: 'Mm. You can hear the trains from there, but you don’t have to be on one.' },
      { go: 'chat_mio_leave' },
    ],
    chat_mio_break: [
      { say: 'eric', emo: 'curious', text: '{yasumi}… Was she telling you to take a break?' },
      { say: 'mio', emo: 'amused', text: 'Yes. Or at least forget about work on my days off. You got that part?' },
      { if: 'ms3_mio', then: [
        { say: 'mio', emo: 'warm', text: 'I did tell her I’d been out. Then she wanted to know who with.' },
      ], else: [
        { say: 'mio', emo: 'casual', text: 'She asks why I come back to B2 when I’m not even supposed to be working.' },
      ] },
      { choice: [
        { text: 'I know a few words now. I still have to guess.', go: 'chat_mio_guess' },
        { text: 'She might have a point.', go: 'chat_mio_mother_right' },
      ] },
    ],
    chat_mio_guess: [
      { say: 'mio', emo: 'warm', text: 'That was a good guess. Just ask if you’re not sure, okay?' },
      { go: 'chat_mio_break_memory' },
    ],
    chat_mio_mother_right: [
      { say: 'mio', emo: 'dry', text: 'I know. She can tell when I’m checking something while we talk.' },
      { go: 'chat_mio_break_memory' },
    ],
    chat_mio_break_again: [
      { say: 'mio', emo: 'warm', text: 'Yes. It’s usually the first thing she asks when I call.' },
      { go: 'chat_mio_leave' },
    ],
    chat_mio_break_memory: [
      { do: 'remember', who: 'mio', id: 'mother_weekends', text: 'Her mother asks her to forget about work on her days off.' },
      { set: 'chat_mio_break_understood' }, { go: 'chat_mio_leave' },
    ],
    chat_mio_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
};
