import { place, goal } from './shared.js';
export default place(
  { canteen: ['talk:canteen_door'], east_lane: ['talk:dorm_lane', 'zone:dorm_exit'], shotengai: ['talk:shop_walk', 'zone:shop_walk'],
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
        { say: 'aoi', overheard: true, emo: 'casual', text: 'あ、どうぞ。私はテニスにします。', clear: ['テニス'] },
        { do: 'emote', who: 'aoi', kind: '!' },
        { say: 'aoi', overheard: true, emo: 'surprised', text: 'あれ、電車の……' },
        { say: 'eric', emo: 'warm', text: 'Morning. You were on my train, on the phone the whole way.' },
        { do: 'gesture', who: 'aoi', kind: 'point', to: 'eric' },
        { say: 'aoi', overheard: true, emo: 'curious', text: 'お仕事は、どちらですか？' },
        { say: 'eric', emo: 'warm', text: 'Where I work? IT support, down in B2.' },
        { do: 'emote', who: 'aoi', kind: 'sweat' },
        { say: 'aoi', overheard: true, emo: 'hesitant', text: 'B2……地下……。電話、聞こえてました？', clear: ['B2'] },
        { say: 'eric', emo: 'curious', text: 'She’s gone red. I think she’s asking whether I heard her on the phone.' },
        { choice: [
          { text: 'Tell her not to worry about it.', go: 'd3_aoi_heard' },
          { text: 'Admit you didn’t follow a word of it.', go: 'd3_aoi_missed' },
        ] },
      ],
      d3_aoi_heard: [
        { say: 'eric', emo: 'warm', text: 'Don’t worry about it. It was a long ride.' },
        { say: 'aoi', overheard: true, emo: 'sheepish', text: '{sumimasen}。窓のある部屋が、よかっただけで……' },
        { do: 'bow', who: 'aoi' },
        { go: 'd3_aoi_name' },
      ],
      d3_aoi_missed: [
        { say: 'eric', emo: 'dry', text: 'I couldn’t follow a word of it, if that helps.' },
        { do: 'emote', who: 'aoi', kind: '♪' },
        { say: 'aoi', overheard: true, emo: 'sheepish', text: 'よかった……' },
        { go: 'd3_aoi_name' },
      ],
      d3_aoi_name: [
        { say: 'aoi', overheard: true, emo: 'polite', text: 'アオイです。{yoroshiku}。' },
        { do: 'bow', who: 'aoi' },
        { do: 'meet', who: 'aoi' }, { set: 'd3_aoi_intro' },
        { say: 'eric', emo: 'warm', text: '{mc.name}. {yoroshiku}.' },
        '> Her new staff card says Facilities, room bookings.',
        { do: 'fact', who: 'aoi', id: 'assignment', text: 'Works in Facilities, on room bookings.' },
        { do: 'gesture', who: 'aoi', kind: 'point', to: 'noticeboard' },
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'bright', text: 'プール、今夜が最後ですよ！', clear: ['プール'] },
        { say: 'eric', emo: 'curious', text: 'The pool? I’ll have a look at the poster.' },
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'bright', text: '私は、テニスの靴を買ってきます。', clear: ['テニス'] },
        { do: 'boardVisit', state: 'leave' }, { do: 'cam', back: true }, { do: 'save' },
      ],
      d3_aoi_again: [{ if: 'club_tennis', then: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'bright', text: '日曜日、テニスで！', clear: ['テニス'] },
        { do: 'emote', who: 'aoi', kind: '♪' },
      ], else: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'polite', text: '日曜日のテニス、がんばります。', clear: ['テニス'] },
      ] }],
      d3_map: [
        { do: 'cam', on: 'board_map', zoom: 1.2 },
        '> A handwritten sticker by the map’s arrow says ここ (koko, here).',
        { if: '!know_koko', then: [{ choice: [
          { text: 'Try saying “here”.', go: 'd3_koko_word' },
          { text: 'Leave the map.', go: 'd3_map_end' },
        ] }], else: [{ go: 'd3_here' }] },
      ],
      d3_koko_word: [{ do: 'type', word: 'koko', prompt: 'Point at the plaza on the map and try “here”, koko.' }, { go: 'd3_here' }],
      d3_here: [{ say: 'eric', emo: 'warm', text: '{koko}. So we’re right by the fountain.' }, { go: 'd3_map_end' }],
      d3_map_end: [{ do: 'cam', back: true }, { do: 'save' }],
      d3_fountain: [{ say: 'eric', emo: 'dry', text: 'I’ve started using this sound to find my way home.' }],
      d3_cat: [{ say: 'eric', emo: 'warm', text: 'You’ve got the only dry patch in the shade.' }],
    },
  },
);
