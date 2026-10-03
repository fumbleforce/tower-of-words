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
    'idle:emi': 'd2_emi_later', 'idle:mio': 'd2_mio_work', 'idle:mori': 'd2_mori_work', 'idle:kenji': 'd2_kenji_work',
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
      { say: 'kenji', emo: 'bright', text: 'Eric! After work. Food. Welcome food!' },
      { do: 'cam', on: 'emi', zoom: 1.2 },
      { say: 'emi', emo: 'bright', text: 'Mori’s been arranging it. I’ve another meeting upstairs, so don’t wait for me.' },
      { say: 'eric', emo: 'warm', text: 'That’s kind of him.' },
      { do: 'cam', on: 'kenji', zoom: 1.2 },
      { say: 'kenji', emo: 'bright', text: 'I help Mori-san. Then... izakaya. Blue curtain. We meet there.' },
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
      '> By the time you finish going through Mori’s notes, the others are packing up.',
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
    d2_mio_work: [{ say: 'mio', emo: 'tired', text: 'Can you give me a minute? It’s nearly finished restarting.' }],
    d2_mori_work: [{ say: 'mori', emo: 'polite', text: '古い資料ですが、よかったら使ってください。', en: 'These notes are old, but please use them if they help.' }],
    d2_kenji_work: [{ say: 'kenji', emo: 'sheepish', text: 'Ah, sorry. Is loading. Very slow.' }],
    d2_kenji_invite_again: [{ say: 'kenji', emo: 'bright', text: 'Blue curtain! After work. I am there.' }],
    d2_leave: [{ do: 'trip', to: 'forecourt' }],
    ...fallbackNodes,
  },
};
