// Writing for C0213's finds contract; notices/flyer cold-read in C0215.
export default {
  photos: {
    photo_gate: { title: 'Early train' },
    photo_forecourt: { title: 'Spring garden' },
    photo_plaza: { title: 'At the fountain' },
    photo_office: { title: 'Office company' },
    photo_dorm: { title: 'Summer night' },
  },
  papers: {
    bakery_flyer: {
      title: 'Bakery welcome flyer',
      lines: [
        { en: 'New to the dorms? Welcome!' },
        { en: 'Fresh bread every morning, straight after radio exercises.' },
        { en: 'Half-loaves for one. We slice to order.' },
        { en: 'Covered shopping street' },
      ],
    },
  },
  boards: {
    plaza_board: [
      {
        title: 'ありがとう (arigatou, thank you)',
        lines: [
          { en: "To whoever folded my washing at the coin laundry: thank you. The shirts were still damp, so I've hung them up again. You fold much better than I do." },
          { en: 'Reply: Sorry. The towels were dry.' },
        ],
        color: 'white',
      },
      {
        title: 'カラオケ (karaoke)',
        lines: [
          { en: 'Does anyone know the song with the woman on the ferry in the video? It starts quietly, then she gets angry. Karaoke box, room 3.' },
          { en: 'Reply: Room 3 shows the ferry video for every song.' },
        ],
        color: 'blue',
      },
      {
        title: 'ポンプ (ponpu, pump)',
        lines: [
          { en: 'If you borrowed my bicycle pump, please bring it back. My front tyre is flat.' },
          { en: 'Reply: Returned. I pumped up your tyre while I was at it.' },
        ],
        color: 'yellow',
      },
      {
        title: 'ラジオ体操 (rajio taisou, radio exercises)',
        en: 'The bakery staff leave after the first stretch to start the ovens. They are not skipping. Please stop crossing their names off the sheet.',
        color: 'green',
      },
    ],
  },
};
