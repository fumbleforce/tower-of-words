import { anchor, board } from './props.js';

const NOTICES = {
  karaoke: { karaoke_desk: ['Booth check upstairs', 'Monday lunchtime', 'Club: Wednesday, unchanged'] },
  sports: { ball_basket: ['Please bring the balls in', 'if it rains.'] },
  shotengai: { bakery: ['Tomorrow’s orders', 'Write your room number clearly.'] },
  pool: { pool_notice: ['Pool closed for the season', 'Swimming club: gym', 'Saturday evenings'] },
  gym: { gym_board: ['Swimming club', 'Saturday evenings in the gym', 'from 10 October'] },
};
export function mondayNotices(P, name) {
  for (const [id, lines] of Object.entries(NOTICES[name] || {})) {
    const thing = P.things[id];
    if (!thing) throw new Error(`Missing Monday notice target ${name}:${id}`);
    const at = anchor(P, id),
      face = thing.face(),
      spot = thing.spot();
    const sign = board(P, lines, { w: 0.38, h: 0.25 });
    sign.position.copy(at);
    sign.rotation.y = Math.atan2(spot[0] - face[0], spot[1] - face[1]);
  }
}
