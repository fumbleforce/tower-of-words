// The ticket system's Japanese labels (Jørgen, 2026-10-03: "Some japanese here, and learnable"). They are words like
// any other in lang.js, marked `ui: 'tickets'` so the Words panel lists them apart. Each label shows its reading and
// English every time; tapping a label, or using a button, teaches it (ui/tickets-view.js). None is needed to play.
//   label: the short English on the screen; en: the meaning in the Words panel
export const WORDS = {
  kenmei: { ja: '件名', ro: 'kenmei', en: 'subject (of a ticket or an email)', label: 'Subject', ui: 'tickets' },
  iraisha: { ja: '依頼者', ro: 'iraisha', en: 'the person who asked', label: 'From', ui: 'tickets' },
  jotai: { ja: '状態', ro: 'jōtai', en: 'status, state', label: 'Status', ui: 'tickets' },
  mitaio: { ja: '未対応', ro: 'mitaiō', en: 'not started yet', label: 'New', ui: 'tickets' },
  taiochu: { ja: '対応中', ro: 'taiōchū', en: 'being worked on', label: 'In progress', ui: 'tickets' },
  kanryo: { ja: '完了', ro: 'kanryō', en: 'done, finished', label: 'Done', ui: 'tickets' },
  hoshu: { ja: '報酬', ro: 'hōshū', en: 'pay, a fee', label: 'Pay', ui: 'tickets' },
  tanto: {
    ja: '担当する',
    ro: 'tantō suru',
    en: 'to take something on as your job',
    label: 'Take ticket',
    ui: 'tickets',
  },
  modoru: { ja: '戻る', ro: 'modoru', en: 'to go back', label: 'Back', ui: 'tickets' },
  tojiru: { ja: '閉じる', ro: 'tojiru', en: 'to close', label: 'Close', ui: 'tickets' },
};
