export const receptionNodes = {
  d5_kuro_name: [{ if: '!d3_kuro_intro', then: [
    { say: 'kuro', overheard: true, emo: 'polite', text: '玖路です。受付です。' },
    { say: 'eric', emo: 'warm', text: '{mc.name}. I’m with IT support on B2.' },
    { do: 'meet', who: 'kuro' }, { set: 'd3_kuro_intro' }, { do: 'save' },
  ] }],
  d5_label: [
    { if: "period != 'morning' && period != 'afternoon'", then: [
      { say: 'eric', emo: 'casual', text: 'Reception can check the label in the morning or afternoon.' }, { end: true },
    ] },
    { call: 'd5_kuro_name' },
    { if: "ticket_T0007 == 'done'", then: [{ say: 'kuro', face: 'pleased', name: 'Kuro', overheard: true, emo: 'warm', text: '全部、入ってます。ありがとう。' }, { end: true }] },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: '{mc.name_jp}さん、これ、見てください。朝、頼みました。' },
    { do: 'ticket', add: 'T-0007' },
    { do: 'labelRepair', state: 'show' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'dry', text: '名前が切れるんです。ずっと手で書いてて。' },
    { say: 'eric', emo: 'curious', text: 'There’s a wider format saved here. The printer is still using the narrow one.' },
    { choice: [{ text: 'Use the wider label format.', go: 'd5_label_fix' }, { text: 'Leave the labels for later.', go: 'd5_label_leave' }] },
  ],
  d5_label_fix: [
    { do: 'ticket', start: 'T-0007' }, { do: 'labelRepair', state: 'format' }, { do: 'labelRepair', state: 'print' },
    { say: 'eric', emo: 'warm', text: 'Does that have the whole name?' }, { do: 'labelRepair', state: 'check' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: 'はい、全部です。' },
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'さすがですね。' },
    { set: 'd5_label_done' }, { do: 'ticket', close: 'T-0007' }, { do: 'save' }, { go: 'd5_label_leave' },
  ],
  d5_label_leave: [{ do: 'cam', back: true }],
};
