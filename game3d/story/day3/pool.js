import { place, goal, emiHello } from './shared.js';
export default place(
  { sports: ['talk:changing_room'] },
  {
    labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
    on: {
      'talk:emi': [
        { if: "period == 'evening' && club_swimming && !d3_swim_done", node: 'club_swimming_pool' }, 'd3_emi_pool',
      ],
      'talk:kuro': 'd3_kuro_pool',
      'talk:pool_goggles': 'd3_goggles',
      'talk:attendant': 'd3_pool_attendant',
    },
    show: { pool_goggles: "period == 'evening' && club_swimming && !d3_goggles_returned" },
    nodes: {
      d3_arrive: [{ do: 'day3Setup' }, ...goal('changing_room')],
      d3_emi_pool: [...emiHello, { if: 'd3_swim_done', then: [
        { say: 'emi', emo: 'warm', text: 'I’m staying a bit longer. I’ve only just got comfortable.' },
      ], else: [{ say: 'emi', emo: 'bright', text: 'Come and join us if you like. The club slips are on the plaza board.' }] }],
      d3_kuro_pool: [
        { if: 'd3_swim_done && know_oyogu', then: [
          { say: 'kuro', name: 'Kuro', overheard: true, emo: 'curious', text: 'まだ{oyogu}？' },
          { say: 'eric', emo: 'warm', text: 'Not tonight. I’ll stay here a bit longer.' }, { end: true },
        ] },
        { if: 'd3_kuro_intro', then: [
        { say: 'kuro', name: 'Kuro', emo: 'teasing', text: 'Enjoy it while it lasts. Next week it’s the gym, and nobody has told me how we swim in a gym.' },
      ], else: [{ if: 'kuro_reception_seen', then: [
        { say: 'kuro', emo: 'polite', text: 'Good evening. You found the pool too.' },
      ], else: [{ say: 'kuro', emo: 'polite', text: 'Good evening. Are you here for the swimming club?' }] }] }],
      d3_pool_attendant: [
        { if: "period == 'evening'", then: [
          { if: 'club_swimming', then: [
            { say: 'attendant', overheard: true, emo: 'polite', text: 'どうぞ。まだ大丈夫ですよ。' },
            { do: 'gesture', who: 'attendant', kind: 'point', to: 'emi' },
          ], else: [
            { say: 'attendant', overheard: true, emo: 'polite', text: 'すみません、今夜は水泳部だけなんです。' },
            { say: 'eric', emo: 'tired', text: 'Club members only, I think. The slips were on the plaza board.' },
          ] },
        ], else: [{ say: 'eric', emo: 'warm', text: 'The sign says the club has the pool this evening. I can come back then.' }] },
      ],
      d3_goggles: [
        { if: 'd3_goggles_returned', then: [{ end: true }] },
        { do: 'cam', on: 'pool_goggles', zoom: 1.2 },
        '> There used to be a name on the strap. Only the last stroke is left.',
        { say: 'eric', emo: 'curious', text: 'Are these somebody’s goggles?' },
        { do: 'poolSession', state: 'goggles' },
        { say: 'member', overheard: true, emo: 'surprised', text: 'あっ、私の！ありがとうございます。', clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
        { do: 'gesture', who: 'member', kind: 'point' },
        { say: 'member', overheard: true, emo: 'sheepish', text: 'ほら、名前の最後、{koko}に残ってますよね？' },
        { say: 'eric', emo: 'dry', text: 'I’ll take your word for it.' },
        { set: 'd3_goggles_returned' }, { do: 'cam', back: true }, { do: 'save' },
      ],
      // The club uses global call hooks; these place-local nodes own its physical staging.
      d3_pool_begin: [{ do: 'poolSession', state: 'begin' }],
      d3_pool_list: [{ do: 'poolSession', state: 'list' }],
      d3_pool_enter: [{ do: 'poolSession', state: 'enter' }],
      d3_pool_emi_hands_over: [{ do: 'poolSession', state: 'handover' }],
      d3_pool_bags: [{ do: 'poolSession', state: 'bags' }],
      d3_pool_emi_enters: [{ do: 'poolSession', state: 'emiEnter' }],
      d3_pool_length: [{ do: 'poolSession', state: 'length' }],
      d3_pool_another: [{ do: 'poolSession', state: 'another' }],
      d3_pool_sit: [{ do: 'poolSession', state: 'sit' }],
      d3_pool_free: [{ do: 'poolSession', state: 'free' }],
      d3_pool_exit: [{ do: 'poolSession', state: 'exit' }],
    },
  },
);
