// The walk from the platform to the lobby, and the lift down to B2. See STORY.md.
export default {
  speakers: {
    sales1: { name: 'Man from Sales' },
    sales2: { name: 'Woman from Sales' },
  },

  train_to_gate: {
    walk: [
      '> The covered walkway to head office. Everyone walks faster than you.',
      '> Signs, all in Japanese. You follow the crowd, and the calico cat, who trots ahead as if she is showing you the way.',
    ],
    arrive: [],
    with: [],
  },

  gate_to_office: {
    ride: [
      { do: 'liftDoors', state: 'closed' },
      '> The lift is full. Someone has pressed 5.',
      { do: 'floor', to: '3' },
      { say: 'sales1', text: '十時の会議、四番目の議題見た？', overheard: true },
      { say: 'sales2', text: 'B2のやつでしょ。コンサルタントが来るって。', overheard: true, clear: ['B2', { ja: 'コンサルタント', ro: 'konsarutanto', en: 'consultant' }] },
      { say: 'sales1', text: 'え、今日から？', overheard: true },
      '> B2. Consultant. You look at your own card: IT SUPPORT, B2, EXTERNAL.',
      '> One of them notices it too. They both find something interesting on the ceiling.',
      { do: 'floor', to: '5' },
      { do: 'liftDoors', state: 'open' },
      '> Fifth floor. Everyone gets out but you.',
      { do: 'liftDoors', state: 'closed' },
      { do: 'floor', to: 'B2' },
      { do: 'liftDoors', state: 'open' },
      '> B2. Warm air, old carpet, and the hum of machines.',
    ],
    with: [],
  },
};
