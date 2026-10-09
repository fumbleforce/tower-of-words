import { nodes as mioLunchNodes } from '../milestones/mio.js';
import { place, repairQueue, emiHello } from './shared.js';
import { revealNodes } from './reveal.js';
export default place({ forecourt: ['talk:lift'] }, {
  on: { 'event:kotodama_first': 'd5_first_reactions', 'event:kotodama_cancel': 'd5_delivery_cancel', 'event:kotodama_exit': 'd5_rounds_exit', 'talk:my_desk': 'd5_desk', 'talk:my_chair': 'd5_desk', 'talk:emi': 'd5_emi', 'talk:kenji': 'd5_kenji', 'talk:mori': 'd5_mori', 'talk:mio': [{ node: 'ms_mio_help', if: 'mio_lunch_offer == 3' }, { node: 'ms_mio_lunch', if: 'mio_lunch_offer == 2' }, 'd5_mio'], 'talk:vending': 'd5_drinks', 'talk:copier': 'd5_copier', 'talk:tama': 'd5_cat' },
  nodes: {
    ...mioLunchNodes,
    ...revealNodes,
    d5_desk: [{ do: 'sitDown' }, ...repairQueue, { do: 'tickets' }, { do: 'stand', who: 'eric' }, { do: 'save' }],
    d5_emi: [...emiHello,
      { say: 'emi', emo: 'bright', text: 'Morning, {mc.name}. I’ve got ten minutes before they want me upstairs.' },
      { if: "ticket_T0002 == 'done'", then: [{ say: 'emi', emo: 'warm', text: 'The station sign-off came through. Thanks for going back.' }] },
      { if: "ticket_T0005 == 'done'", then: [{ say: 'emi', emo: 'casual', text: 'I saw the court display request close too. I didn’t know you’d been over there.' }] },
      { if: "ticket_T0002 != 'done' && ticket_T0005 != 'done'", then: [{ say: 'emi', emo: 'casual', text: 'Any open requests can wait for their next check. You don’t have to chase people on their lunch break.' }] },
      { say: 'emi', emo: 'casual', text: 'I’ll be upstairs this afternoon. Kenji knows how to reach me if you need anything.' },
    ],
    d5_kenji_name: [{ if: '!met_kenji || d5_kenji_needs_intro', then: [
      { say: 'kenji', emo: 'bright', overheard: true, text: 'ケンジです。よろしくお願いします。' },
      { do: 'bow', who: 'kenji' }, { do: 'gesture', who: 'kenji', kind: 'point' },
      { say: 'eric', emo: 'warm', text: 'I’m {mc.name}. Good to meet you.' },
      { do: 'meet', who: 'kenji' }, { unset: 'd5_kenji_needs_intro' },
    ] }],
    d5_mori_name: [{ if: '!met_mori || d5_mori_needs_intro', then: [
      { say: 'mori', overheard: true, emo: 'polite', text: '森です。{yoroshiku}。', clear: ['森'] },
      { do: 'bow', who: 'mori' },
      { say: 'eric', emo: 'warm', text: 'I’m {mc.name}. Thank you.' },
      { do: 'meet', who: 'mori' }, { unset: 'd5_mori_needs_intro' },
    ] }],
    d5_kenji: [
      { call: 'd5_kenji_name' },
      { if: "period == 'evening'", then: [{ go: 'd5_drinks' }] },
      { if: '!d5_invited_in_person', then: [
        { say: 'kenji', emo: 'bright', overheard: true, text: '6時から、ここで飲み会です。', clear: ['6'] },
        { say: 'kenji', emo: 'bright', text: 'Mori-san, Mio-san also. {mc.name}-san... come?' },
        { say: 'eric', emo: 'curious', text: 'From the machine?' },
        { say: 'kenji', emo: 'warm', text: 'Yes. Me... buy. Only us. OK?' },
        { set: 'd5_invited' }, { set: 'd5_invited_in_person' }, { do: 'save' },
      ], else: [{ say: 'kenji', emo: 'casual', text: 'Six... here.' }] },
    ],
    d5_mori: [
      { call: 'd5_mori_name' },
      { if: "period == 'evening'", then: [{ go: 'd5_drinks' }] },
      { if: "period == 'afternoon'", then: [
        { do: 'day5Office', state: 'soup' },
        { say: 'mori', overheard: true, emo: 'sheepish', text: 'まだ、コーンが残っているんです。', clear: ['コーン'] },
        { say: 'eric', emo: 'warm', text: 'Take your time. I always leave half of it in the can.' },
      ], else: [{ do: 'day5Office', state: 'tea' }, { say: 'mori', overheard: true, emo: 'warm', text: 'お茶を入れました。よかったら、どうぞ。' }, { say: 'eric', emo: 'warm', text: 'Yes please, I’d like some.' }] },
    ],
    d5_mio: [{ if: "period == 'evening'", then: [{ go: 'd5_drinks' }], else: [
      { if: "period == 'lunch'", then: [{ say: 'mio', emo: 'casual', text: 'Kenji’s over at karaoke, so it’s quiet. I’m trying to eat before anyone comes looking for me.' }], else: [{ say: 'mio', emo: 'casual', text: 'I’m almost done with this. If it’s the printer, Kenji is right there, so...' }] },
    ] }],
    d5_copier: [{ say: 'eric', emo: 'warm', text: 'Somebody’s put a full box of paper beside it. That should save a few trips.' }],
    d5_cat: [{ say: 'eric', emo: 'warm', text: 'That chair was taken before either of us got here, wasn’t it?' }],
  },
});
