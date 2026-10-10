// The walk from the platform to the lobby, and the lift down to B2. See STORY.md.
export default {
  speakers: {
    sales1: { name: 'Man from Sales' },
    sales2: { name: 'Woman from Sales' },
  },

  train_to_gate: {
    walk: [],
    arrive: [],
    with: [],
  },

  gate_to_forecourt: { walk: [], arrive: [], with: [] },

  dorm_court_to_dorms: { walk: [], arrive: [], with: [] },

  forecourt_to_office: {
    ride: [
      { do: 'liftDoors', state: 'closed' },
      { do: 'floor', to: '3' },
      { say: 'sales1', emo: 'low', text: '十時の会議、四番目の議題見た？', overheard: true },
      { say: 'sales2', emo: 'casual', text: 'B2のやつでしょ。コンサルタントが来るって。', overheard: true, clear: ['B2', { ja: 'コンサルタント', ro: 'konsarutanto', en: 'consultant' }] },
      { say: 'sales1', emo: 'surprised', text: 'え、今日から？', overheard: true },
      { do: 'look', who: 'sales1', at: 'eric' },
      '> They notice your card and stop talking.',
      { do: 'floor', to: '5' },
      { do: 'liftDoors', state: 'open' },
      { do: 'liftDoors', state: 'closed' },
      { do: 'floor', to: 'B2' },
      { do: 'liftDoors', state: 'open' },
    ],
    with: [],
  },
};
