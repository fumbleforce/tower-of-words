import { direction, sayFallbacks, fallbackNodes, repairQueue } from './shared.js';
export default {
  start: 'd2_office',
  on: {
    'talk:emi': [{ if: '!d2_ticket_done', node: 'd2_emi_waiting' }, { if: '!d2_brief_done', node: 'd2_brief' }, 'd2_emi_later'],
    'talk:my_desk': [{ if: '!d2_brief_done', node: 'd2_desk_wait' }, { if: '!d2_shift_done', node: 'd2_work' }, 'd2_desk_later'],
    'talk:my_chair': [{ if: '!d2_brief_done', node: 'd2_desk_wait' }, { if: '!d2_shift_done', node: 'd2_work' }, 'd2_desk_later'],
    'talk:mio': 'd2_mio_work',
    'talk:mori': 'd2_mori_work',
    'talk:kenji': [{ if: 'd2_brief_done', node: 'd2_kenji_invite_again' }, 'd2_kenji_work'],
    'talk:lift': 'd2_leave',
    'idle:emi': 'd2_emi_later', 'idle:mio': 'd2_mio_idle_work', 'idle:mori': 'd2_mori_work', 'idle:kenji': 'd2_kenji_work',
    ...sayFallbacks,
  },
  goal: { emi: 'd2_ticket_done && !d2_brief_done', my_desk: 'd2_brief_done && !d2_shift_done', lift: '!d2_ticket_done || d2_shift_done' },
  nodes: {
    d2_office: [
      { do: 'officeDay2', state: 'arrive' },
      { if: '!d2_ticket_done', then: [{ do: 'goal', text: 'Check the train doors at the station first.', at: 'lift' }], else: [
        { if: '!d2_brief_done', then: [{ do: 'goal', text: 'Tell Emi what the door check found.', at: 'emi' }], else: [
          { if: '!d2_shift_done', then: [{ do: 'goal', text: 'Sit at your desk when you’re ready to work.', at: 'my_desk' }],
            else: direction('lift', 'lift', 'lift', 'lift') },
        ] },
      ] },
    ],
    d2_brief: [
      { do: 'cam', on: 'emi', zoom: 1.25 },
      { say: 'emi', emo: 'bright', text: 'There you are. How were the doors?' },
      { if: 'd2_order_sensor', then: [
        { say: 'eric', emo: 'hesitant', text: 'I put in for a replacement sensor.' },
        { say: 'emi', emo: 'casual', text: 'Right. I’ll put the order through today. That’s some of yesterday’s money spent already.' },
      ], else: [
        { say: 'eric', emo: 'tired', text: 'The sensor passes. I wouldn’t replace it.' },
        { say: 'emi', emo: 'bright', text: 'Good. I’ll tell the station and keep the money for something that is broken.' },
      ] },
      { say: 'emi', emo: 'casual', text: 'About what I said yesterday. How much of our old equipment can you actually look after?' },
      { choice: [
        { text: 'I’ll need time to see what you’ve got.', go: 'd2_assess' },
        { text: 'I can keep it running. I can’t promise ten years.', go: 'd2_limits' },
      ] },
    ],
    d2_assess: [
      { say: 'emi', emo: 'casual', text: 'Of course. Start with B2 and see how far you get.' },
      { go: 'd2_invitation' },
    ],
    d2_limits: [
      { say: 'emi', emo: 'sheepish', text: 'Yes, well. I may have got a bit carried away with the ten years.' },
      { go: 'd2_invitation' },
    ],
    d2_invitation: [
      { say: 'emi', emo: 'casual', text: 'Your repair list is on the computer. Mori’s left his notes beside it; have a look through them this afternoon.' },
      { do: 'cam', on: 'kenji', zoom: 1.2 },
      { say: 'kenji', emo: 'bright', text: '{mc.name_jp}さん、今日、歓迎会です。', overheard: true },
      { say: 'kenji', emo: 'bright', text: 'Welcome... party. Food.' },
      { do: 'cam', on: 'emi', zoom: 1.2 },
      { say: 'emi', emo: 'bright', text: 'Mori’s booked a table for all of us. I’ll meet you there when I get out of this meeting.' },
      { say: 'eric', emo: 'warm', text: 'That’s kind of him.' },
      { do: 'cam', on: 'kenji', zoom: 1.2 },
      { say: 'kenji', emo: 'bright', text: 'Me... Mori-san, help. After, izakaya. Blue... curtain.' },
      { say: 'kenji', emo: 'polite', text: 'そこで会いましょう。', overheard: true },
      { do: 'cam', back: true },
      { say: 'emi', emo: 'casual', text: 'The covered street off the plaza, with the shops. You’ll find him there.' },
      { set: 'd2_brief_done' }, { do: 'cam', back: true },
      { do: 'goal', text: 'Sit at your desk when you’re ready to work.', at: 'my_desk' }, { do: 'save' },
    ],
    d2_work: [
      { do: 'sitDown' },
      ...repairQueue,
      { do: 'tickets' }, { do: 'save' },
      { choice: [
        { text: 'Read Mori’s notes for the afternoon.', go: 'd2_notes' },
        { text: 'Get up.', go: 'd2_leave_desk' },
      ] },
    ],
    d2_leave_desk: [
      { do: 'stand', who: 'eric' },
      { do: 'goal', text: 'Sit at your desk when you’re ready to work.', at: 'my_desk' }, { do: 'save' },
    ],
    d2_notes: [
      { say: 'eric', emo: 'curious', text: 'April? Is this the same copier request we closed yesterday?' },
      { say: 'mori', overheard: true, emo: 'polite', text: 'はい。紙が詰まるたびに、取り出して使っていました。' },
      { say: 'mio', emo: 'casual', text: 'They kept pulling the paper out and using it again. He left the request open because nobody had actually fixed it.' },
      { say: 'eric', emo: 'quiet', text: 'I thought the list was just out of date.' },
      { say: 'mio', emo: 'dry', text: 'Some of it is. Ask him before you close anything.' },
      { choice: [
        { text: 'Go through the old requests with Mori.', go: 'd2_review_requests' },
        { text: 'Get up and come back to this.', go: 'd2_leave_desk' },
      ] },
    ],
    d2_review_requests: [
      '> You match the old requests to Mori’s notes. The copier is the first repair you can mark complete.',
      { set: 'd2_shift_done' }, { do: 'period', to: 'evening' }, { do: 'stand', who: 'eric' },
      { do: 'officeDay2', state: 'afterWork' },
      { do: 'goal', text: 'Meet Kenji by the izakaya’s blue curtain.', at: 'lift' }, { do: 'save' },
    ],
    d2_emi_waiting: [{ say: 'emi', emo: 'casual', text: 'Do the station check first. Then we can have that chat.' }],
    d2_emi_later: [{ say: 'emi', emo: 'casual', text: 'I ought to be upstairs. We’ll catch up later.' }],
    d2_desk_wait: [{ say: 'eric', emo: 'tired', text: 'I should finish with Emi first.' }],
    d2_desk_later: [
      { do: 'sitDown' }, ...repairQueue, { do: 'tickets' },
      { do: 'stand', who: 'eric' }, { do: 'save' },
    ],
    d2_mio_work: [
      { if: 'sender_delivered', then: [{ go: 'sender_later' }] },
      { if: 'd2_mio_job_talked && d2_mio_weekend_talked', then: [
        { say: 'mio', emo: 'curt', text: 'Not now, I have to catch this before it restarts again. At dinner, maybe?' },
      ], else: [{ choice: [
        { text: 'What are you working on?', if: '!d2_mio_job_talked', go: 'd2_mio_job' },
        { text: 'Do you usually stay on the island at weekends?', if: '!d2_mio_weekend_talked', go: 'd2_mio_weekend' },
        { text: 'Leave her to finish.', go: 'd2_social_end' },
      ] }] },
    ],
    d2_mio_job: [
      { if: 'sender_delivered', then: [{ go: 'sender_later' }] },
      { say: 'mio', emo: 'tired', text: 'The thing that sends everyone’s timesheets. It keeps restarting before I can get the log off it.' },
      { say: 'eric', emo: 'curious', text: 'Do they know it’s doing that?' },
      { say: 'mio', emo: 'dry', text: 'Payroll always rings me before I even know it’s broken. Today I want to find it first.' },
      { set: 'd2_mio_job_talked' }, { go: 'd2_social_end' },
    ],
    d2_mio_weekend: [
      { say: 'mio', emo: 'casual', text: 'Usually. If I go to my mother’s she gives me enough food that I have to come straight back.' },
      { if: 'lunch_mio', then: [{ say: 'eric', emo: 'warm', text: 'Is that where the pickles came from?' }], else: [{ say: 'eric', emo: 'warm', text: 'Does she think you’re feeding everyone here?' }] },
      { say: 'mio', emo: 'dry', text: 'Mm. She thinks I’m giving them to the whole office. I haven’t corrected her.' },
      { set: 'd2_mio_weekend_talked' }, { go: 'd2_social_end' },
    ],
    d2_mio_idle_work: [{ if: 'sender_delivered', then: [{ say: 'mio', emo: 'casual', text: 'Still here, yes. The others went through.' }], else: [{ say: 'mio', emo: 'tired', text: 'Hang on. It’s finally giving me something.' }] }],
    d2_social_end: [{ do: 'save' }],
    d2_mori_work: [{ say: 'mori', overheard: true, emo: 'polite', text: '古い資料ですが、よかったら使ってください。' }],
    d2_kenji_work: [{ say: 'kenji', emo: 'sheepish', text: 'Ah, sorry. Is loading. Very slow.' }],
    d2_kenji_invite_again: [{ say: 'kenji', emo: 'bright', text: 'Blue curtain! After work. I am there.' }],
    d2_leave: [{ do: 'trip', to: 'forecourt' }],
    ...fallbackNodes,
  },
};
