import { place } from './shared.js';
export default place({ karaoke: ['talk:booth_door'] }, {
  on: { 'talk:kenji': 'd5_selector', 'talk:song_terminal': 'd5_selector', 'talk:booth_screen': 'd5_screen', 'say:matte:song_terminal': { if: "period == 'lunch' && know_matte && d5_selector_requested && !d5_selector_done", node: 'd5_selector_magic' } },
  nodes: {
    d5_booth_hello: [{ if: '!met_kenji || d5_kenji_needs_intro', then: [
      { say: 'kenji', emo: 'bright', text: 'You work on B2? I’m Kenji. I work there too.' },
      { say: 'eric', emo: 'warm', text: '{mc.name}. You sent the request?' },
      { say: 'kenji', emo: 'warm', text: 'Yes. Over here, please.' },
      { do: 'meet', who: 'kenji' }, { unset: 'd5_kenji_needs_intro' }, { do: 'save' },
    ] }],
    d5_selector: [
      { if: "period != 'lunch'", then: [{ say: 'eric', emo: 'casual', text: 'The request says to come here on Monday at lunch. I’ll try then.' }, { end: true }] },
      { call: 'd5_booth_hello' },
      { if: "ticket_T0008 == 'done'", then: [{ say: 'kenji', emo: 'warm', text: 'It stays! Thank you. I can check songs now.' }, { end: true }] },
      { call: 'd5_selector_request' },
      { say: 'eric', emo: 'curious', text: 'The edge of the songbook’s on the selector.' },
      { choice: [
        { text: 'Hold the stop key and lift the book.', go: 'd5_selector_key' },
        { text: 'Try 待って (matte, wait), then lift the book.', if: 'know_matte', go: 'd5_selector_magic' },
        { text: 'Leave the selector for later.', go: 'd5_selector_leave' },
      ] },
    ],
    d5_selector_request: [
      { say: 'kenji', emo: 'hesitant', text: 'Can you help with this? I want that song, but it keeps going past.' },
      { do: 'ticket', add: 'T-0008' }, { do: 'selectorRepair', state: 'show' },
      { set: 'd5_selector_requested' },
    ],
    d5_selector_key: [{ do: 'ticket', start: 'T-0008' }, { do: 'selectorRepair', state: 'key' }, { go: 'd5_selector_clear' }],
    d5_selector_magic: [
      { if: "period != 'lunch' || ticket_T0008 == 'done' || !know_matte", then: [{ end: true }] },
      { call: 'd5_booth_hello' },
      { if: '!d5_selector_requested', then: [{ call: 'd5_selector_request' }] },
      { do: 'ticket', start: 'T-0008' }, { say: 'eric', emo: 'hesitant', text: '{matte}.' },
      { do: 'kotodama', target: 'song_terminal' }, { do: 'selectorRepair', state: 'stop' },
      { say: 'kenji', emo: 'puzzled', text: 'Eh? You say stop, it stops?' },
      { say: 'eric', emo: 'hesitant', text: 'The book’s still on it. Let’s move that first.' },
      { set: 'd5_selector_magic' }, { go: 'd5_selector_clear' },
    ],
    d5_selector_clear: [
      { do: 'selectorRepair', state: 'book' }, { do: 'selectorRepair', state: 'verify' },
      { say: 'kenji', emo: 'bright', text: 'Yes, that’s the song. It stays there now!' },
      { set: 'd5_selector_done' }, { do: 'ticket', close: 'T-0008' }, { do: 'save' }, { go: 'd5_selector_leave' },
    ],
    d5_selector_leave: [{ do: 'cam', back: true }],
    d5_screen: [{ say: 'eric', emo: 'curious', text: 'They keep the words on screen until the song starts. I could practise this bit.' }],
  },
});
