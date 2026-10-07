import source from '../day3/plaza.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, ['talk:board_map', 'say:koko:board_map', 'talk:fountain']);
export default place('plaza', {
  ...familiar,
  on: { ...familiar.on, 'talk:noticeboard': 'ongoing_board', 'talk:aoi': 'ongoing_aoi' },
  labels: { aoi: ['Aoi', 'd3_aoi_intro'] },
  nodes: {
    ...familiar.nodes,
    ongoing_board: [{ do: 'noticeboard' }, { do: 'ongoingGoal' }],
    ongoing_aoi: [
      { do: 'cam', on: 'aoi', zoom: 1.2 },
      { if: 'met_aoi', then: [{ set: 'd3_aoi_intro' }] },
      { if: '!met_aoi && !d3_aoi_intro', then: [
        { say: 'aoi', overheard: true, emo: 'polite', text: 'アオイです。{yoroshiku}。' },
        { do: 'bow', who: 'aoi' }, { do: 'meet', who: 'aoi' }, { set: 'd3_aoi_intro' },
        { say: 'eric', emo: 'warm', text: '{mc.name}. {yoroshiku}.' },
      ] },
      { if: 'd4_tennis_done', then: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'テニス、また来ますよね？', clear: ['テニス'] },
      ], else: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: '日曜日のテニス、がんばります。', clear: ['テニス'] },
      ] },
      { choice: [
        { text: '{ikitai}. Say you’d like to come.', if: 'know_ikitai', go: 'ongoing_aoi_tennis' },
        { text: 'Ask her to show you where they play.', go: 'ongoing_aoi_courts' },
        { text: 'Say goodbye.', go: 'ongoing_aoi_leave' },
      ] },
    ],
    ongoing_aoi_tennis: [
      { say: 'eric', emo: 'warm', text: '{ikitai}。' },
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'bright', text: 'じゃあ、日曜日に！' },
      { go: 'ongoing_aoi_leave' },
    ],
    ongoing_aoi_courts: [
      { do: 'gesture', who: 'eric', kind: 'point', to: 'board_map' },
      { say: 'eric', emo: 'curious', text: 'Can you show me the courts on this?' },
      { do: 'cam', on: 'board_map', zoom: 1.25 },
      { do: 'gesture', who: 'aoi', kind: 'point', to: 'board_map' },
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: '{koko}です。' },
      { do: 'goal', text: 'The tennis courts are beside the gym, north of the dorm street.' },
      { go: 'ongoing_aoi_leave' },
    ],
    ongoing_aoi_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
});
