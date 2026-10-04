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
          { en: "To whoever folded my washing at the coin laundry: thank you. I got held up at work and thought I'd find it dumped on the floor." },
          { en: 'Reply: I needed the dryer. Hope I matched the socks right.' },
        ],
        color: 'white',
      },
      {
        title: 'カラオケ (karaoke)',
        lines: [
          { en: "Did anyone take the wrong black umbrella home from karaoke last night? Mine has a bent handle. I've left yours at the front desk." },
          { en: 'Reply: Sorry! Yours is back there now too.' },
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
        en: 'We leave radio exercises early to take the bread out of the ovens. Please stop marking us absent. From the bakery staff.',
        color: 'green',
      },
    ],
  },
};
