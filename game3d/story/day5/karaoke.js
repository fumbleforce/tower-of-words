import { place } from './shared.js';
export default place({ shotengai: ['talk:karaoke_door'], karaoke_booth: ['talk:karaoke_stairs'] }, { on: { 'talk:karaoke_desk': 'd5_desk_note' }, nodes: {
  d5_desk_note: ['> “Booth check upstairs, Monday lunchtime. Wednesday’s club booking is unchanged.”'],
} });
