import { place, goal } from './shared.js';
export default place(
  { east_lane: ['talk:dorm_lane', 'zone:dorm_exit'], shotengai: ['talk:shop_walk', 'zone:shop_walk'],
    forecourt: ['talk:office_lane', 'zone:office_lane'] },
  {
    at: 'noticeboard',
    labels: { aoi: ['Aoi', 'd3_aoi_intro'] },
    on: {
      'talk:noticeboard': 'd3_board',
      'talk:aoi': [{ if: '!d3_aoi_intro', node: 'd3_aoi' }, 'd3_aoi_again'],
      'talk:board_map': 'd3_map', 'say:koko:board_map': 'd3_here',
      'talk:fountain': 'd3_fountain', 'talk:tama': 'd3_cat',
    },
    nodes: {
      d3_board: [
        { if: "period == 'morning' && !d3_aoi_intro", then: [{ call: 'd3_aoi' }] },
        { do: 'noticeboard' }, { set: 'd3_board_read' }, { do: 'save' }, ...goal(),
      ],
      d3_aoi: [
        { do: 'cam', on: 'aoi', zoom: 1.2 },
        { do: 'boardVisit', state: 'slip' },
        { say: 'aoi', emo: 'casual', text: 'どうぞ。私はテニスにします。日曜日なら来られるので。', en: 'Go ahead. I’m joining tennis; I can come on Sundays.' },
        { say: 'aoi', emo: 'curious', text: '同じ電車でしたよね。もう、お仕事は始まりましたか。', en: 'We were on the same train, weren’t we? Have you started work?' },
        { say: 'eric', emo: 'warm', text: 'Yes. IT support, B2.' },
        { say: 'aoi', emo: 'hesitant', text: 'あ、地下……。電話、聞こえましたか。', en: 'Oh, the basement... Could you hear my phone call?' },
        { choice: [
          { text: 'I caught the bit about the basement.', go: 'd3_aoi_heard' },
          { text: 'I couldn’t follow much of it.', go: 'd3_aoi_missed' },
        ] },
      ],
      d3_aoi_heard: [
        { say: 'aoi', emo: 'sheepish', text: 'すみません。窓のある部屋がよかっただけで。', en: 'Sorry. I just wanted a room with a window.' },
        { say: 'eric', emo: 'dry', text: 'So did I.' }, { go: 'd3_aoi_name' },
      ],
      d3_aoi_missed: [
        { say: 'aoi', emo: 'sheepish', text: '窓のある部屋がいいって、言ってたんです。', en: 'I was saying I wanted a room with a window.' },
        { go: 'd3_aoi_name' },
      ],
      d3_aoi_name: [
        { say: 'aoi', emo: 'polite', text: '葵です。よろしくお願いします。', en: 'I’m Aoi. Nice to meet you properly.' },
        { do: 'meet', who: 'aoi' }, { set: 'd3_aoi_intro' },
        { say: 'eric', emo: 'warm', text: 'I’m {mc.name}. Where did you end up?' },
        { say: 'aoi', name: 'Aoi', emo: 'casual', text: '施設の予約担当です。今は研修センターの二階にいます。', en: 'I’m handling room bookings. For now I’m upstairs at the training centre.' },
        { do: 'fact', who: 'aoi', id: 'assignment', text: 'Handles room bookings; training at the east-lane centre.' },
        { say: 'aoi', name: 'Aoi', emo: 'casual', text: '泳ぐなら、今夜ですよ。十月だけど、今日だけ開けるそうです。', en: 'If you swim, that’s tonight. They’re opening the pool specially for one last October session.' },
        { do: 'gesture', who: 'aoi', kind: 'point', to: 'noticeboard' },
        { say: 'aoi', name: 'Aoi', emo: 'polite', text: '私はテニスの靴を買ってきます。', en: 'I’m off to buy tennis shoes.' },
        { do: 'boardVisit', state: 'leave' }, { do: 'cam', back: true }, { do: 'save' },
      ],
      d3_aoi_again: [{ if: 'club_tennis', then: [
        { say: 'aoi', name: 'Aoi', emo: 'polite', text: '日曜日に、コートで。', en: 'See you at the courts on Sunday.' },
      ], else: [{ say: 'aoi', name: 'Aoi', emo: 'polite', text: '日曜日、がんばります。', en: 'I’ll give it a go on Sunday.' }] }],
      d3_map: [
        { do: 'cam', on: 'board_map', zoom: 1.2 },
        '> A handwritten sticker by the map’s arrow says ここ (koko, here).',
        { if: '!know_koko', then: [{ choice: [
          { text: 'Try saying “here”.', go: 'd3_koko_word' },
          { text: 'Put the map down.', go: 'd3_map_end' },
        ] }], else: [{ go: 'd3_here' }] },
      ],
      d3_koko_word: [{ do: 'type', word: 'koko', prompt: 'Point to the plaza on the map and try “here”: koko.' }, { go: 'd3_here' }],
      d3_here: [{ say: 'eric', emo: 'warm', text: '{koko}. Right by the fountain.' }, { go: 'd3_map_end' }],
      d3_map_end: [{ do: 'cam', back: true }, { do: 'save' }],
      d3_fountain: [{ say: 'eric', emo: 'dry', text: 'I’ve started using this sound to find my way home.' }],
      d3_cat: [{ say: 'eric', emo: 'warm', text: 'You’ve got the only dry patch in the shade.' }],
    },
  },
);
