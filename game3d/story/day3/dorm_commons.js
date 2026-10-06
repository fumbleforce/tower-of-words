import { sofaNodes } from '../room-talk.js';
import { place } from './shared.js';
export default place(
  { east_coast: ['talk:commons_door'] },
  {
    on: { 'talk:kenji': 'room_kenji', 'talk:art_table': 'd3_art', 'talk:drying_rack': 'd3_rack',
      'talk:commons_board': 'd3_commons_board', 'talk:commons_printer': 'd3_commons_printer' },
    nodes: {
      ...sofaNodes,
      d3_tv: [
        { say: 'kenji', emo: 'bright', text: '{mc.name}! Sit, sit. This is replay. I know winner.' },
        { say: 'eric', emo: 'dry', text: 'Don’t tell me, then.' },
        { say: 'kenji', emo: 'sheepish', text: 'Okay. I am quiet.' },
      ],
      d3_art: ['> “Please leave the brushes here. Art club, Tuesday evening.”'],
      d3_rack: [{ say: 'eric', emo: 'warm', text: 'I’d better leave those to dry.' }],
      d3_commons_board: ['> “Wash your mug. A rinse doesn’t get the soup out.”'],
      d3_commons_printer: [{ say: 'eric', emo: 'tired', text: 'I haven’t got anything to print.' }],
    },
  },
);
